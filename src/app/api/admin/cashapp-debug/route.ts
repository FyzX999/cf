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
export async function GET(req: NextRequest): Promise<NextResponse> {
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

    return new Promise<NextResponse>((resolve) => {
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
                    const plainText = parsed.text || '';
                    const $ = cheerio.load(html);

                    // Extract amount - improved patterns
                    let amount: number | null = null;
                    const amountPatterns = [
                      /\+\$(\d+\.?\d*)/,
                      /\$(\d+\.\d{2})/,
                      /(\d+\.\d{2})\s*USD/i,
                    ];
                    
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

                    // Extract note - improved patterns
                    let note: string | null = null;
                    $('.profile-description, .text-subtle, [class*="note"], [class*="memo"]').each((_, elem) => {
                      if (note) return false;
                      const text = $(elem).text().trim();
                      const match = text.match(/For\s+([A-Z0-9]+)/i);
                      if (match) {
                        note = match[1].trim();
                        return false;
                      }
                    });

                    // Fallback: search entire text
                    if (!note) {
                      const allText = $.text() + ' ' + plainText;
                      const patterns = [
                        /For\s+([A-Z]{2}\d{6})/i,
                        /For:\s*([A-Z]{2}\d{6})/i,
                        /Note:\s*([A-Z]{2}\d{6})/i,
                      ];
                      for (const pattern of patterns) {
                        const match = allText.match(pattern);
                        if (match) {
                          note = match[1].trim();
                          break;
                        }
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
                      // First 800 chars of text for debugging
                      textPreview: plainText?.substring(0, 800),
                      htmlPreview: html?.substring(0, 800)
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
