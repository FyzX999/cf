/**
 * API Route: /api/admin/tickets
 * 
 * Admin-only endpoint for managing all support tickets.
 * Allows admins to view all tickets with user information, sorting, and filtering.
 * 
 * Endpoints:
 * - GET: List all tickets (not filtered by user) with user email information
 * 
 * Requirements: 8.3, 8.4, 15.3, 15.4
 */
import { requireAdminApi } from "@/lib/require-admin";
import { createServiceSupabase } from "@/lib/supabase";
import type { TicketCategory, TicketStatus } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TicketWithUser = {
  id: string;
  publicId: string;
  userId: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
};

/**
 * GET /api/admin/tickets
 * List all tickets with user information for admin panel
 * 
 * Requirements:
 * - 8.3: Admins can list all tickets regardless of ownership
 * - 8.4: Admins can view and manage any ticket
 * - 15.3: Display ticket status, category, user, and created date
 * - 15.4: Support sorting and filtering
 * 
 * Query parameters:
 * - limit: number of tickets to return (default: 100, max: 500)
 * - offset: number of tickets to skip (default: 0)
 */
export async function GET(req: Request) {
  // Requirement 8.3, 8.4: Admin authentication required
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
    const offset = Number(searchParams.get("offset")) || 0;

    const db = createServiceSupabase();
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Requirement 8.3: Fetch all tickets (no user filter for admins)
    // Join with profiles to get user email
    const { data: ticketsData, error: fetchError } = await db
      .from("tickets")
      .select(`
        *,
        profiles:user_id (
          email
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error("Failed to fetch tickets:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      );
    }

    // Map database rows to TicketWithUser type
    // Requirement 15.3: Include user email for display
    const tickets: TicketWithUser[] = (ticketsData || []).map((ticket: any) => ({
      id: ticket.id,
      publicId: ticket.public_id,
      userId: ticket.user_id,
      category: ticket.category as TicketCategory,
      subject: ticket.subject,
      status: ticket.status as TicketStatus,
      orderId: ticket.order_id ?? undefined,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      userEmail: ticket.profiles?.email ?? ticket.guest_email ?? undefined,
    }));

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Failed to list admin tickets:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
