/**
 * Unit tests for wallet optimistic locking and balance consistency
 * 
 * Task 1.5: Implement optimistic locking for wallet operations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  creditWallet,
  debitWallet,
  checkWalletConsistency,
  getWallet,
} from "./commerce";
import { writeStore, readStore } from "./admin-store";

// Mock the admin-store module
vi.mock("./admin-store", () => ({
  readStore: vi.fn(),
  writeStore: vi.fn(),
}));

// Mock the supabase module
vi.mock("./supabase", () => ({
  createServiceSupabase: vi.fn(() => null),
}));

describe("Wallet Optimistic Locking", () => {
  const testUserId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock store state
    vi.mocked(readStore).mockResolvedValue({
      promoCodes: [],
      giftCards: [],
      wallets: {
        [testUserId]: {
          balance: 100.0,
          apiKey: null,
          transactions: [],
        },
      },
      catalog: [],
      orders: [],
    });
    vi.mocked(writeStore).mockImplementation(async (updater) => {
      const currentStore = await readStore();
      const newStore = updater(currentStore);
      vi.mocked(readStore).mockResolvedValue(newStore);
      return newStore;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("creditWallet with optimistic locking", () => {
    it("should successfully credit wallet when expected balance matches", async () => {
      // Requirement 9.1: Read current balance
      // Requirement 9.2: Verify balance matches expected value
      const currentBalance = 100.0;
      const creditAmount = 50.0;

      const newBalance = await creditWallet(
        testUserId,
        creditAmount,
        "Test Credit",
        "Test note",
        "deposit",
        currentBalance // Pass expected balance
      );

      expect(newBalance).toBe(150.0);
    });

    it("should retry when balance mismatch detected", async () => {
      // Requirement 9.3: Retry logic when race condition detected
      // This test verifies that when a balance mismatch is detected,
      // the function will retry with the fresh balance
      
      // Start with initial balance
      vi.mocked(readStore).mockResolvedValue({
        promoCodes: [],
        giftCards: [],
        wallets: {
          [testUserId]: {
            balance: 120.0, // Current balance is 120, not 100
            apiKey: null,
            transactions: [],
          },
        },
        catalog: [],
        orders: [],
      });

      // Try to credit with expected balance of 100, but actual is 120
      // The function should detect mismatch and retry
      const newBalance = await creditWallet(
        testUserId,
        50.0,
        "Test Credit",
        "Test note",
        "deposit",
        100.0 // Expected balance that doesn't match
      );

      // Should successfully complete with retried value
      // 120 (actual balance) + 50 = 170
      expect(newBalance).toBe(170.0);
    });

    it("should throw error after max retries on persistent race condition", async () => {
      // Requirement 9.3: Error after max retries
      // This test simulates a scenario where the balance keeps changing
      // between reads, causing persistent mismatch
      
      let attemptCount = 0;

      vi.mocked(readStore).mockImplementation(async () => {
        attemptCount++;
        return {
          promoCodes: [],
          giftCards: [],
          wallets: {
            [testUserId]: {
              // Balance changes on every read to simulate persistent race condition
              balance: 100.0 + attemptCount * 10,
              apiKey: null,
              transactions: [],
            },
          },
          catalog: [],
          orders: [],
        };
      });

      // This should eventually fail after max retries
      await expect(
        creditWallet(
          testUserId,
          50.0,
          "Test Credit",
          "Test note",
          "deposit",
          100.0 // Fixed expected balance that will never match the changing balance
        )
      ).rejects.toThrow(/balance verification failed/); // Match both DB and memory mode error messages
      
      // Verify we attempted multiple retries
      expect(attemptCount).toBeGreaterThan(1);
    });

    it("should validate credit amount is positive", async () => {
      // Requirement 9.1: Validate inputs
      await expect(
        creditWallet(testUserId, -50.0, "Invalid Credit", "Test note")
      ).rejects.toThrow("Credit amount must be positive");

      await expect(
        creditWallet(testUserId, 0, "Invalid Credit", "Test note")
      ).rejects.toThrow("Credit amount must be positive");
    });
  });

  describe("debitWallet with optimistic locking", () => {
    it("should successfully debit wallet when expected balance matches", async () => {
      // Requirement 9.1: Read current balance
      // Requirement 9.2: Verify balance matches expected value
      const currentBalance = 100.0;
      const debitAmount = 30.0;

      const newBalance = await debitWallet(
        testUserId,
        debitAmount,
        "Test Debit",
        "Test note",
        currentBalance // Pass expected balance
      );

      expect(newBalance).toBe(70.0);
    });

    it("should retry when balance mismatch detected", async () => {
      // Requirement 9.3: Retry logic when race condition detected
      
      // Set current balance different from expected
      vi.mocked(readStore).mockResolvedValue({
        promoCodes: [],
        giftCards: [],
        wallets: {
          [testUserId]: {
            balance: 150.0, // Current balance is 150, not 100
            apiKey: null,
            transactions: [],
          },
        },
        catalog: [],
        orders: [],
      });

      // Try to debit with expected balance of 100, but actual is 150
      const newBalance = await debitWallet(
        testUserId,
        30.0,
        "Test Debit",
        "Test note",
        100.0 // Expected balance that doesn't match
      );

      // Should successfully complete with retried value
      // 150 (actual balance) - 30 = 120
      expect(newBalance).toBe(120.0);
    });

    it("should throw error after max retries on persistent race condition", async () => {
      // Requirement 9.3: Error after max retries
      let callCount = 0;

      vi.mocked(readStore).mockImplementation(async () => {
        callCount++;
        return {
          promoCodes: [],
          giftCards: [],
          wallets: {
            [testUserId]: {
              balance: 100.0 + callCount * 10, // Balance keeps changing
              apiKey: null,
              transactions: [],
            },
          },
          catalog: [],
          orders: [],
        };
      });

      await expect(
        debitWallet(
          testUserId,
          30.0,
          "Test Debit",
          "Test note",
          100.0 // Expected balance that will never match
        )
      ).rejects.toThrow(/balance verification failed after/);
    });

    it("should throw error when insufficient balance", async () => {
      // Requirement 9.1: Check sufficient funds
      await expect(
        debitWallet(testUserId, 200.0, "Test Debit", "Test note")
      ).rejects.toThrow("Insufficient wallet balance");
    });

    it("should handle negative debit amounts", async () => {
      // Requirement 9.1: Validate inputs
      await expect(
        debitWallet(testUserId, -30.0, "Invalid Debit", "Test note")
      ).rejects.toThrow("Debit amount is invalid");
    });
  });

  describe("checkWalletConsistency", () => {
    it("should detect consistent wallet balance", async () => {
      // Requirement 9.4: Calculate balance from transaction history
      // Requirement 9.5: Balance should equal sum of all transactions
      vi.mocked(readStore).mockResolvedValue({
        promoCodes: [],
        giftCards: [],
        wallets: {
          [testUserId]: {
            balance: 100.0,
            apiKey: null,
            transactions: [
              {
                id: "txn1",
                userId: testUserId,
                type: "deposit",
                method: "Credit Card",
                amount: 150.0,
                createdAt: "2024-01-01T00:00:00Z",
              },
              {
                id: "txn2",
                userId: testUserId,
                type: "order",
                method: "Order",
                amount: -50.0,
                createdAt: "2024-01-02T00:00:00Z",
              },
            ],
          },
        },
        catalog: [],
        orders: [],
      });

      const result = await checkWalletConsistency(testUserId);

      expect(result.consistent).toBe(true);
      expect(result.currentBalance).toBe(100.0);
      expect(result.calculatedBalance).toBe(100.0); // 150 - 50
      expect(result.difference).toBe(0);
      expect(result.transactionCount).toBe(2);
    });

    it("should detect inconsistent wallet balance", async () => {
      // Requirement 9.4: Calculate balance from transaction history
      // Requirement 9.5: Detect when balance doesn't equal sum
      vi.mocked(readStore).mockResolvedValue({
        promoCodes: [],
        giftCards: [],
        wallets: {
          [testUserId]: {
            balance: 120.0, // Incorrect balance
            apiKey: null,
            transactions: [
              {
                id: "txn1",
                userId: testUserId,
                type: "deposit",
                method: "Credit Card",
                amount: 150.0,
                createdAt: "2024-01-01T00:00:00Z",
              },
              {
                id: "txn2",
                userId: testUserId,
                type: "order",
                method: "Order",
                amount: -50.0,
                createdAt: "2024-01-02T00:00:00Z",
              },
            ],
          },
        },
        catalog: [],
        orders: [],
      });

      const result = await checkWalletConsistency(testUserId);

      expect(result.consistent).toBe(false);
      expect(result.currentBalance).toBe(120.0);
      expect(result.calculatedBalance).toBe(100.0); // 150 - 50
      expect(result.difference).toBe(20.0); // Balance is off by 20
      expect(result.transactionCount).toBe(2);
    });

    it("should handle wallet with no transactions", async () => {
      // Edge case: new wallet with no transactions
      vi.mocked(readStore).mockResolvedValue({
        promoCodes: [],
        giftCards: [],
        wallets: {
          [testUserId]: {
            balance: 0,
            apiKey: null,
            transactions: [],
          },
        },
        catalog: [],
        orders: [],
      });

      const result = await checkWalletConsistency(testUserId);

      expect(result.consistent).toBe(true);
      expect(result.currentBalance).toBe(0);
      expect(result.calculatedBalance).toBe(0);
      expect(result.difference).toBe(0);
      expect(result.transactionCount).toBe(0);
    });

    it("should handle floating-point precision correctly", async () => {
      // Requirement 9.5: Allow small floating-point differences
      vi.mocked(readStore).mockResolvedValue({
        promoCodes: [],
        giftCards: [],
        wallets: {
          [testUserId]: {
            balance: 100.00000001, // Tiny floating-point difference
            apiKey: null,
            transactions: [
              {
                id: "txn1",
                userId: testUserId,
                type: "deposit",
                method: "Credit Card",
                amount: 100.0,
                createdAt: "2024-01-01T00:00:00Z",
              },
            ],
          },
        },
        catalog: [],
        orders: [],
      });

      const result = await checkWalletConsistency(testUserId);

      // Should be considered consistent despite tiny floating-point difference
      expect(result.consistent).toBe(true);
    });
  });

  describe("Concurrent operations simulation", () => {
    it("should handle concurrent credits correctly with optimistic locking", async () => {
      // Simulate race condition scenario
      // Requirement 9.1, 9.2, 9.3: Serialize balance updates
      const initialBalance = 100.0;
      let currentBalance = initialBalance;

      // Mock writeStore to simulate concurrent access
      let writeCount = 0;
      vi.mocked(writeStore).mockImplementation(async (updater) => {
        writeCount++;
        const currentStore = await readStore();
        const newStore = updater(currentStore);

        // Simulate race: second write happens before first completes
        if (writeCount === 1) {
          currentBalance = 120.0; // Another transaction modified balance
        }

        vi.mocked(readStore).mockResolvedValue({
          ...newStore,
          wallets: {
            ...newStore.wallets,
            [testUserId]: {
              ...newStore.wallets[testUserId],
              balance: currentBalance,
            },
          },
        });

        return newStore;
      });

      // First credit should detect race condition and retry
      const result = await creditWallet(
        testUserId,
        50.0,
        "Concurrent Credit",
        "Test note",
        "deposit",
        initialBalance
      );

      // Should successfully complete with retry
      expect(result).toBeGreaterThan(initialBalance);
    });
  });
});
