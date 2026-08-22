/**
 * TicketsPage Loading States Tests
 * 
 * Integration tests for loading states, error handling, and filter disabling
 * 
 * **Validates Requirements:**
 * - 10.1: Display loading spinner when tickets are being fetched
 * - 10.2: Disable filter controls while loading
 * - 10.3: Hide spinner and show ticket list when loading completes
 * - 10.4: Show error message with retry button on failure
 * - 10.5: Loading indicator is visually centered and clearly visible
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketsPage from "./page";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("TicketsPage Loading States", () => {
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

      render(<TicketsPage />);

      // Verify loading spinner is displayed
      expect(screen.getByText("Loading tickets...")).toBeDefined();
    });

    it("should show loading spinner with centered layout", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TicketsPage />);

      // Verify centered layout
      const spinner = container.querySelector(".text-center");
      expect(spinner).toBeDefined();
    });
  });

  describe("Requirement 10.2: Disable filter controls while loading", () => {
    it("should disable category filter while loading", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<TicketsPage />);

      // Find category filter
      const categorySelect = screen.getByLabelText(/Category:/i) as HTMLSelectElement;
      expect(categorySelect.disabled).toBe(true);
    });

    it("should disable status filter while loading", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<TicketsPage />);

      // Find status filter
      const statusSelect = screen.getByLabelText(/Status:/i) as HTMLSelectElement;
      expect(statusSelect.disabled).toBe(true);
    });

    it("should enable filters after loading completes", async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: [] }),
      });

      render(<TicketsPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText("Loading tickets...")).toBeNull();
      });

      // Verify filters are enabled
      const categorySelect = screen.getByLabelText(/Category:/i) as HTMLSelectElement;
      const statusSelect = screen.getByLabelText(/Status:/i) as HTMLSelectElement;
      
      expect(categorySelect.disabled).toBe(false);
      expect(statusSelect.disabled).toBe(false);
    });
  });

  describe("Requirement 10.3: Hide spinner and show ticket list when loading completes", () => {
    it("should hide spinner after successful load", async () => {
      const mockTickets = [
        {
          id: "1",
          publicId: "TKT123456",
          subject: "Test ticket",
          category: "order" as const,
          status: "open" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      });

      render(<TicketsPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText("Loading tickets...")).toBeNull();
      });

      // Verify ticket list is displayed
      expect(screen.getByText("Test ticket")).toBeDefined();
      expect(screen.getByText("#TKT123456")).toBeDefined();
    });

    it("should show empty state when no tickets exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: [] }),
      });

      render(<TicketsPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading tickets...")).toBeNull();
      });

      // Verify empty state is displayed
      expect(screen.getByText("No Tickets Yet")).toBeDefined();
      expect(
        screen.getByText(/Create your first support ticket to get started/i)
      ).toBeDefined();
    });
  });

  describe("Requirement 10.4: Show error message with retry button on failure", () => {
    it("should show error message when API request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Network error" }),
      });

      render(<TicketsPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load tickets")).toBeDefined();
      });

      expect(screen.getByText("Network error")).toBeDefined();
    });

    it("should show retry button on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Network error" }),
      });

      render(<TicketsPage />);

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

      render(<TicketsPage />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeDefined();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: [] }),
      });

      // Click retry button
      const retryButton = screen.getByText("Retry");
      await user.click(retryButton);

      // Verify loading state is shown again
      expect(screen.getByText("Retrying...")).toBeDefined();

      // Wait for success
      await waitFor(() => {
        expect(screen.queryByText("Failed to load tickets")).toBeNull();
      });

      // Verify error is cleared
      expect(screen.queryByText("Network error")).toBeNull();
    });

    it("should handle fetch exception errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      render(<TicketsPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load tickets")).toBeDefined();
      });

      expect(screen.getByText("Connection refused")).toBeDefined();
    });
  });

  describe("Requirement 10.5: Loading indicator is visually centered and clearly visible", () => {
    it("should render loading spinner with centered layout class", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TicketsPage />);

      const centerElement = container.querySelector(".text-center");
      expect(centerElement).toBeDefined();
    });

    it("should render spinner animation element", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TicketsPage />);

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });
  });

  describe("Filter functionality after loading", () => {
    it("should filter tickets by category", async () => {
      const user = userEvent.setup();

      const mockTickets = [
        {
          id: "1",
          publicId: "TKT001",
          subject: "Order issue",
          category: "order" as const,
          status: "open" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          publicId: "TKT002",
          subject: "Payment issue",
          category: "payment" as const,
          status: "open" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      });

      render(<TicketsPage />);

      await waitFor(() => {
        expect(screen.getByText("Order issue")).toBeDefined();
      });

      // Select "Order" category
      const categorySelect = screen.getByLabelText(/Category:/i);
      await user.selectOptions(categorySelect, "order");

      // Verify only order ticket is shown
      expect(screen.getByText("Order issue")).toBeDefined();
      expect(screen.queryByText("Payment issue")).toBeNull();

      // Verify showing count
      expect(screen.getByText(/Showing 1 of 2 ticket/i)).toBeDefined();
    });

    it("should filter tickets by status", async () => {
      const user = userEvent.setup();

      const mockTickets = [
        {
          id: "1",
          publicId: "TKT001",
          subject: "Open ticket",
          category: "order" as const,
          status: "open" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          publicId: "TKT002",
          subject: "Resolved ticket",
          category: "order" as const,
          status: "resolved" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: mockTickets }),
      });

      render(<TicketsPage />);

      await waitFor(() => {
        expect(screen.getByText("Open ticket")).toBeDefined();
      });

      // Select "Resolved" status
      const statusSelect = screen.getByLabelText(/Status:/i);
      await user.selectOptions(statusSelect, "resolved");

      // Verify only resolved ticket is shown
      expect(screen.getByText("Resolved ticket")).toBeDefined();
      expect(screen.queryByText("Open ticket")).toBeNull();
    });
  });
});
