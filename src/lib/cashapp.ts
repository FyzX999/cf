import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';
import { CASHAPP_PATTERNS, IMAP_CONFIG, PAYMENT_VALIDATION } from './payment-constants';
import { PaymentError, PaymentErrorCode } from './payment-errors';
import { retryWithBackoff } from './payment-retry';
import { matchPayment, logPaymentMatchDetails } from './payment-matching';
import { queueUnmatchedPayment } from './payment-review-queue';

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
 * EXPORTED: Use this for all CashApp email parsing to ensure consistency
 */
export async function parseCashAppEmail(html: string, plainText: string = '', emailSubject?: string): Promise<{ amount: number; note: string; recipient: string; sender?: string } | null> {
  try {
    const $ = cheerio.load(html);
    
    // HTML SANITIZATION: Strip all HTML tags and normalize whitespace
    const sanitizedHtml = html
      .replace(/<[^>]*>?/gm, ' ')           // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')              // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')                 // Normalize multiple spaces to single space
      .trim();
    
    const allText = sanitizedHtml + ' ' + $.text() + ' ' + plainText;
    
    console.log(`[CashApp Parser] Processing email (sanitized text length: ${sanitizedHtml.length})`);
    
    // STRICT RULE 1: Must contain "You were sent" - reject "You paid"
    if (!allText.includes(CASHAPP_PATTERNS.RECEIVED_PHRASE)) {
      console.log('[CashApp Parser] ❌ Rejected: Missing "You were sent" phrase (might be "You paid")');
      // Log raw HTML for emails that look like payments but aren't parsing
      if (emailSubject && (emailSubject.includes('Payment') || emailSubject.includes('sent'))) {
        console.log('[CashApp Parser] 📧 Raw HTML for debugging (looks like payment but failed to parse):');
        console.log(sanitizedHtml.substring(0, 2000)); // Log sanitized version
      }
      return null;
    }
    
    console.log('[CashApp Parser] ✅ Validated: Contains "You were sent" phrase');
    
    // Initialize variables that will be populated
    let amount: number | null = null;
    let note: string | null = null;
    let recipient: string | null = null;
    
    // STRICT AMOUNT EXTRACTION: Must match "You were sent $XX.XX" in plain text
    // Primary pattern: "You were sent $XX.XX" or "You were sent $XX"
    const strictAmountPattern = CASHAPP_PATTERNS.AMOUNT_REGEX;
    
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
      // Queue for manual review instead of discarding
      await queueUnmatchedPayment({
        subject: emailSubject || 'Unknown',
        from: 'cash@square.com',
        date: new Date(),
        htmlSnippet: sanitizedHtml.substring(0, 2000),
        extractedData: { amount: amount || undefined, note: note || undefined, recipient: recipient || undefined },
        reason: `Invalid or missing amount: ${amount}`,
      }).catch(err => console.error('[CashApp Parser] Failed to queue unmatched payment:', err));
      
      return null;
    }

    // Find recipient - use the configured cashtag from environment
    recipient = process.env.CASHAPP_TAG?.toLowerCase() || 'cashapp';

    // STRICT RULE 2: Find note - MUST match CF followed by exactly 6 digits
    // Try each CF pattern on the sanitized text (most reliable after HTML stripping)
    const strictCFPatterns = CASHAPP_PATTERNS.CF_PATTERNS;
    
    console.log(`[CashApp Parser] Searching for CF note in sanitized text...`);
    
    for (const pattern of strictCFPatterns) {
      const match = sanitizedHtml.match(pattern);
      if (match) {
        // Pattern returns capture group with CF prefix already included
        note = match[1] || ('CF' + match[1]); // match[1] should be like "CF689836"
        if (!note.startsWith('CF')) note = 'CF' + note.slice(2); // Normalize if needed
        console.log(`[CashApp Parser] ✅ Found CF note in sanitized text: ${note} (pattern: ${pattern})`);
        break;
      }
    }
    
    // Fallback: Try plain text
    if (!note) {
      console.log(`[CashApp Parser] CF note not found in sanitized HTML, trying plain text...`);
      for (const pattern of strictCFPatterns) {
        const match = plainText.match(pattern);
        if (match) {
          note = match[1] || ('CF' + match[1]);
          if (!note.startsWith('CF')) note = 'CF' + note.slice(2);
          console.log(`[CashApp Parser] ✅ Found CF note in plain text: ${note}`);
          break;
        }
      }
    }

    // STRICT: Reject if no CF-formatted note found
    if (!note) {
      console.log('[CashApp Parser] ❌ Rejected: No CF-formatted note found (e.g., CF689836)');
      // Queue for manual review instead of discarding
      await queueUnmatchedPayment({
        subject: emailSubject || 'Unknown',
        from: 'cash@square.com',
        date: new Date(),
        htmlSnippet: sanitizedHtml.substring(0, 2000),
        extractedData: { amount: amount || undefined, recipient: recipient || undefined },
        reason: 'No CF-formatted note found (order ID extraction failed)',
      }).catch(err => console.error('[CashApp Parser] Failed to queue unmatched payment:', err));
      
      return null;
    }

    console.log(`[CashApp Parser] ✅ Parsed successfully - Amount: $${amount}, Note: ${note}, Recipient: ${recipient}`);

    if (amount !== null && note && recipient) {
      return { amount, note, recipient };
    }

    return null;
  } catch (error) {
    console.error('[CashApp Parser] Error parsing email:', error);
    return null;
  }
}

