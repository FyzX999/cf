import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function nowpaymentsBase() {
  const mode = (process.env.NOWPAYMENTS_MODE || "live").toLowerCase();
  return mode === "sandbox" ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
}

export async function GET() {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Crypto payments not configured" }, { status: 503 });
  }

  try {
    // Fetch min amount for ETH → TRX pair as a representative minimum
    // NowPayments returns min_amount in the from_currency
    const res = await fetch(`${nowpaymentsBase()}/v1/min-amount?currency_from=eth&currency_to=trx`, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      console.error("NowPayments min-amount fetch failed:", res.status, await res.text());
      return NextResponse.json({ minAmount: 1.0 }, { status: 200 }); // fallback
    }

    const json = (await res.json()) as {
      currency_from?: string;
      currency_to?: string;
      min_amount?: number;
    };

    const minAmount = Number(json.min_amount ?? 1.0);
    return NextResponse.json({ minAmount });
  } catch (error) {
    console.error("Failed to fetch NowPayments min amount:", error);
    return NextResponse.json({ minAmount: 1.0 }, { status: 200 }); // fallback to $1
  }
}
