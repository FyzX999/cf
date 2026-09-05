import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';

export interface CashAppPayment {
  amount: number;
  note: string;
  date: Date;
  emailId: string;
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
function parseCashAppEmail(html: string): { amount: number; note: string } | null {
  try {
    const $ = cheerio.load(html);
    
    // Find amount - looking for +$XX.XX pattern
    let amount: number | null = null;
    
    // Try multiple selectors for amount
    const amountSelectors = ['td', 'div', 'span'];
    for (const selector of amountSelectors) {
      $(selector).each((_, elem) => {
        const text = $(elem).text().trim();
        const match = text.match(/\+?\$(\d+\.\d+)/);
        if (match && !amount) {
          amount = parseFloat(match[1]);
          return false; // break
        }
      });
      if (amount) break;
    }

    // Find note - looking for "For XXXXX" pattern in profile-description
    let note: string | null = null;
    
    // Look for the specific class used by CashApp
    $('.profile-description, .text-subtle').each((_, elem) => {
      const text = $(elem).text().trim();
      // Match "For [ORDER_ID]" pattern
      const match = text.match(/^For\s+(.+)$/i);
      if (match) {
        note = match[1].trim();
        return false; // break
      }
    });
    
    // Fallback: search all text for "For [alphanumeric]" pattern
    if (!note) {
      const allText = $.text();
      const match = allText.match(/For\s+([A-Z0-9]+)/i);
      if (match) {
        note = match[1].trim();
      }
    }

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

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for emails from cash@square.com with the order ID in subject or body
        imap.search(
          [
            ['FROM', 'cash@square.com'],
            ['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] // Last 30 days
          ],
          (err: Error | null, results: number[]) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              imap.end();
              resolve(null);
              return;
            }

            const fetch = imap.fetch(results, { bodies: '' });

            fetch.on('message', (msg: Imap.ImapMessage) => {
              msg.on('body', (stream: NodeJS.ReadableStream) => {
                simpleParser(stream as any, async (err: Error | undefined, parsed: any) => {
                  if (err || found) return;

                  const html = parsed.html || '';
                  const paymentData = parseCashAppEmail(html);

                  if (
                    paymentData &&
                    paymentData.note === orderId &&
                    Math.abs(paymentData.amount - expectedAmount) < 0.01
                  ) {
                    found = true;
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