/**
 * Process ALL UNSEEN payment emails and trigger webhooks
 * Marks emails as SEEN only after successful webhook firing
 */
export async function processUnseenCashAppPayments(
  config: CashAppConfig,
  webhookCallback: (payment: CashAppPayment) => Promise<boolean>
): Promise<{ processed: number; succeeded: number; failed: number }> {
  console.log('[CashApp Batch] Starting to process UNSEEN payment emails');
  
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.email,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 30000
    });

    const stats = { processed: 0, succeeded: 0, failed: 0 };
    const expectedRecipient = config.cashappTag.toLowerCase();

    imap.once('ready', () => {
      console.log('[CashApp Batch] IMAP connection ready');
      
      // Open inbox in READ-WRITE mode (false = writable)
      imap.openBox('INBOX', false, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for UNSEEN payment emails only
        imap.search(
          [
            'UNSEEN',
            ['FROM', 'cash@square.com'],
            ['OR',
              ['SUBJECT', 'Payment received'],
              ['SUBJECT', 'sent you']
            ]
          ],
          async (err: Error | null, results: number[]) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log('[CashApp Batch] No UNSEEN payment emails found');
              imap.end();
              resolve(stats);
              return;
            }

            console.log(`[CashApp Batch] Found ${results.length} UNSEEN payment emails`);

            // Process emails one by one sequentially
            try {
              for (let i = 0; i < results.length; i++) {
                const emailUid = results[i];
                console.log(`[CashApp Batch] Processing email ${i + 1}/${results.length} (UID: ${emailUid})`);

                try {
                  // Fetch single email
                  const emailData = await fetchSingleEmail(imap, emailUid);
                  
                  if (!emailData) {
                    console.log(`[CashApp Batch] Email ${i + 1}: Could not fetch email data`);
                    stats.processed++;
                    continue;
                  }

                  console.log(`[CashApp Batch] Email ${i + 1} subject: ${emailData.subject}`);

                  // Parse with strict validation
                  const paymentData = await parseCashAppEmail(emailData.html, emailData.plainText);

                  if (!paymentData) {
                    console.log(`[CashApp Batch] Email ${i + 1}: Skipped (failed strict validation)`);
                    // Mark as SEEN even if validation failed (not a valid payment)
                    await markEmailAsSeen(imap, emailUid);
                    stats.processed++;
                    continue;
                  }

                  // Check recipient matches
                  if (paymentData.recipient.toLowerCase() !== expectedRecipient) {
                    console.log(`[CashApp Batch] Email ${i + 1}: Recipient mismatch (expected ${expectedRecipient}, got ${paymentData.recipient})`);
                    // Mark as SEEN (payment to different recipient)
                    await markEmailAsSeen(imap, emailUid);
                    stats.processed++;
                    continue;
                  }

                  // Valid payment found - fire webhook
                  console.log(`[CashApp Batch] Email ${i + 1}: Valid payment found - Note: ${paymentData.note}, Amount: $${paymentData.amount}`);
                  
                  const payment: CashAppPayment = {
                    amount: paymentData.amount,
                    note: paymentData.note,
                    recipient: paymentData.recipient,
                    sender: paymentData.sender,
                    date: emailData.date || new Date(),
                    emailId: emailData.messageId || ''
                  };

                  // Fire webhook callback
                  let webhookSuccess = false;
                  try {
                    webhookSuccess = await webhookCallback(payment);
                  } catch (webhookError) {
                    console.error(`[CashApp Batch] Email ${i + 1}: Webhook failed:`, webhookError);
                    webhookSuccess = false;
                  }

                  if (webhookSuccess) {
                    console.log(`[CashApp Batch] Email ${i + 1}: ✅ Webhook succeeded - marking as SEEN`);
                    await markEmailAsSeen(imap, emailUid);
                    stats.succeeded++;
                  } else {
                    console.log(`[CashApp Batch] Email ${i + 1}: ❌ Webhook failed - leaving as UNSEEN for retry`);
                    stats.failed++;
                  }

                  stats.processed++;

                } catch (emailError) {
                  console.error(`[CashApp Batch] Email ${i + 1}: Error processing:`, emailError);
                  stats.processed++;
                  stats.failed++;
                  // Don't mark as SEEN on processing errors - will retry next time
                }
              }

              // All emails processed
              console.log(`[CashApp Batch] Processing complete - Processed: ${stats.processed}, Succeeded: ${stats.succeeded}, Failed: ${stats.failed}`);
              imap.end();
              resolve(stats);

            } catch (batchError) {
              console.error('[CashApp Batch] Batch processing error:', batchError);
              imap.end();
              reject(batchError);
            }
          }
        );
      });
    });

    imap.once('error', (err: Error) => {
      console.error('[CashApp Batch] IMAP error:', err);
      reject(err);
    });

    imap.once('end', () => {
      console.log('[CashApp Batch] IMAP connection ended');
    });

    imap.connect();
  });
}

