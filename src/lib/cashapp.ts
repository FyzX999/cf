import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';

export interface CashAppPayment {
  amount: number;
  note: string;
  date: Date;
  emailId: string;
  receiptUrl?: string;
}

export interface CashAppConfig {
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  cashappTag: string;
}

/**
 * Parse CashApp payment email HTML to extract amount and note
 */
function parseCashAppEmail(html: string, plainText: string = ''): { amount: number; note: string } | null {
  try {
    const $ = cheerio.load(html);
    
    // Find amount - looking for +$XX.XX or $XX.XX pattern
    let amount: number | null = null;
    
    // Method 1: Try to find amount in specific elements
    const amountPatterns = [
      /\+\$(\d+\.?\d*)/,  // +$10.00
      /\$(\d+\.\d{2})/,   // $10.00
      /(\d+\.\d{2})\s*USD/i, // 10.00 USD
    ];
    
    $('*').each((_, elem) => {
      if (amount) return false;
      const text = $(elem).text().trim();
      
      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
          const parsed = parseFloat(match[1]);
          if (parsed > 0 && parsed < 10000) { // reasonable bounds
            amount = parsed;
            return false;
          }
        }
      }
    });

    // Fallback: search plain text
    if (!amount && plainText) {
      for (const pattern of amountPatterns) {
        const match = plainText.match(pattern);
        if (match) {
          const parsed = parseFloat(match[1]);
          if (parsed > 0 && parsed < 10000) {
            amount = parsed;
            break;
          }
        }
      }
    }

    // Find note - looking for "For XXXXX" pattern
    let note: string | null = null;
    
    // Method 1: Look for specific classes
    $('.profile-description, .text-subtle, [class*="note"], [class*="memo"], [class*="message"]').each((_, elem) => {
      if (note) return false;
      const text = $(elem).text().trim();
      const match = text.match(/For\s+([A-Z0-9]+)/i);
      if (match) {
        note = match[1].trim();
        return false;
      }
    });
    
    // Method 2: Search all HTML for "For [alphanumeric]"
    if (!note) {
      const allText = $.text();
      const patterns = [
        /For\s+([A-Z]{2}\d{6})/i,  // For CF123456 format
        /For:\s*([A-Z]{2}\d{6})/i, // For: CF123456
        /Note:\s*([A-Z]{2}\d{6})/i, // Note: CF123456
        /Memo:\s*([A-Z]{2}\d{6})/i, // Memo: CF123456
      ];
      
      for (const pattern of patterns) {
        const match = allText.match(pattern);
        if (match) {
          note = match[1].trim();
          break;
        }
      }
    }

    // Method 3: Try plain text
    if (!note && plainText) {
      const patterns = [
        /For\s+([A-Z]{2}\d{6})/i,
        /For:\s*([A-Z]{2}\d{6})/i,
        /Note:\s*([A-Z]{2}\d{6})/i,
      ];
      
      for (const pattern of patterns) {
        const match = plainText.match(pattern);
        if (match) {
          note = match[1].trim();
          break;
        }
      }
    }

    console.log(`[CashApp Parser] Amount: ${amount}, Note: ${note}`);

    if (amount !== null && note) {
      return { amount, note };
    }

    return null;
  } catch (error) {
    console.error('Error parsing CashApp email:', error);
    return null;
  }
}

/**
 * Check for CashApp payment by order ID (note field)
 */
export async function checkCashAppPayment(
  orderId: string,
  expectedAmount: number,
  config: CashAppConfig
): Promise<CashAppPayment | null> {
  console.log(`[CashApp] Checking payment for order ${orderId}, amount $${expectedAmount}`);
  
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.email,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    let found = false;
    let emailCount = 0;

    imap.once('ready', () => {
      console.log('[CashApp] IMAP connection ready');
      imap.openBox('INBOX', true, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for emails from cash@square.com (recent first - last 24 hours)
        imap.search(
          [
            ['FROM', 'cash@square.com'],
            ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000)] // Last 24 hours
          ],
          (err: Error | null, results: number[]) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log('[CashApp] No emails found from cash@square.com in last 24 hours');
              imap.end();
              resolve(null);
              return;
            }

            console.log(`[CashApp] Found ${results.length} emails from cash@square.com`);
            const fetch = imap.fetch(results, { bodies: '' });

            fetch.on('message', (msg: Imap.ImapMessage) => {
              msg.on('body', (stream: NodeJS.ReadableStream) => {
                simpleParser(stream as any, async (err: Error | undefined, parsed: any) => {
                  if (err || found) return;

                  emailCount++;
                  const html = parsed.html || '';
                  const plainText = parsed.text || '';
                  const paymentData = parseCashAppEmail(html, plainText);

                  console.log(`[CashApp] Email ${emailCount}: Looking for order ${orderId}, $${expectedAmount}`);
                  console.log(`[CashApp] Email ${emailCount}: Found note=${paymentData?.note}, amount=$${paymentData?.amount}`);

                  if (
                    paymentData &&
                    paymentData.note.toUpperCase() === orderId.toUpperCase() &&
                    Math.abs(paymentData.amount - expectedAmount) < 0.01
                  ) {
                    found = true;
                    console.log(`[CashApp] ✅ Payment matched for order ${orderId}!`);
                    resolve({
                      amount: paymentData.amount,
                      note: paymentData.note,
                      date: parsed.date || new Date(),
                      emailId: parsed.messageId || ''
                    });
                    imap.end();
                  }
                });
              });
            });

            fetch.once('error', (err: Error) => {
              reject(err);
            });

            fetch.once('end', () => {
              if (!found) {
                console.log(`[CashApp] Checked ${emailCount} emails, no match found`);
                imap.end();
                resolve(null);
              }
            });
          }
        );
      });
    });

    imap.once('error', (err: Error) => {
      reject(err);
    });

    imap.once('end', () => {
      if (!found) {
        resolve(null);
      }
    });

    imap.connect();
  });
}

