import { paymentConfig } from "@/lib/payments";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(paymentConfig());
}
