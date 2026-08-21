import { ensureApiKey, getWallet, issueApiKey, redeemGiftCard } from "@/lib/commerce";
import { getAuthUser } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const wallet = await getWallet(user.id);
  const apiKey = wallet.apiKey || (await ensureApiKey(user.id, user.email ?? undefined));
  return NextResponse.json({
    balance: wallet.balance,
    transactions: wallet.transactions,
    apiKey,
    apiUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://cheapfollower.shop"}/api/v2`,
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    code?: string;
  };
  try {
    if (body.action === "redeem") {
      const result = await redeemGiftCard(String(body.code || ""), user.id);
      const wallet = await getWallet(user.id);
      return NextResponse.json({ ok: true, ...result, balance: wallet.balance });
    }
    if (body.action === "rotate-key") {
      const apiKey = await issueApiKey(user.id, user.email ?? undefined);
      return NextResponse.json({ apiKey });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Wallet failed" }, { status: 400 });
  }
}
