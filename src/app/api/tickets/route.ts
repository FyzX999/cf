/**
 * API Route: /api/tickets
 * 
 * Handles ticket listing and creation for the support system.
 * Supports both authenticated users and guest ticket creation.
 * 
 * Endpoints:
 * - GET: List tickets for the current user (with pagination)
 * - POST: Create a new support ticket
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.1, 9.1, 9.2, 14.1, 14.2, 14.3, 15.1
 * Security: Rate limiting to prevent spam (max 10 tickets per hour)
 */
import { createTicket, listTicketsForUser, validateTicketInput } from "@/lib/tickets";
import { getAuthUser } from "@/lib/supabase-server";
import type { TicketCategory } from "@/lib/types";
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
 * GET /api/tickets
 * List tickets for the current user with pagination
 * 
 * Query parameters:
 * - limit: number of tickets to return (default: 50, max: 100)
 * - offset: number of tickets to skip (default: 0)
 * 
 * Requirements: 8.1, 9.1, 9.2
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;
    
    // TODO: Check if user is admin - for now, regular users can only see their own tickets
    const isAdmin = false; // This should be checked from user profile/role
    
    // If not authenticated, return empty list (guest users track tickets by public ID)
    if (!user) {
      return NextResponse.json({ tickets: [] }, { status: 200 });
    }
    
    const tickets = await listTicketsForUser(user.id, isAdmin, limit, offset);
    
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Failed to list tickets:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets
 * Create a new support ticket
 * 
 * Body parameters:
 * - category: TicketCategory (required)
 * - subject: string (required, non-empty)
 * - body: string (required, non-empty)
 * - orderId?: string (optional, must exist if provided)
 * - guestEmail?: string (required if not authenticated)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.2, 14.1, 14.2, 14.3, 15.1
 * Security: Rate limiting (max 10 tickets per hour per user/IP)
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    
    // Step 1: Apply rate limiting
    const ipAddress = getClientIp(req);
    const identifier = getRateLimitIdentifier(user?.id, ipAddress);
    const rateLimitResult = checkRateLimit(identifier, RateLimitConfigs.TICKET_CREATION);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many ticket creation requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(RateLimitConfigs.TICKET_CREATION.maxRequests),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(Math.floor(rateLimitResult.resetAt / 1000)),
            "Retry-After": String(rateLimitResult.retryAfter),
          },
        }
      );
    }
    
    // Step 2: Parse and validate request body
    
    const body = (await req.json()) as {
      category?: string;
      subject?: string;
      body?: string;
      orderId?: string;
      guestEmail?: string;
    };
    
    // Use consolidated validation (Requirements 2.1, 2.2, 2.3, 2.4, 2.5)
    const validation = validateTicketInput({
      userId: user?.id,
      guestEmail: !user ? body.guestEmail : undefined,
      category: body.category as TicketCategory,
      subject: body.subject || "",
      body: body.body || "",
      orderId: body.orderId,
    });
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: validation.errors.length === 1 
            ? validation.errors[0] 
            : "Validation failed",
          errors: validation.errors 
        },
        { status: 400 }
      );
    }
    
    // Create the ticket
    const ticket = await createTicket({
      userId: user?.id,
      guestEmail: !user ? body.guestEmail?.trim() : undefined,
      category: body.category as TicketCategory,
      subject: body.subject!.trim(),
      body: body.body!.trim(),
      orderId: body.orderId?.trim() || undefined,
    });
    
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Failed to create ticket:", error);
    
    // Return specific error messages
    const errorMessage = error instanceof Error ? error.message : "Failed to create ticket";
    const statusCode = errorMessage.includes("Order not found") ? 400 : 500;
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
