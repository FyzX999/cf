import { getProviderBalance, isProviderConfigured } from "@/lib/provider";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isProviderConfigured()) {
    return NextResponse.json({ configured: false });
  }
  try {
    const balance = await getProviderBalance();
    return NextResponse.json({ configured: true, balance });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Balance failed" },
      { status: 502 },
    );
  }
}
