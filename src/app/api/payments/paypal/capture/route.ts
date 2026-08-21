import { capturePaypalOrder } from "@/lib/payments";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string };
    const token = String(body.token || "").trim();
    if (!token) return NextResponse.json({ error: "Missing PayPal token" }, { status: 400 });
    const payment = await capturePaypalOrder(token);
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Capture failed" },
      { status: 400 },
    );
  }
}
