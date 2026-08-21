import { addTicket, readStore, replyTicket } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ tickets: store.tickets });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    category?: string;
    subject?: string;
    body?: string;
    orderId?: string;
  };
  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }
  const ticket = await addTicket({
    category: body.category || "Other",
    subject: body.subject.trim(),
    body: body.body.trim(),
    orderId: body.orderId,
  });
  return NextResponse.json({ ticket });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    body?: string;
    status?: "open" | "waiting" | "closed";
  };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  try {
    const ticket = await replyTicket(body.id, body.body?.trim() || "Status updated", body.status);
    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}