/**
 * Fetch a single email by UID
 */
function fetchSingleEmail(imap: Imap, uid: number): Promise<{ subject: string; html: string; plainText: string; date: Date; messageId: string } | null> {
  return new Promise((resolve) => {
    const fetch = imap.fetch([uid], { bodies: '' });
    let emailData: any = null;

    fetch.on('message', (msg: Imap.ImapMessage) => {
      msg.on('body', (stream: NodeJS.ReadableStream) => {
        simpleParser(stream as any, (err: Error | undefined, parsed: any) => {
          if (err) {
            console.error('[CashApp Batch] Email parse error:', err);
            resolve(null);
            return;
          }

          emailData = {
            subject: parsed.subject || '',
            html: parsed.html || '',
            plainText: parsed.text || '',
            date: parsed.date || new Date(),
            messageId: parsed.messageId || ''
          };
        });
      });
    });

    fetch.once('error', (err: Error) => {
      console.error('[CashApp Batch] Fetch error:', err);
      resolve(null);
    });

    fetch.once('end', () => {
      resolve(emailData);
    });
  });
}

/**
 * Mark an email as SEEN by UID
 */
function markEmailAsSeen(imap: Imap, uid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    imap.addFlags(uid, ['\\Seen'], (err: Error | null) => {
      if (err) {
        console.error(`[CashApp Batch] Failed to mark UID ${uid} as SEEN:`, err);
        reject(err);
      } else {
        console.log(`[CashApp Batch] Marked UID ${uid} as SEEN`);
        resolve();
      }
    });
  });
}

