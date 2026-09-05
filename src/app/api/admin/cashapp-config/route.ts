import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from '@/lib/admin-auth';
import { getCashAppConfig } from "@/lib/cashapp";

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
 * GET /api/admin/cashapp-config
 * Check CashApp configuration status
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const config = getCashAppConfig();
    
    if (!config) {
      return NextResponse.json({
        configured: false,
        missing: {
          email: !process.env.CASHAPP_EMAIL,
          password: !process.env.CASHAPP_EMAIL_PASSWORD,
          tag: !process.env.CASHAPP_TAG,
          imapHost: !process.env.CASHAPP_IMAP_HOST,
          imapPort: !process.env.CASHAPP_IMAP_PORT,
        },
        message: "CashApp not configured - missing environment variables"
      });
    }

    return NextResponse.json({
      configured: true,
      config: {
        email: config.email,
        emailMasked: config.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        cashappTag: config.cashappTag,
        passwordSet: !!config.password
      }
    });
  } catch (error) {
    console.error("CashApp config check error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check config",
      },
      { status: 500 }
    );
  }
}
