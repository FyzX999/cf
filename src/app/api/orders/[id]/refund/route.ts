import { getOrder } from "@/lib/orders";
import { processRefund } from "@/lib/refunds";
import { isAdminRequest } from "@/lib/require-admin";
import { requireAuth, verifyOrderOwnership } from "@/lib/require-auth";
import { getAuthUser } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  RateLimitConfigs,
  getRateLimitIdentifier,
  getClientIp,
} from "@/lib/rate-limit";

/**
 * POST /api/orders/[id]/refund
 * 
 * Process a refund for a specific order.
 * 
 * Requirements addressed:
 * - 2.1: Verify order exists and is paid
 * - 2.2: Verify order has not been previously refunded
 * - 2.3: Credit user wallet balance by refund amount
 * - 2.4: Create transaction record with type "refund"
 * - 2.5: Update order status to "refunded"
 * - 2.6: Rollback all changes on failure
 * - 10.1: Verify requester is order owner or admin
 * - 10.2: Reject unauthorized refund requests
 * - 13.1, 13.2, 13.3, 13.4, 13.5: Error handling with clear messages
 * - Security: Rate limiting (max 5 refund requests per minute per user)
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const orderId = id.toUpperCase();

  // Step 1: Authenticate and authorize the requester using middleware
  // Requirements 6.1, 6.2, 6.3, 6.4, 6.5: Authentication and authorization checks
  const authResult = await requireAuth({
    allowAdmin: true,
    verifyOwnership: async (userId) => {
      return await verifyOrderOwnership(orderId, userId);
    },
  });

  // If authResult is a NextResponse, it means auth/authz failed
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403
  }

  const { user, isAdmin } = authResult;
  
  // Step 2: Rate limiting check (admins bypass rate limits)
  if (!isAdmin) {
    const ipAddress = getClientIp(req);
    const identifier = getRateLimitIdentifier(user?.id, ipAddress);
    const rateLimitResult = checkRateLimit(identifier, RateLimitConfigs.REFUND);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many refund requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(RateLimitConfigs.REFUND.maxRequests),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(Math.floor(rateLimitResult.resetAt / 1000)),
            "Retry-After": String(rateLimitResult.retryAfter),
          },
        }
      );
    }
  }

  // Step 3: Fetch the order
  // Requirement 2.1: Verify order exists
  const order = await getOrder(orderId);

  if (!order) {
    // Requirement 13.1: Order not found error
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // Step 4: Process the refund
  // Get the order user ID from the database (PublicOrder doesn't include userId)
  // We need this to process the refund, but we've already verified ownership in requireAuth
  const { createServiceSupabase } = await import("@/lib/supabase");
  const db = createServiceSupabase();
  
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const { data: orderData } = await db
    .from("orders")
    .select("user_id")
    .eq("public_id", orderId)
    .maybeSingle();
  
  const orderUserId = orderData?.user_id;
  
  if (!orderUserId) {
    return NextResponse.json(
      { error: "Order has no associated user" },
      { status: 400 }
    );
  }

  // Call processRefund with the order and user information
  const result = await processRefund({
    orderId,
    userId: orderUserId,
    reason: order.status === "canceled" ? "canceled" : "partial",
    adminNote: isAdmin ? "Refund processed by admin" : undefined,
  });

  // Step 5: Return the result
  if (result.success) {
    // Requirement 2.3, 2.4, 2.5: Return successful refund details
    return NextResponse.json({
      success: true,
      refundAmount: result.refundAmount,
      newWalletBalance: result.newWalletBalance,
      transactionId: result.transactionId,
    });
  } else {
    // Requirements 13.1-13.5: Return error with appropriate status code
    const statusCode = 
      result.error === "Order not found" ? 404 :
      result.error === "Already refunded" ? 400 :
      result.error === "Cannot refund unpaid order" ? 400 :
      result.error === "Invalid order data" ? 400 :
      500; // Database or unknown errors

    return NextResponse.json(
      { error: result.error },
      { status: statusCode }
    );
  }
}
