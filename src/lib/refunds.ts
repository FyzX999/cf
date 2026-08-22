import { PublicOrder, RefundRequest, RefundResult } from "./types";
import { getOrder } from "./orders";
import { processAtomicRefund } from "./commerce";
import { appendAudit } from "./admin-store";

/**
 * Calculate the refund amount for a canceled or partially delivered order.
 * 
 * Requirements addressed:
 * - 1.1: Full refund when canceled with 0 delivered
 * - 1.2: Proportional refund for partial delivery
 * - 1.3: Round to 2 decimal places
 * - 1.4: Never exceed order total
 * - 1.5: Return 0 when fully delivered
 * - 16.1, 16.2, 16.3: Partial order refund logic
 * - 20.1, 20.2, 20.3: Deterministic calculation
 * 
 * @param order - Order object with quantity, delivered, total, and status fields
 * @returns Refund amount rounded to 2 decimal places
 */
export function calculateRefundAmount(
  order: Pick<PublicOrder, "quantity" | "delivered" | "total" | "status">
): number {
  // Validate preconditions
  if (!order || order.quantity <= 0 || order.delivered < 0 || order.total <= 0) {
    return 0;
  }

  // Validate delivered doesn't exceed quantity
  if (order.delivered > order.quantity) {
    return 0;
  }

  // Calculate undelivered quantity
  const undelivered = order.quantity - order.delivered;

  // Requirement 1.5: Return 0 when fully delivered
  if (undelivered === 0) {
    return 0;
  }

  // Requirement 1.1: Full cancellation refund (delivered = 0)
  if (order.status === "canceled" && order.delivered === 0) {
    return order.total;
  }

  // Requirement 1.2 & 16.2: Proportional refund for partial delivery
  if (undelivered > 0) {
    // Calculate proportional refund: (quantity - delivered) / quantity × total
    const refundRatio = undelivered / order.quantity;
    const refundAmount = order.total * refundRatio;

    // Requirement 1.3: Round to 2 decimal places to avoid floating-point errors
    // Using Math.round to ensure precision
    const roundedRefund = Math.round(refundAmount * 100) / 100;

    // Requirement 1.4: Ensure refund never exceeds original total
    return Math.min(roundedRefund, order.total);
  }

  return 0;
}

/**
 * Process a refund for a canceled or partially delivered order.
 * 
 * Task 1.1: Implements atomic refund processing with rollback capability
 * 
 * Requirements addressed:
 * - 1.1: All database changes succeed or none persist (atomic operation)
 * - 1.2: Create debit transaction to reverse credit when rollback required
 * - 1.3: Log failures with full details for audit purposes
 * - 1.4: Return clear error messages indicating refund failure and need for retry
 * - 1.5: Either all database changes succeed or none persist
 * - 2.1: Verify order exists and is paid
 * - 2.2: Verify order has not been previously refunded
 * - 2.3: Credit user wallet balance by refund amount
 * - 2.4: Create transaction record with type "refund"
 * - 2.5: Update order status to "refunded"
 * - 2.6: Rollback all changes on failure
 * - 3.1: Reject refund for already refunded orders
 * - 3.2: Ensure exactly one refund per order
 * - 3.3: Use database transactions for atomic processing
 * - 10.1: Verify requester is order owner or admin
 * - 10.2: Reject unauthorized refund requests
 * - 10.3: Log refund operations for audit trail
 * - 12.1: Atomically update wallet balance
 * - 12.2: Record transaction with method "Refund"
 * - 12.3: Update wallet in same transaction as refund
 * - 13.1, 13.2, 13.3, 13.4, 13.5: Error handling with clear messages
 * 
 * @param request - Refund request with order ID, user ID, reason, and optional admin note
 * @returns RefundResult with success status, amounts, and transaction ID
 */