/**
 * Get CashApp configuration from environment variables
 */
export function getCashAppConfig(): CashAppConfig | null {
  const email = process.env.CASHAPP_EMAIL;
  const password = process.env.CASHAPP_EMAIL_PASSWORD;
  const imapHost = process.env.CASHAPP_IMAP_HOST || 'imap.gmail.com';
  const imapPort = parseInt(process.env.CASHAPP_IMAP_PORT || '993');
  const cashappTag = process.env.CASHAPP_TAG;

  if (!email || !password || !cashappTag) {
    return null;
  }

  return {
    email,
    password,
    imapHost,
    imapPort,
    cashappTag
  };
}

/**
 * Track used transaction IDs to prevent duplicates (in-memory for now)
 * In production, this should be stored in a database
 */
const usedTransactions = new Map<string, { orderId: string; timestamp: number; amount: number }>();

/**
 * Verify CashApp transaction number (manual verification method)
 * Since web receipts are auth-protected, we accept the transaction number
 * and verify it hasn't been used before
 */
export async function verifyCashAppTransaction(
  transactionId: string,
  orderId: string,
  expectedAmount: number
): Promise<CashAppPayment | null> {
  try {
    // Normalize transaction ID - remove # and whitespace
    let normalizedId = transactionId.trim().toUpperCase();
    if (normalizedId.startsWith('#')) {
      normalizedId = normalizedId.substring(1);
    }

    // Extract from URL if full URL provided
    const urlMatch = normalizedId.match(/CASH\.APP\/PAYMENTS\/([A-Z0-9_-]+)/i);
    if (urlMatch) {
      normalizedId = urlMatch[1].toUpperCase();
    }

    console.log(`[CashApp Transaction] Verifying: ${normalizedId} for order ${orderId}, amount $${expectedAmount}`);

    // Validate format (CashApp transaction IDs are typically like D-RKOXR3K76)
    if (!normalizedId || normalizedId.length < 5) {
      throw new Error('Invalid transaction ID format. Please provide the transaction number from your CashApp (e.g., #D-RKOXR3K76)');
    }

    // Check if this transaction has been used before
    const existing = usedTransactions.get(normalizedId);
    if (existing) {
      console.log(`[CashApp Transaction] ❌ Transaction ${normalizedId} already used for order ${existing.orderId}`);
      throw new Error('This transaction has already been used for another order');
    }

    // Mark transaction as used
    usedTransactions.set(normalizedId, {
      orderId,
      timestamp: Date.now(),
      amount: expectedAmount
    });

    console.log(`[CashApp Transaction] ✅ Transaction ${normalizedId} verified and marked as used`);

    // Return payment confirmation
    return {
      amount: expectedAmount,
      note: orderId,
      date: new Date(),
      emailId: normalizedId,
      receiptUrl: `https://cash.app/payments/${normalizedId}`
    };
  } catch (error) {
    console.error('[CashApp Transaction] Error:', error);
    throw error;
  }
}

/**
 * Track used receipt URLs to prevent duplicates
 */
const usedReceipts = new Map<string, { orderId: string; timestamp: number }>();

/**
 * Check if a transaction ID has already been used
 */
export function isTransactionUsed(transactionId: string): boolean {
  const normalizedId = transactionId.trim().toUpperCase().replace(/^#/, '');
  const used = usedReceipts.get(normalizedId);
  
  if (used) {
    // Clean up old entries (older than 30 days)
    if (Date.now() - used.timestamp > 30 * 24 * 60 * 60 * 1000) {
      usedReceipts.delete(normalizedId);
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Mark a transaction ID as used
 */
export function markTransactionUsed(transactionId: string, orderId: string): void {
  const normalizedId = transactionId.trim().toUpperCase().replace(/^#/, '');
  usedReceipts.set(normalizedId, { orderId, timestamp: Date.now() });
  console.log(`[CashApp] Marked transaction ${normalizedId} as used for order ${orderId}`);
}
