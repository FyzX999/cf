import { NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions, signAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  if (!verifyAdminCredentials(String(body.username ?? ""), String(body.password ?? ""))) {
    return NextResponse.json({ error: "Invalid admin username or password" }, { status: 401 });
  }
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
