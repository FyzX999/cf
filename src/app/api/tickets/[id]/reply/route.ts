/**
 * API Route: /api/tickets/[id]/reply
 * 
 * Handles adding replies to existing support tickets.
 * Supports both customer and agent (admin) replies with appropriate authorization.
 * 
 * Endpoints:
 * - POST: Add a reply to a ticket
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.5, 6.1, 6.2, 6.4
 * Security: Rate limiting to prevent spam (max 30 replies per hour per user)
 */
import { replyToTicket, getTicketByPublicId, listTicketMessages } from "@/lib/tickets";
import { getAuthUser } from "@/lib/supabase-server";
import { isAdminRequest } from "@/lib/require-admin";
import type { TicketStatus } from "@/lib/types";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  RateLimitConfigs,
  getRateLimitIdentifier,
  getClientIp,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/[id]/reply
 * 
 * Add a reply message to an existing ticket using Public ID
 * 
 * Body parameters:
 * - body: string (required, non-empty) - The message content
 * - newStatus?: TicketStatus (optional) - Update ticket status
 * 
 * Authorization:
 * - If authorRole='customer': requester must be the ticket owner
 * - If authorRole='agent': requester must be an administrator
 * 
 * Requirements:
 * - 4.1: Use UUID internally for ticket operations
 * - 4.2: Use Public ID in URL paths
 * - 4.3: Resolve Public ID to UUID when processing replies
 * - 4.4: Display clear "Ticket not found" message when ticket doesn't exist
 * - 4.5: Ensure all ticket navigation flows work correctly
 * - 5.1: Store message with appropriate authorRole
 * - 5.2: Insert message with authorRole and body
 * - 5.3: Update ticket's updated_at timestamp
 * - 5.5: Prevent replies to closed tickets
 * - 6.1: Automatic status transition (open → in_progress on first agent reply)
 * - 6.2: Support explicit status updates
 * - 6.4: Record updated_at timestamp on status change
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: publicId } = await ctx.params;
    
    // Check authentication and admin status
    const user = await getAuthUser();
    const isAdmin = await isAdminRequest();
    
    // Requirement 4.3: Resolve Public ID to get the ticket with internal UUID
    let ticket;
    try {
      ticket = await getTicketByPublicId(publicId);
    } catch (error) {
      if (error instanceof Error && error.message === "Ticket not found") {
        return NextResponse.json(
          { error: "Ticket not found. Please check the ticket ID and try again." },
          { status: 404 }
        );
      }
      throw error;
    }
    
    // Get the internal UUID for database operations
    const ticketId = ticket.id;
    
    // Step 1: Apply rate limiting (admins bypass rate limits)
    if (!isAdmin) {
      const ipAddress = getClientIp(req);
      const identifier = getRateLimitIdentifier(user?.id, ipAddress);
      const rateLimitResult = checkRateLimit(identifier, RateLimitConfigs.TICKET_REPLY);
      
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: "Too many reply requests. Please try again later.",
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(RateLimitConfigs.TICKET_REPLY.maxRequests),
              "X-RateLimit-Remaining": String(rateLimitResult.remaining),
              "X-RateLimit-Reset": String(Math.floor(rateLimitResult.resetAt / 1000)),
              "Retry-After": String(rateLimitResult.retryAfter),
            },
          }
        );
      }
    }
    
    // Step 2: Parse and validate request body
    
    const body = (await req.json()) as {
      body?: string;
      newStatus?: TicketStatus;
    };
    
    // Validate required fields
    if (!body.body?.trim()) {
      return NextResponse.json(
        { error: "Reply message cannot be empty" },
        { status: 400 }
      );
    }
    
    // Validate optional status if provided
    const validStatuses: TicketStatus[] = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
    if (body.newStatus && !validStatuses.includes(body.newStatus)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }
    
    // Determine author role and perform authorization check
    let authorRole: "customer" | "agent";
    
    if (isAdmin) {
      // Admin users reply as agents
      authorRole = "agent";
    } else {
      // Non-admin users reply as customers
      authorRole = "customer";
      
      // For customer replies, verify authentication
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      
      // Requirement 5.1, 5.2: Verify ticket ownership for customer replies
      if (ticket.userId && ticket.userId !== user.id) {
        return NextResponse.json(
          { error: "You do not have access to this ticket" },
          { status: 403 }
        );
      }
    }
    
    // Requirement 6.2: Only admins can explicitly change ticket status
    if (body.newStatus && !isAdmin) {
      return NextResponse.json(
        { error: "Only administrators can change ticket status" },
        { status: 403 }
      );
    }
    
    // Requirements 5.1, 5.2, 5.3, 5.5, 6.1, 6.4: Add reply to ticket using internal UUID
    const updatedTicket = await replyToTicket({
      ticketId: ticketId,
      body: body.body.trim(),
      authorRole,
      newStatus: body.newStatus,
    });
    
    // Fetch updated messages list to return with response
    const messages = await listTicketMessages(ticketId);
    
    return NextResponse.json({
      ticket: updatedTicket,
      messages,
      message: "Reply added successfully"
    });
  } catch (error) {
    // Handle specific errors from replyToTicket
    if (error instanceof Error) {
      // Requirement 5.5: Closed ticket error
      if (error.message === "Cannot reply to closed ticket") {
        return NextResponse.json(
          { error: "Cannot reply to closed ticket" },
          { status: 400 }
        );
      }
      
      // Ticket not found
      if (error.message === "Ticket not found") {
        return NextResponse.json(
          { error: "Ticket not found. Please check the ticket ID and try again." },
          { status: 404 }
        );
      }
      
      // Database or other errors
      console.error("Failed to add reply:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to add reply" },
      { status: 500 }
    );
  }
}
