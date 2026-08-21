import { listOrders } from "@/lib/orders";
import { requireAdminApi } from "@/lib/require-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const orders = await listOrders();
  return NextResponse.json({ orders });
}
