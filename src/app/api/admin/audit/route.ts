import { readStore } from "@/lib/admin-store";
import { requireAdminApi } from "@/lib/require-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const store = await readStore();
  return NextResponse.json({ audit: store.audit });
}