/**
 * Check for CashApp payment by order ID (note field) - LEGACY METHOD
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
      reject(new PaymentError(
        PaymentErrorCode.TIMEOUT,
        'Email check timeout after 60 seconds',
        408
      ));
    }, IMAP_CONFIG.SEARCH_TIMEOUT_MS);

    let imap: Imap;
    
    try {
      imap = new Imap({
        user: config.email,
        password: config.password,
        host: config.imapHost,
        port: config.imapPort,
        tls: true,
        tlsOptions: IMAP_CONFIG.TLS_OPTIONS,
        connTimeout: IMAP_CONFIG.CONN_TIMEOUT_MS,
        authTimeout: IMAP_CONFIG.AUTH_TIMEOUT_MS,
      });
      console.log('[CashApp] IMAP connection initializing...');
    } catch (initError) {
      console.error('[CashApp] Failed to initialize IMAP:', initError);
      clearTimeout(timeout);
      reject(initError);
      return;
    }

    let found = false;
    let emailCount = 0;
    const expectedRecipient = config.cashappTag.toLowerCase();

    imap.once('ready', () => {
      console.log('[CashApp] ✅ IMAP connection ready');
      imap.openBox('INBOX', true, (err: Error | null) => {
        if (err) {
          console.error('[CashApp] Failed to open INBOX:', err.message);
          clearTimeout(timeout);
          reject(err);
          return;
        }

        console.log('[CashApp] INBOX opened in read-only mode');
        // STRICT RULE: Search for emails with specific subjects only - ignore login codes
        // Using OR condition: (SUBJECT "Payment received" OR SUBJECT "sent you")
        imap.search(
          [
            ['FROM', 'cash@square.com'],
            ['OR',
              ['SUBJECT', 'Payment received'],
              ['SUBJECT', 'sent you']
            ],
            ['SINCE', new Date(Date.now() - IMAP_CONFIG.CHECK_SEARCH_DAYS * 24 * 60 * 60 * 1000)]
          ],
          (err: Error | null, results: number[]) => {
            if (err) {
              console.error('[CashApp] Search failed:', err.message);
              clearTimeout(timeout);
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log('[CashApp] No payment emails found (filtered for "Payment received" or "sent you" subjects)');
              imap.end();
              clearTimeout(timeout);
              resolve(null);
              return;
            }

            console.log(`[CashApp] Found ${results.length} payment emails from cash@square.com (filtered by subject)`);
            const fetch = imap.fetch(results, { bodies: '' });

            fetch.on('message', (msg: Imap.ImapMessage) => {
              msg.on('body', (stream: NodeJS.ReadableStream) => {
                simpleParser(stream as any, async (err: Error | undefined, parsed: any) => {
                  if (err || found) {
                    if (err) console.error('[CashApp] Email parse error:', err.message);
                    return;
                  }

                  emailCount++;
                  const html = parsed.html || '';
                  const plainText = parsed.text || '';
                  const subject = parsed.subject || '';
                  
                  console.log(`[CashApp] Email ${emailCount} subject: ${subject}`);
                  
                  // Parse with strict validation (checks for "You were sent $X.XX" and CF format)
                  const paymentData = await parseCashAppEmail(html, plainText, subject);

                  if (!paymentData) {
                    console.log(`[CashApp] Email ${emailCount}: Skipped (failed strict validation)`);
                    return;
                  }

                  console.log(`[CashApp] Email ${emailCount}: Looking for order ${orderId}, amount $${expectedAmount}, to ${expectedRecipient}`);
                  console.log(`[CashApp] Email ${emailCount}: Found note=${paymentData.note}, amount=$${paymentData.amount}, recipient=${paymentData.recipient}`);

                  // Check if recipient matches
                  if (paymentData.recipient.toLowerCase() !== expectedRecipient) {
                    console.log(`[CashApp] ❌ Recipient mismatch: expected ${expectedRecipient}, got ${paymentData.recipient}`);
                    return;
                  }

                  // Use fuzzy matching for order ID and amount matching
                  const matchResult = matchPayment({
                    extractedOrderId: paymentData.note,
                    expectedOrderId: orderId,
                    extractedAmount: paymentData.amount,
                    expectedAmount,
                    extractedRecipient: paymentData.recipient,
                    expectedRecipient,
                    orderIdMaxDistance: 2, // Allow 2 character differences (typo tolerance)
                    amountToleranceCents: 1, // Allow 1 cent difference (rounding)
                  });

                  // Log detailed matching info
                  logPaymentMatchDetails(matchResult, `[CashApp] Email ${emailCount}`);

                  if (!matchResult.matched) {
                    console.log(`[CashApp] ❌ Payment details don't match`);
                    return;
                  }

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
      
      // Log specific error codes for diagnosis
      const errorMessage = err.message || String(err);
      console.error('[CashApp] IMAP error:', errorMessage);
      
      // Detect specific error types
      if (errorMessage.includes('AUTHENTICATIONFAILED') || errorMessage.includes('authentication failed')) {
        console.error('[CashApp] 🔴 AUTHENTICATION FAILED - Check CASHAPP_EMAIL and CASHAPP_EMAIL_PASSWORD');
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
        console.error('[CashApp] 🔴 DNS RESOLUTION FAILED - Check CASHAPP_IMAP_HOST');
      } else if (errorMessage.includes('ECONNREFUSED')) {
        console.error('[CashApp] 🔴 CONNECTION REFUSED - Check CASHAPP_IMAP_PORT');
      } else if (errorMessage.includes('TIMEOUT') || errorMessage.includes('timeout')) {
        console.error('[CashApp] 🔴 CONNECTION TIMEOUT - Server may be unresponsive');
      } else if (errorMessage.includes('SELF_SIGNED_CERT') || errorMessage.includes('certificate')) {
        console.error('[CashApp] 🔴 CERTIFICATE ERROR - TLS configuration issue');
      }
      
      reject(new PaymentError(
        PaymentErrorCode.EMAIL_CONNECTION_ERROR,
        `Email connection failed: ${errorMessage}`,
        503
      ));
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