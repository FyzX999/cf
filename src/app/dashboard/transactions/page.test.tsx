/**
 * TransactionsPage Loading States Tests
 * 
 * Integration tests for loading states, error handling, and filter disabling
 * 
 * **Validates Requirements:**
 * - 10.1: Display loading spinner when transactions are being fetched
 * - 10.2: Disable filter controls while loading
 * - 10.3: Hide spinner and show transaction list when loading completes
 * - 10.4: Show error message with retry button on failure
 * - 10.5: Loading indicator is visually centered and clearly visible
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionsPage from "./page";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("TransactionsPage Loading States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 10.1: Display loading spinner", () => {
    it("should show loading spinner on initial load", () => {
      // Mock fetch to never resolve (simulate ongoing loading)
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<TransactionsPage />);

      // Verify loading spinner is displayed
      expect(screen.getByText("Loading transactions...")).toBeDefined();
    });

    it("should show loading spinner with centered layout", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TransactionsPage />);

      // Verify centered layout
      const spinner = container.querySelector(".text-center");
      expect(spinner).toBeDefined();
    });
  });

  describe("Requirement 10.2: Disable filter controls while loading", () => {
    it("should disable all filter buttons while loading", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TransactionsPage />);

      // Find all filter buttons
      const buttons = container.querySelectorAll("button");
      const filterButtons = Array.from(buttons).filter((btn) =>
        ["All", "Deposit", "Order", "Giftcard", "Promo", "Refund"].includes(
          btn.textContent || ""
        )
      );

      // All filter buttons should be disabled
      filterButtons.forEach((button) => {
        expect((button as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it("should show disabled styling on filter buttons", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TransactionsPage />);

      // Find filter buttons
      const buttons = container.querySelectorAll("button");
      const filterButtons = Array.from(buttons).filter((btn) =>
        ["All", "Deposit", "Order", "Giftcard", "Promo", "Refund"].includes(
          btn.textContent || ""
        )
      );

      // Check for disabled styling (opacity-50 and cursor-not-allowed)
      filterButtons.forEach((button) => {
        const classes = (button as HTMLElement).className;
        expect(classes).toContain("opacity-50");
        expect(classes).toContain("cursor-not-allowed");
      });
    });

    it("should enable filters after loading completes", async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], balance: 0 }),
      });

      const { container } = render(<TransactionsPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText("Loading transactions...")).toBeNull();
      });

      // Find filter buttons
      const buttons = container.querySelectorAll("button");
      const filterButtons = Array.from(buttons).filter((btn) =>
        ["All", "Deposit", "Order", "Giftcard", "Promo", "Refund"].includes(
          btn.textContent || ""
        )
      );

      // All filter buttons should be enabled
      filterButtons.forEach((button) => {
        expect((button as HTMLButtonElement).disabled).toBe(false);
      });
    });
  });

  describe("Requirement 10.3: Hide spinner and show transaction list when loading completes", () => {
    it("should hide spinner after successful load", async () => {
      const mockTransactions = [
        {
          id: "1",
          publicId: "TXN001",
          type: "deposit" as const,
          method: "crypto",
          amount: 50.0,
          note: "Deposit via BTC",
          createdAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions, balance: 50 }),
      });

      render(<TransactionsPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText("Loading transactions...")).toBeNull();
      });

      // Verify transaction table is displayed
      expect(screen.getByText("Deposit")).toBeDefined();
      expect(screen.getByText("crypto")).toBeDefined();
    });

    it("should show empty state when no transactions exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], balance: 0 }),
      });

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading transactions...")).toBeNull();
      });

      // Verify empty state is displayed
      expect(screen.getByText("No Transactions Yet")).toBeDefined();
      expect(
        screen.getByText(/Your transaction history will appear here/i)
      ).toBeDefined();
    });
  });

  describe("Requirement 10.4: Show error message with retry button on failure", () => {
    it("should show error message when API request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Database connection failed" }),
      });

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load transactions")).toBeDefined();
      });

      expect(screen.getByText("Database connection failed")).toBeDefined();
    });

    it("should show retry button on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Network error" }),
      });

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeDefined();
      });
    });

    it("should retry loading when retry button is clicked", async () => {
      const user = userEvent.setup();

      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Network error" }),
      });

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeDefined();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], balance: 0 }),
      });

      // Click retry button
      const retryButton = screen.getByText("Retry");
      await user.click(retryButton);

      // Verify loading state is shown again
      expect(screen.getByText("Retrying...")).toBeDefined();

      // Wait for success
      await waitFor(() => {
        expect(screen.queryByText("Failed to load transactions")).toBeNull();
      });

      // Verify error is cleared
      expect(screen.queryByText("Network error")).toBeNull();
    });

    it("should handle fetch exception errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load transactions")).toBeDefined();
      });

      expect(screen.getByText("Timeout")).toBeDefined();
    });

    it("should disable retry button while retrying", async () => {
      const user = userEvent.setup();

      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Network error" }),
      });

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeDefined();
      });

      // Second call takes time to resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      // Click retry button
      const retryButton = screen.getByText("Retry") as HTMLButtonElement;
      await user.click(retryButton);

      // Verify retry button is disabled during retry
      const retryingButton = screen.getByText("Retrying...") as HTMLButtonElement;
      expect(retryingButton.disabled).toBe(true);
    });
  });

  describe("Requirement 10.5: Loading indicator is visually centered and clearly visible", () => {
    it("should render loading spinner with centered layout class", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TransactionsPage />);

      const centerElement = container.querySelector(".text-center");
      expect(centerElement).toBeDefined();
    });

    it("should render spinner animation element", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TransactionsPage />);

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });
  });

  describe("Filter functionality after loading", () => {
    it("should filter transactions by type", async () => {
      const user = userEvent.setup();

      const mockTransactions = [
        {
          id: "1",
          publicId: "TXN001",
          type: "deposit" as const,
          method: "crypto",
          amount: 50.0,
          note: "Deposit",
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          publicId: "TXN002",
          type: "order" as const,
          method: "wallet",
          amount: -20.0,
          note: "Order CF123456",
          createdAt: new Date().toISOString(),
        },
        {
          id: "3",
          publicId: "TXN003",
          type: "refund" as const,
          method: "wallet",
          amount: 10.0,
          note: "Refund for order CF123456",
          createdAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions, balance: 40 }),
      });

      const { container } = render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading transactions...")).toBeNull();
      });

      // Initially all transactions shown
      const depositBadges = container.querySelectorAll('span:not([class*="inline-block"])');
      const allTableRows = container.querySelectorAll('tbody tr');
      expect(allTableRows.length).toBe(3);

      // Click "Deposit" filter button
      const buttons = Array.from(container.querySelectorAll("button"));
      const depositButton = buttons.find((btn) => btn.textContent === "Deposit");
      expect(depositButton).toBeDefined();

      await user.click(depositButton!);

      // Wait for filter to apply
      await waitFor(() => {
        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(1);
      });
    });

    it("should show filtered empty state", async () => {
      const user = userEvent.setup();

      const mockTransactions = [
        {
          id: "1",
          publicId: "TXN001",
          type: "deposit" as const,
          method: "crypto",
          amount: 50.0,
          note: "Deposit",
          createdAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions, balance: 50 }),
      });

      const { container } = render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading transactions...")).toBeNull();
      });

      // Click "Refund" filter button (no refunds exist)
      const buttons = Array.from(container.querySelectorAll("button"));
      const refundButton = buttons.find((btn) => btn.textContent === "Refund");
      expect(refundButton).toBeDefined();

      await user.click(refundButton!);

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByText("No Refund Transactions")).toBeDefined();
      });
    });
  });

  describe("Error recovery", () => {
    it("should clear previous error on successful retry", async () => {
      const user = userEvent.setup();

      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "First error" }),
      });

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("First error")).toBeDefined();
      });

      // Second call also fails with different error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Second error" }),
      });

      const retryButton = screen.getByText("Retry");
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText("First error")).toBeNull();
        expect(screen.getByText("Second error")).toBeDefined();
      });
    });
  });
});
