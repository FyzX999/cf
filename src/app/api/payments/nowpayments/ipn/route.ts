import { handleNowpaymentsIpn, verifyNowpaymentsSignature } from "@/lib/payments";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-nowpayments-sig");
  try {
    if (!verifyNowpaymentsSignature(raw, signature)) {
      return NextResponse.json({ error: "Invalid IPN signature" }, { status: 400 });
    }
    const payload = JSON.parse(raw) as Parameters<typeof handleNowpaymentsIpn>[0];
    const result = await handleNowpaymentsIpn(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "IPN failed" },
      { status: 400 },
    );
  }
}
