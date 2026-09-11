import { NextRequest, NextResponse } from "next/server";
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { getCashAppConfig, parseCashAppEmail } from "@/lib/cashapp";
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
                    
                    // Use strict parser from cashapp.ts
                    const paymentData = await parseCashAppEmail(html, plainText);

                    emails.push({
                      date: parsed.date,
                      subject: parsed.subject,
                      from: parsed.from?.text,
                      messageId: parsed.messageId,
                      parsed: {
                        amount: paymentData?.amount || null,
                        note: paymentData?.note || null,
                        recipient: paymentData?.recipient || null,
                        sender: paymentData?.sender || null,
                        isValid: paymentData !== null
                      },
                      // More preview for debugging
                      textPreview: plainText?.substring(0, 1500),
                      htmlPreview: html?.substring(0, 1500),
                      // Show what patterns we're searching for
                      validationRules: {
                        requiresPhrase: 'You were sent',
                        requiresNote: 'CF format (CF followed by 6+ digits)',
                        requiresAmount: 'Positive amount under $10,000',
                        requiresRecipient: 'CashApp recipient tag'
                      }
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
