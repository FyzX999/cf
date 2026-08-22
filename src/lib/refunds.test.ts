/**
 * Unit tests for refund processing with atomic rollback
 * 
 * Task 1.1: Tests for atomic refund processing with rollback capability
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { processRefund, calculateRefundAmount } from "./refunds";
import { processAtomicRefund } from "./commerce";
import { getOrder } from "./orders";
import { appendAudit } from "./admin-store";

// Mock dependencies
vi.mock("./orders");
vi.mock("./admin-store");
vi.mock("./commerce", async () => {
  const actual = await vi.importActual("./commerce");
  return {
    ...actual,
    processAtomicRefund: vi.fn(),
  };
});

describe("calculateRefundAmount", () => {
  it("should return full amount for canceled order with 0 delivered", () => {
    const order = {
      quantity: 1000,
      delivered: 0,
      total: 50,
      status: "canceled" as const,
    };
    expect(calculateRefundAmount(order)).toBe(50);
  });

  it("should return proportional refund for partial delivery", () => {
    const order = {
      quantity: 1000,
      delivered: 800,
      total: 50,
      status: "partial" as const,
    };
    // 200 out of 1000 undelivered = 20% = $10
    expect(calculateRefundAmount(order)).toBe(10);
  });

  it("should return 0 when fully delivered", () => {
    const order = {
      quantity: 1000,
      delivered: 1000,
      total: 50,
      status: "completed" as const,
    };
    expect(calculateRefundAmount(order)).toBe(0);
  });

  it("should round to 2 decimal places", () => {
    const order = {
      quantity: 1000,
      delivered: 667,
      total: 50,
      status: "partial" as const,
    };
    // 333 out of 1000 undelivered = 33.3% = $16.65
    expect(calculateRefundAmount(order)).toBe(16.65);
  });

  it("should never exceed order total", () => {
    const order = {
      quantity: 1000,
      delivered: 0,
      total: 50,
      status: "canceled" as const,
    };
    expect(calculateRefundAmount(order)).toBeLessThanOrEqual(50);
  });
});

describe("processRefund", () => {
  const mockGetOrder = getOrder as Mock;
  const mockAppendAudit = appendAudit as Mock;
  const mockProcessAtomicRefund = processAtomicRefund as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error when order not found", async () => {
    mockGetOrder.mockResolvedValue(null);
    mockAppendAudit.mockResolvedValue(undefined);

    const result = await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "canceled",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Order not found");
    expect(mockAppendAudit).toHaveBeenCalledWith(
      "refund_failed",
      "CF123456",
      "system"
    );
  });

  it("should return error when order is not paid", async () => {
    mockGetOrder.mockResolvedValue({
      publicId: "CF123456",
      quantity: 1000,
      delivered: 0,
      total: 50,
      status: "pending",
      paid: false,
    });
    mockAppendAudit.mockResolvedValue(undefined);

    const result = await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "canceled",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot refund unpaid order");
    expect(mockAppendAudit).toHaveBeenCalledWith(
      "refund_rejected_unpaid",
      "CF123456",
      "user-123"
    );
  });

  it("should return error when order already refunded", async () => {
    mockGetOrder.mockResolvedValue({
      publicId: "CF123456",
      quantity: 1000,
      delivered: 0,
      total: 50,
      status: "refunded",
      paid: true,
    });
    mockAppendAudit.mockResolvedValue(undefined);

    const result = await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "canceled",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Order already refunded");
    expect(mockAppendAudit).toHaveBeenCalledWith(
      "refund_duplicate_attempt",
      "CF123456",
      "user-123"
    );
  });

  it("should return error when no refund is due (fully delivered)", async () => {
    mockGetOrder.mockResolvedValue({
      publicId: "CF123456",
      quantity: 1000,
      delivered: 1000,
      total: 50,
      status: "completed",
      paid: true,
    });
    mockAppendAudit.mockResolvedValue(undefined);

    const result = await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "partial",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No refund due");
  });

  it("should successfully process refund when all conditions are met", async () => {
    mockGetOrder.mockResolvedValue({
      publicId: "CF123456",
      quantity: 1000,
      delivered: 0,
      total: 50,
      status: "canceled",
      paid: true,
    });
    mockAppendAudit.mockResolvedValue(undefined);
    mockProcessAtomicRefund.mockResolvedValue({
      success: true,
      transactionId: "TXN123456",
      newBalance: 100,
    });

    const result = await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "canceled",
    });

    expect(result.success).toBe(true);
    expect(result.refundAmount).toBe(50);
    expect(result.newWalletBalance).toBe(100);
    expect(result.transactionId).toBe("TXN123456");

    // Verify processAtomicRefund was called with correct params
    expect(mockProcessAtomicRefund).toHaveBeenCalledWith({
      userId: "user-123",
      orderId: "CF123456",
      refundAmount: 50,
      reason: "canceled",
      actor: "user-123",
      adminNote: undefined,
    });

    // Verify audit logs
    expect(mockAppendAudit).toHaveBeenCalledWith(
      "refund_started",
      expect.stringContaining("CF123456"),
      "user-123"
    );
    expect(mockAppendAudit).toHaveBeenCalledWith(
      "refund_completed",
      expect.stringContaining("CF123456"),
      "user-123"
    );
  });

  it("should handle atomic refund failure gracefully", async () => {
    mockGetOrder.mockResolvedValue({
      publicId: "CF123456",
      quantity: 1000,
      delivered: 0,
      total: 50,
      status: "canceled",
      paid: true,
    });
    mockAppendAudit.mockResolvedValue(undefined);
    mockProcessAtomicRefund.mockResolvedValue({
      success: false,
      error: "Database connection failed",
      newBalance: 50,
    });

    const result = await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "canceled",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Database connection failed");
    expect(mockAppendAudit).toHaveBeenCalledWith(
      "refund_failed",
      expect.stringContaining("CF123456"),
      "system"
    );
  });

  it("should use admin actor when adminNote is provided", async () => {
    mockGetOrder.mockResolvedValue({
      publicId: "CF123456",
      quantity: 1000,
      delivered: 0,
      total: 50,
      status: "canceled",
      paid: true,
    });
    mockAppendAudit.mockResolvedValue(undefined);
    mockProcessAtomicRefund.mockResolvedValue({
      success: true,
      transactionId: "TXN123456",
      newBalance: 100,
    });

    await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "canceled",
      adminNote: "Manual refund by admin",
    });

    // Verify processAtomicRefund was called with admin actor
    expect(mockProcessAtomicRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: "admin",
        adminNote: "Manual refund by admin",
      })
    );

    // Verify audit logs use admin actor
    expect(mockAppendAudit).toHaveBeenCalledWith(
      "refund_started",
      expect.anything(),
      "admin"
    );
  });

  it("should calculate correct refund for partial delivery", async () => {
    mockGetOrder.mockResolvedValue({
      publicId: "CF123456",
      quantity: 1000,
      delivered: 800,
      total: 50,
      status: "partial",
      paid: true,
    });
    mockAppendAudit.mockResolvedValue(undefined);
    mockProcessAtomicRefund.mockResolvedValue({
      success: true,
      transactionId: "TXN123456",
      newBalance: 60,
    });

    const result = await processRefund({
      orderId: "CF123456",
      userId: "user-123",
      reason: "partial",
    });

    expect(result.success).toBe(true);
    expect(result.refundAmount).toBe(10); // 20% of $50
    
    // Verify the refund amount passed to processAtomicRefund
    expect(mockProcessAtomicRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        refundAmount: 10,
      })
    );
  });
});
