import { getTicketByPublicId, listTicketMessages } from "@/lib/tickets";
import { getAuthUser } from "@/lib/supabase-server";
import { isAdminRequest } from "@/lib/require-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/[id]
 * 
 * Fetch specific ticket with its messages using Public ID
 * 
 * **Validates Requirements:**
 * - 4.1: Use UUID internally for ticket operations
 * - 4.2: Use Public ID in URL paths
 * - 4.3: Resolve Public ID to UUID when loading ticket details
 * - 4.4: Display clear "Ticket not found" message when ticket doesn't exist
 * - 4.5: Ensure all ticket navigation flows work correctly
 * 
 * Requirements:
 * - 8.2: Verify the user owns the ticket or is an administrator
 * - 8.3: Administrators can view all tickets regardless of ownership
 * - 8.4: Return ticket details with messages in chronological order
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: publicId } = await ctx.params;
    
    // Check authentication
    const user = await getAuthUser();
    const isAdmin = await isAdminRequest();
    
    // Requirement 4.3: Resolve Public ID to get full ticket with UUID
    const ticket = await getTicketByPublicId(publicId);
    
    // Requirement 8.2: For non-admin users, they must be authenticated and own the ticket
    if (!isAdmin && !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Requirement 8.2: Verify the user owns the ticket (unless admin)
    if (!isAdmin && ticket.userId && ticket.userId !== user?.id) {
      return NextResponse.json(
        { error: "You do not have access to this ticket" },
        { status: 403 }
      );
    }
    
    // Fetch messages in chronological order using the internal UUID
    const messages = await listTicketMessages(ticket.id);
    
    return NextResponse.json({
      ticket,
      messages
    });
  } catch (error) {
    // Handle authorization errors and other failures
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json(
          { error: "You do not have access to this ticket" },
          { status: 403 }
        );
      }
      
      // Requirement 4.4: Clear "Ticket not found" message for missing tickets
      if (error.message === "Ticket not found") {
        return NextResponse.json(
          { error: "Ticket not found. Please check the ticket ID and try again." },
          { status: 404 }
        );
      }
      
      // Database or other errors
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}
