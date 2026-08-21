import { appendAudit, readStore, updateSettings } from "@/lib/admin-store";
import { requireAdminApi } from "@/lib/require-admin";
import type { SiteSettings } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const store = await readStore();
  return NextResponse.json({ settings: store.settings });
}

export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await req.json()) as Partial<SiteSettings>;
  const store = await updateSettings(body);
  await appendAudit("update_settings", "site");
  return NextResponse.json({ settings: store.settings });
}
