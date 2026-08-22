import { NextRequest, NextResponse } from "next/server";
import { getTicketByPublicId, listTicketMessages } from "@/lib/tickets";

/**
 * GET /api/tickets/public/[publicId]
 * 
 * Fetch a ticket and its messages by public ID (no authentication required)
 * This endpoint allows guests to track their tickets without logging in
 * 
 * **Validates Requirements:**
 * - 9.4: Allow guest ticket tracking via unique public ID
 * - 18.4: Allow ticket lookup by public ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  try {
    const publicId = params.publicId?.toUpperCase();

    if (!publicId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    // Fetch ticket by public ID (no auth required)
    const ticket = await getTicketByPublicId(publicId);

    // Fetch all messages for the ticket
    const messages = await listTicketMessages(ticket.id);

    return NextResponse.json({
      ticket,
      messages,
    });
  } catch (error) {
    console.error("Error fetching public ticket:", error);

    const message = error instanceof Error ? error.message : "Failed to fetch ticket";

    if (message === "Ticket not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