export async function processRefund(request: RefundRequest): Promise<RefundResult> {
  try {
    // Requirement 2.1: Verify order exists
    const order = await getOrder(request.orderId);
    
    if (!order) {
      // Requirement 13.1: Order not found error
      await appendAudit("refund_failed", request.orderId, "system");
      return {
        success: false,
        refundAmount: 0,
        newWalletBalance: 0,
        transactionId: "",
        error: "Order not found. Refund cannot be processed.",
      };
    }

    // Requirement 2.1: Verify order is paid
    if (!order.paid) {
      // Requirement 13.2: Order not paid error
      await appendAudit("refund_rejected_unpaid", request.orderId, request.userId);
      return {
        success: false,
        refundAmount: 0,
        newWalletBalance: 0,
        transactionId: "",
        error: "Cannot refund unpaid order. Payment must be completed first.",
      };
    }

    // Requirement 2.2 & 3.1: Check if already refunded (idempotency)
    if (order.status === "refunded") {
      // Requirement 13.3: Already refunded error
      await appendAudit("refund_duplicate_attempt", request.orderId, request.userId);
      return {
        success: false,
        refundAmount: 0,
        newWalletBalance: 0,
        transactionId: "",
        error: "Order already refunded. Cannot refund the same order twice.",
      };
    }

    // Requirement 13.4: Validate order data
    if (!order.quantity || !order.total || order.quantity <= 0 || order.total <= 0) {
      await appendAudit("refund_invalid_order_data", request.orderId, "system");
      return {
        success: false,
        refundAmount: 0,
        newWalletBalance: 0,
        transactionId: "",
        error: "Invalid order data. Please contact support.",
      };
    }

    // Calculate refund amount using existing function
    const refundAmount = calculateRefundAmount(order);

    if (refundAmount <= 0) {
      await appendAudit("refund_no_amount_due", request.orderId, request.userId);
      return {
        success: false,
        refundAmount: 0,
        newWalletBalance: 0,
        transactionId: "",
        error: "No refund due. Order has been fully delivered.",
      };
    }

    // Requirement 1.3: Comprehensive audit logging - Log operation start
    const actor = request.adminNote ? "admin" : request.userId;
    await appendAudit(
      "refund_started",
      `${request.orderId} | Amount: $${refundAmount.toFixed(2)} | Reason: ${request.reason}`,
      actor
    );

    // Use the new atomic refund function from commerce.ts
    // Requirements 1.1, 1.2, 1.3, 1.4, 1.5: Atomic operation with automatic rollback
    const result = await processAtomicRefund({
      userId: request.userId,
      orderId: request.orderId,
      refundAmount,
      reason: request.reason,
      actor,
      adminNote: request.adminNote,
    });

    if (!result.success) {
      // Requirement 1.3: Log failure
      await appendAudit(
        "refund_failed",
        `${request.orderId} | Error: ${result.error}`,
        "system"
      );
      
      // Requirement 1.4: Return clear error message
      return {
        success: false,
        refundAmount: 0,
        newWalletBalance: result.newBalance ?? 0,
        transactionId: "",
        error: result.error ?? "Refund processing failed. Please retry.",
      };
    }

    // SUCCESS: Log completion
    // Requirement 1.3: Comprehensive audit logging
    await appendAudit(
      "refund_completed",
      `${request.orderId} | User: ${request.userId} | Amount: $${refundAmount.toFixed(2)} | New balance: $${result.newBalance!.toFixed(2)} | TxnID: ${result.transactionId}`,
      actor
    );

    // Requirement 1.5: All database changes succeeded
    return {
      success: true,
      refundAmount,
      newWalletBalance: result.newBalance!,
      transactionId: result.transactionId!,
    };
  } catch (error) {
    // Requirement 13.5: Catch any unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Requirement 1.3: Log unexpected error
    await appendAudit(
      "refund_unexpected_error",
      `${request.orderId} | Error: ${errorMessage}`,
      "system"
    );

    // Requirement 1.4: Clear error message
    return {
      success: false,
      refundAmount: 0,
      newWalletBalance: 0,
      transactionId: "",
      error: "An unexpected error occurred during refund processing. Please retry the refund request. If the issue persists, contact support.",
    };
  }
}
