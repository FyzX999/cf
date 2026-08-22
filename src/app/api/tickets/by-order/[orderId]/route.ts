/**
 * API Route: /api/tickets/by-order/[orderId]
 * 
 * Fetches tickets associated with a specific order ID
 * 
 * Endpoints:
 * - GET: List tickets for the specified order
 * 
 * Requirements: 11.3
 */
import { listTicketsByOrderId } from "@/lib/tickets";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/by-order/[orderId]
 * List tickets associated with a specific order
 * 
 * Requirements: 11.3
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }
    
    const tickets = await listTicketsByOrderId(orderId);
    
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Failed to list tickets for order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
