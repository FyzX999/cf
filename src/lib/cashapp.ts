import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';

export interface CashAppPayment {
  amount: number;
  note: string;
  recipient: string;
  sender?: string;
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
 * Parse CashApp payment email HTML to extract amount, note, and recipient
 * STRICT VALIDATION: Only accepts emails with "You were sent" phrase and CF-formatted notes
 */
function parseCashAppEmail(html: string, plainText: string = ''): { amount: number; note: string; recipient: string; sender?: string } | null {
  try {
    const $ = cheerio.load(html);
    const allText = $.text() + ' ' + plainText;
    
    // STRICT RULE 1: Must contain "You were sent" - reject "You paid"
    if (!allText.includes('You were sent')) {
      console.log('[CashApp Parser] ❌ Rejected: Missing "You were sent" phrase (might be "You paid")');
      return null;
    }
    
    console.log('[CashApp Parser] ✅ Validated: Contains "You were sent" phrase');
    
    // STRICT AMOUNT EXTRACTION: Must match "You were sent $XX.XX" in plain text
    let amount: number | null = null;
    
    // Primary pattern: "You were sent $XX.XX" or "You were sent $XX"
    const strictAmountPattern = /You were sent \$(\d+(?:\.\d{1,2})?)/i;
    
    // Try plain text first (most reliable)
    let match = plainText.match(strictAmountPattern);
    if (match) {
      amount = parseFloat(match[1]);
      console.log(`[CashApp Parser] Found amount in plain text: $${amount}`);
    }
    
    // Fallback: try HTML text
    if (!amount) {
      match = allText.match(strictAmountPattern);
      if (match) {
        amount = parseFloat(match[1]);
        console.log(`[CashApp Parser] Found amount in HTML: $${amount}`);
      }
    }
    
    // Validate amount is reasonable
    if (!amount || amount <= 0 || amount >= 10000) {
      console.log(`[CashApp Parser] ❌ Rejected: Invalid or missing amount (got: ${amount})`);
      return null;
    }

    // Find recipient cashtag - looking for $username pattern
    let recipient: string | null = null;
    
    const recipientPatterns = [
      /(?:to|paid)\s+(\$[a-zA-Z0-9_]+)/i,  // "to $followermarket"
      /(\$[a-zA-Z0-9_]+)\s+(?:received|got)/i, // "$followermarket received"
    ];
    
    for (const pattern of recipientPatterns) {
      const match = allText.match(pattern);
      if (match) {
        recipient = match[1].toLowerCase(); // normalize to lowercase
        break;
      }
    }

    // Find sender cashtag - looking for "from $username" pattern
    let sender: string | null = null;
    
    const senderPatterns = [
      /(?:from|by)\s+(\$[a-zA-Z0-9_]+)/i,  // "from $username"
      /(\$[a-zA-Z0-9_]+)\s+(?:sent|paid)/i, // "$username sent"
    ];
    
    for (const pattern of senderPatterns) {
      const match = allText.match(pattern);
      if (match) {
        sender = match[1].toLowerCase();
        break;
      }
    }

    // STRICT RULE 2: Find note - MUST match CF followed by numbers (e.g., CF200265)
    let note: string | null = null;
    
    // Strict CF pattern: CF followed by digits
    const strictCFPatterns = [
      /\bCF(\d{6,})\b/i,       // CF123456 (6+ digits, word boundary)
      /For[:\s]+CF(\d{6,})\b/i, // For CF123456 or For: CF123456
      /Note[:\s]+CF(\d{6,})\b/i, // Note CF123456 or Note: CF123456
      /Memo[:\s]+CF(\d{6,})\b/i, // Memo CF123456 or Memo: CF123456
    ];
    
    // Try plain text first (most reliable)
    for (const pattern of strictCFPatterns) {
      const match = plainText.match(pattern);
      if (match) {
        note = 'CF' + match[1]; // Normalize to uppercase CF
        console.log(`[CashApp Parser] Found CF note in plain text: ${note}`);
        break;
      }
    }
    
    // Fallback: try HTML text
    if (!note) {
      for (const pattern of strictCFPatterns) {
        const match = allText.match(pattern);
        if (match) {
          note = 'CF' + match[1]; // Normalize to uppercase CF
          console.log(`[CashApp Parser] Found CF note in HTML: ${note}`);
          break;
        }
      }
    }
    
    // Also try specific HTML elements
    if (!note) {
      $('.profile-description, .text-subtle, [class*="note"], [class*="memo"], [class*="message"]').each((_, elem) => {
        if (note) return false;
        const text = $(elem).text().trim();
        const match = text.match(/\bCF(\d{6,})\b/i); // Strict CF + numbers pattern
        if (match) {
          note = 'CF' + match[1]; // Normalize to uppercase CF
          console.log(`[CashApp Parser] Found CF note in HTML element: ${note}`);
          return false;
        }
      });
    }

    // STRICT: Reject if no CF-formatted note found
    if (!note) {
      console.log('[CashApp Parser] ❌ Rejected: No CF-formatted note found (e.g., CF123456)');
      return null;
    }

    console.log(`[CashApp Parser] ✅ Parsed successfully - Amount: $${amount}, Note: ${note}, Recipient: ${recipient}, Sender: ${sender}`);

    if (amount !== null && note && recipient) {
      return { amount, note, recipient, sender: sender || undefined };
    }

    return null;
  } catch (error) {
    console.error('[CashApp Parser] Error parsing email:', error);
    return null;
  }
}

/**
 * Check for CashApp payment by order ID (note field)
 * STRICT VALIDATION: Only searches emails with "Payment received" or "sent you" in subject
 */
export async function checkCashAppPayment(
  orderId: string,
  expectedAmount: number,
  config: CashAppConfig
): Promise<CashAppPayment | null> {
  console.log(`[CashApp] Checking payment for order ${orderId}, amount $${expectedAmount}`);
  console.log(`[CashApp] Expected recipient: ${config.cashappTag}`);
  
  return new Promise((resolve, reject) => {
    // Add 60 second timeout
    const timeout = setTimeout(() => {
      console.log('[CashApp] ⏱️ Timeout after 60 seconds');
      imap.end();
      resolve(null);
    }, 60000);

    const imap = new Imap({
      user: config.email,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000, // 30 second connection timeout
      authTimeout: 30000  // 30 second auth timeout
    });

    let found = false;
    let emailCount = 0;
    const expectedRecipient = config.cashappTag.toLowerCase();

    imap.once('ready', () => {
      console.log('[CashApp] IMAP connection ready');
      imap.openBox('INBOX', true, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        // STRICT RULE: Search for emails with specific subjects only - ignore login codes
        // Using OR condition: (SUBJECT "Payment received" OR SUBJECT "sent you")
        imap.search(
          [
            ['FROM', 'cash@square.com'],
            ['OR',
              ['SUBJECT', 'Payment received'],
              ['SUBJECT', 'sent you']
            ],
            ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] // Last 7 days
          ],
          (err: Error | null, results: number[]) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log('[CashApp] No payment emails found (filtered for "Payment received" or "sent you" subjects)');
              imap.end();
              resolve(null);
              return;
            }

            console.log(`[CashApp] Found ${results.length} payment emails from cash@square.com (filtered by subject)`);
            const fetch = imap.fetch(results, { bodies: '' });

            fetch.on('message', (msg: Imap.ImapMessage) => {
              msg.on('body', (stream: NodeJS.ReadableStream) => {
                simpleParser(stream as any, async (err: Error | undefined, parsed: any) => {
                  if (err || found) return;

                  emailCount++;
                  const html = parsed.html || '';
                  const plainText = parsed.text || '';
                  
                  console.log(`[CashApp] Email ${emailCount} subject: ${parsed.subject}`);
                  
                  // Parse with strict validation (checks for "You were sent $X.XX" and CF format)
                  const paymentData = parseCashAppEmail(html, plainText);

                  if (!paymentData) {
                    console.log(`[CashApp] Email ${emailCount}: Skipped (failed strict validation)`);
                    return;
                  }

                  console.log(`[CashApp] Email ${emailCount}: Looking for order ${orderId}, $${expectedAmount}, to ${expectedRecipient}`);
                  console.log(`[CashApp] Email ${emailCount}: Found note=${paymentData.note}, amount=$${paymentData.amount}, recipient=${paymentData.recipient}`);

                  // Check if recipient matches
                  if (paymentData.recipient.toLowerCase() !== expectedRecipient) {
                    console.log(`[CashApp] ❌ Recipient mismatch: expected ${expectedRecipient}, got ${paymentData.recipient}`);
                    return;
                  }

                  // Check if note and amount match
                  if (
                    paymentData.note.toUpperCase() === orderId.toUpperCase() &&
                    Math.abs(paymentData.amount - expectedAmount) < 0.01
                  ) {
                    found = true;
                    clearTimeout(timeout);
                    console.log(`[CashApp] ✅ Payment matched for order ${orderId}!`);
                    resolve({
                      amount: paymentData.amount,
                      note: paymentData.note,
                      recipient: paymentData.recipient,
                      sender: paymentData.sender,
                      date: parsed.date || new Date(),
                      emailId: parsed.messageId || ''
                    });
                    imap.end();
                  } else {
                    console.log(`[CashApp] ❌ Note or amount mismatch`);
                  }
                });
              });
            });

            fetch.once('error', (err: Error) => {
              clearTimeout(timeout);
              reject(err);
            });

            fetch.once('end', () => {
              if (!found) {
                clearTimeout(timeout);
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
      clearTimeout(timeout);
      console.error('[CashApp] IMAP error:', err);
      reject(err);
    });

    imap.once('end', () => {
      clearTimeout(timeout);
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