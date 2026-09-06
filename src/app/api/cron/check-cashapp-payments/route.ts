import { NextRequest, NextResponse } from "next/server";
import { getCashAppConfig } from "@/lib/cashapp";
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';
import { readStore } from "@/lib/admin-store";
import { settlePayment } from "@/lib/payments";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface EmailPayment {
  amount: number;
  note: string;
  date: Date;
  emailId: string;
}

function parseCashAppEmail(html: string, plainText: string = ''): EmailPayment | null {
  try {
    const $ = cheerio.load(html);
    let amount: number | null = null;
    const amountPatterns = [/\+\$(\d+\.?\d*)/, /\$(\d+\.\d{2})/, /(\d+\.\d{2})\s*USD/i];
    
    $('*').each((_, elem) => {
      if (amount) return false;
      const text = $(elem).text().trim();
      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
          const parsed = parseFloat(match[1]);
          if (parsed > 0 && parsed < 10000) {
            amount = parsed;
            return false;
          }
        }
      }
    });

    let note: string | null = null;
    $('.profile-description, .text-subtle, [class*="note"], [class*="memo"]').each((_, elem) => {
      if (note) return false;
      const text = $(elem).text().trim();
      const match = text.match(/For\s+([A-Z]{2}\d{6})/i);
      if (match) {
        note = match[1].trim().toUpperCase();
        return false;
      }
    });

    if (!note) {
      const allText = $.text() + ' ' + plainText;
      const patterns = [/For\s+([A-Z]{2}\d{6})/i, /For:\s*([A-Z]{2}\d{6})/i, /Note:\s*([A-Z]{2}\d{6})/i];
      for (const pattern of patterns) {
        const match = allText.match(pattern);
        if (match) {
          note = match[1].trim().toUpperCase();
          break;
        }
      }
    }

    if (amount !== null && note) {
      return { amount, note, date: new Date(), emailId: '' };
    }
    return null;
  } catch (error) {
    console.error('[Cron] Error parsing email:', error);
    return null;
  }
}

async function fetchCashAppEmails(config: any): Promise<EmailPayment[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('[Cron] IMAP timeout after 50 seconds');
      imap.end();
      resolve([]);
    }, 50000);

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

    const emails: EmailPayment[] = [];

    imap.once('ready', () => {
      console.log('[Cron] IMAP connected');
      imap.openBox('INBOX', true, (err: Error | null) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
          return;
        }

        imap.search(
          [
            ['FROM', 'cash@square.com'],
            ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000)]
          ],
          (err: Error | null, results: number[]) => {
            if (err) {
              clearTimeout(timeout);
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log('[Cron] No CashApp emails found');
              clearTimeout(timeout);
              imap.end();
              resolve([]);
              return;
            }

            console.log(`[Cron] Found ${results.length} CashApp emails`);
            const fetch = imap.fetch(results, { bodies: '' });

            fetch.on('message', (msg: Imap.ImapMessage) => {
              msg.on('body', (stream: NodeJS.ReadableStream) => {
                simpleParser(stream as any, async (err: Error | undefined, parsed: any) => {
                  if (err) return;

                  const html = parsed.html || '';
                  const plainText = parsed.text || '';
                  const payment = parseCashAppEmail(html, plainText);

                  if (payment) {
                    payment.emailId = parsed.messageId || '';
                    payment.date = parsed.date || new Date();
                    emails.push(payment);
                    console.log(`[Cron] Parsed: ${payment.note} - $${payment.amount}`);
                  }
                });
              });
            });

            fetch.once('error', (err: Error) => {
              clearTimeout(timeout);
              reject(err);
            });

            fetch.once('end', () => {
              clearTimeout(timeout);
              setTimeout(() => {
                imap.end();
                resolve(emails);
              }, 1000);
            });
          }
        );
      });
    });

    imap.once('error', (err: Error) => {
      clearTimeout(timeout);
      console.error('[Cron] IMAP error:', err);
      reject(err);
    });

    imap.connect();
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] Starting CashApp payment check...');

  try {
    const config = getCashAppConfig();
    if (!config) {
      console.error('[Cron] CashApp not configured');
      return NextResponse.json({ error: 'CashApp not configured' }, { status: 503 });
    }

    const emails = await fetchCashAppEmails(config);
    console.log(`[Cron] Fetched ${emails.length} emails with payment data`);

    const store = await readStore();
    const pendingPayments = store.payments?.filter(p => p.status === 'pending' && p.provider === 'cashapp') || [];
    console.log(`[Cron] Found ${pendingPayments.length} pending CashApp payments`);

    let completedCount = 0;
    const matched: string[] = [];

    for (const email of emails) {
      for (const payment of pendingPayments) {
        if (
          payment.gatewayId.toUpperCase() === email.note.toUpperCase() &&
          Math.abs(payment.amount - email.amount) < 0.01
        ) {
          console.log(`[Cron] Match found: ${email.note} - $${email.amount}`);
          
          try {
            await settlePayment(payment);
            completedCount++;
            matched.push(email.note);
            console.log(`[Cron] Payment ${email.note} completed`);
          } catch (error) {
            console.error(`[Cron] Error settling payment ${email.note}:`, error);
          }
        }
      }
    }

    console.log(`[Cron] Completed ${completedCount} payments`);

    return NextResponse.json({
      success: true,
      emailsChecked: emails.length,
      pendingPayments: pendingPayments.length,
      completed: completedCount,
      matched
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}