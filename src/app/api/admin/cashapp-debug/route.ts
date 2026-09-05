import { NextRequest, NextResponse } from "next/server";
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';
import { getCashAppConfig } from "@/lib/cashapp";
import { adminCookieName, isValidAdminSession } from '@/lib/admin-auth';

/**
 * Verify admin authentication
 */
async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(adminCookieName())?.value;
  const isValid = await isValidAdminSession(token);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/admin/cashapp-debug
 * Debug CashApp email fetching - shows recent emails and parsing results
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {

    const config = getCashAppConfig();
    if (!config) {
      return NextResponse.json(
        { error: "CashApp not configured" },
        { status: 503 }
      );
    }

    return new Promise((resolve) => {
      const imap = new Imap({
        user: config.email,
        password: config.password,
        host: config.imapHost,
        port: config.imapPort,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      const emails: any[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err: Error | null) => {
          if (err) {
            resolve(
              NextResponse.json(
                { error: `Failed to open inbox: ${err.message}` },
                { status: 500 }
              )
            );
            return;
          }

          // Search for recent CashApp emails
          imap.search(
            [
              ['FROM', 'cash@square.com'],
              ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] // Last 7 days
            ],
            (err: Error | null, results: number[]) => {
              if (err) {
                resolve(
                  NextResponse.json(
                    { error: `Search failed: ${err.message}` },
                    { status: 500 }
                  )
                );
                return;
              }

              if (!results || results.length === 0) {
                imap.end();
                resolve(
                  NextResponse.json({
                    message: "No CashApp emails found in last 7 days",
                    emails: []
                  })
                );
                return;
              }

              // Fetch last 10 emails max
              const toFetch = results.slice(-10);
              const fetch = imap.fetch(toFetch, { bodies: '' });

              fetch.on('message', (msg: Imap.ImapMessage) => {
                msg.on('body', (stream: NodeJS.ReadableStream) => {
                  simpleParser(stream as any, async (err: Error | undefined, parsed: any) => {
                    if (err) return;

                    const html = parsed.html || '';
                    const $ = cheerio.load(html);

                    // Extract amount
                    let amount: number | null = null;
                    const amountSelectors = ['td', 'div', 'span'];
                    for (const selector of amountSelectors) {
                      $(selector).each((_, elem) => {
                        const text = $(elem).text().trim();
                        const match = text.match(/\+?\$(\d+\.\d+)/);
                        if (match && !amount) {
                          amount = parseFloat(match[1]);
                          return false;
                        }
                      });
                      if (amount) break;
                    }

                    // Extract note
                    let note: string | null = null;
                    $('.profile-description, .text-subtle').each((_, elem) => {
                      const text = $(elem).text().trim();
                      const match = text.match(/^For\s+(.+)$/i);
                      if (match) {
                        note = match[1].trim();
                        return false;
                      }
                    });

                    // Fallback
                    if (!note) {
                      const allText = $.text();
                      const match = allText.match(/For\s+([A-Z0-9]+)/i);
                      if (match) {
                        note = match[1].trim();
                      }
                    }

                    emails.push({
                      date: parsed.date,
                      subject: parsed.subject,
                      from: parsed.from?.text,
                      messageId: parsed.messageId,
                      parsed: {
                        amount,
                        note
                      },
                      // First 500 chars of text for debugging
                      textPreview: parsed.text?.substring(0, 500)
                    });
                  });
                });
              });

              fetch.once('error', (err: Error) => {
                resolve(
                  NextResponse.json(
                    { error: `Fetch failed: ${err.message}` },
                    { status: 500 }
                  )
                );
              });

              fetch.once('end', () => {
                imap.end();
                // Wait a bit for all parsing to complete
                setTimeout(() => {
                  resolve(
                    NextResponse.json({
                      message: `Found ${emails.length} CashApp emails`,
                      config: {
                        email: config.email,
                        imapHost: config.imapHost,
                        imapPort: config.imapPort,
                        cashappTag: config.cashappTag
                      },
                      emails: emails.sort((a, b) => 
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                      )
                    })
                  );
                }, 1000);
              });
            }
          );
        });
      });

      imap.once('error', (err: Error) => {
        resolve(
          NextResponse.json(
            { error: `IMAP error: ${err.message}` },
            { status: 500 }
          )
        );
      });

      imap.connect();
    });
  } catch (error) {
    console.error("CashApp debug error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Debug failed",
      },
      { status: 500 }
    );
  }
}
