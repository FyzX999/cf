import { NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions, signAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
import { getClientIdentifier, isRateLimited, rateLimits } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // SECURITY: Rate limit admin login attempts to prevent brute force
  const identifier = getClientIdentifier(req);
  if (isRateLimited(`admin-login:${identifier}`, rateLimits.adminLogin)) {
    console.warn(`[Security] Rate limit exceeded for admin login from ${identifier}`);
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in 15 minutes." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  
  if (!verifyAdminCredentials(String(body.username ?? ""), String(body.password ?? ""))) {
    console.warn(`[Security] Failed admin login attempt from ${identifier}`);
    return NextResponse.json({ error: "Invalid admin username or password" }, { status: 401 });
  }
  
  console.log(`[Security] Successful admin login from ${identifier}`);
  const token = await signAdminSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), token, adminCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), "", { ...adminCookieOptions(), maxAge: 0 });
  return res;
}
