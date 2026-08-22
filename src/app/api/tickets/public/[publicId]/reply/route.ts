import { NextRequest, NextResponse } from "next/server";
import { getTicketByPublicId, replyToTicket, listTicketMessages } from "@/lib/tickets";

/**
 * POST /api/tickets/public/[publicId]/reply
 * 
 * Add a reply to a ticket using public ID (no authentication required)
 * This endpoint allows guests to reply to their tickets without logging in
 * 
 * **Validates Requirements:**
 * - 9.4: Allow guest to reply using unique link
 * - 18.4: Allow ticket operations via public ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId: rawPublicId } = await params;
    const publicId = rawPublicId?.toUpperCase();

    if (!publicId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { body: replyBody } = body;

    if (!replyBody || typeof replyBody !== "string" || !replyBody.trim()) {
      return NextResponse.json(
        { error: "Reply message is required" },
        { status: 400 }
      );
    }

    // Fetch ticket by public ID to get internal ID
    const ticket = await getTicketByPublicId(publicId);

    // Add reply as customer (guest users reply as customers)
    const updatedTicket = await replyToTicket({
      ticketId: ticket.id,
      body: replyBody,
      authorRole: "customer",
    });

    // Fetch updated messages
    const messages = await listTicketMessages(updatedTicket.id);

    return NextResponse.json({
      ticket: updatedTicket,
      messages,
    });
  } catch (error) {
    console.error("Error replying to public ticket:", error);

    const message = error instanceof Error ? error.message : "Failed to reply to ticket";

    if (message === "Ticket not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message === "Cannot reply to closed ticket") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
