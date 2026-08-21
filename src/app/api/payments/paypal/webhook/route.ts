import { handlePaypalWebhookEvent, verifyPaypalWebhook } from "@/lib/payments";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const valid = await verifyPaypalWebhook(req.headers, body);
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  try {
    const result = await handlePaypalWebhookEvent(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 400 },
    );
  }
}
