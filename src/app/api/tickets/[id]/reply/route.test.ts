/**
 * Tests for /api/tickets/[id]/reply route
 * 
 * Validates:
 * - Authorization (customer ownership, admin access)
 * - Reply creation with appropriate author role
 * - Status updates (admin-only)
 * - Error handling (closed tickets, validation)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import * as ticketsLib from "@/lib/tickets";
import * as supabaseServer from "@/lib/supabase-server";
import * as requireAdmin from "@/lib/require-admin";

// Mock the dependencies
vi.mock("@/lib/tickets");
vi.mock("@/lib/supabase-server");
vi.mock("@/lib/require-admin");

describe("POST /api/tickets/[id]/reply", () => {
  let mockRequest: Request;
  let mockContext: { params: Promise<{ id: string }> };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up default context
    mockContext = {
      params: Promise.resolve({ id: "ticket-uuid" }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Customer Replies", () => {
    beforeEach(() => {
      // Mock as authenticated non-admin user
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
        id: "user-uuid",
        email: "user@example.com",
      } as any);
      vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    });

    it("should allow ticket owner to reply as customer", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "order" as const,
        subject: "Test ticket",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        updatedAt: "2024-01-01T01:00:00Z",
      };

      // Mock getTicket for authorization check
      vi.mocked(ticketsLib.getTicket).mockResolvedValue(mockTicket);
      
      // Mock replyToTicket
      vi.mocked(ticketsLib.replyToTicket).mockResolvedValue(mockUpdatedTicket);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "This is my reply",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket).toEqual(mockUpdatedTicket);
      expect(data.message).toBe("Reply added successfully");

      // Verify replyToTicket was called with correct parameters
      expect(ticketsLib.replyToTicket).toHaveBeenCalledWith({
        ticketId: "ticket-uuid",
        body: "This is my reply",
        authorRole: "customer",
        newStatus: undefined,
      });
    });

    it("should reject reply from non-owner", async () => {
      // Mock getTicket to throw Unauthorized error
      vi.mocked(ticketsLib.getTicket).mockRejectedValue(
        new Error("Unauthorized")
      );

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Trying to reply to someone else's ticket",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You do not have access to this ticket");
    });

    it("should reject empty reply body", async () => {
      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "   ",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Reply message cannot be empty");
    });

    it("should reject status change from non-admin customer", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "order" as const,
        subject: "Test ticket",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(ticketsLib.getTicket).mockResolvedValue(mockTicket);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "My reply",
          newStatus: "closed",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only administrators can change ticket status");
    });

    it("should reject reply to closed ticket", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "order" as const,
        subject: "Test ticket",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(ticketsLib.getTicket).mockResolvedValue(mockTicket);
      vi.mocked(ticketsLib.replyToTicket).mockRejectedValue(
        new Error("Cannot reply to closed ticket")
      );

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Trying to reply to closed ticket",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot reply to closed ticket");
    });

    it("should require authentication for customer replies", async () => {
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(null);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Unauthenticated reply attempt",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("Admin (Agent) Replies", () => {
    beforeEach(() => {
      // Mock as admin user
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
        id: "admin-uuid",
        email: "admin@cheapfollower.shop",
      } as any);
      vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(true);
    });

    it("should allow admin to reply as agent", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "payment" as const,
        subject: "Payment issue",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "in_progress" as const,
        updatedAt: "2024-01-01T01:00:00Z",
      };

      vi.mocked(ticketsLib.replyToTicket).mockResolvedValue(mockUpdatedTicket);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Thank you for contacting us. We're looking into this.",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket).toEqual(mockUpdatedTicket);

      // Verify agent role was used
      expect(ticketsLib.replyToTicket).toHaveBeenCalledWith({
        ticketId: "ticket-uuid",
        body: "Thank you for contacting us. We're looking into this.",
        authorRole: "agent",
        newStatus: undefined,
      });
    });

    it("should allow admin to reply with status update", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "refill" as const,
        subject: "Refill request",
        status: "in_progress" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T01:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "resolved" as const,
        updatedAt: "2024-01-01T02:00:00Z",
      };

      vi.mocked(ticketsLib.replyToTicket).mockResolvedValue(mockUpdatedTicket);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Refill has been processed. Issue resolved.",
          newStatus: "resolved",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket.status).toBe("resolved");

      // Verify status was updated
      expect(ticketsLib.replyToTicket).toHaveBeenCalledWith({
        ticketId: "ticket-uuid",
        body: "Refill has been processed. Issue resolved.",
        authorRole: "agent",
        newStatus: "resolved",
      });
    });

    it("should allow admin to close ticket", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "account" as const,
        subject: "Account question",
        status: "resolved" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T01:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "closed" as const,
        updatedAt: "2024-01-01T02:00:00Z",
      };

      vi.mocked(ticketsLib.replyToTicket).mockResolvedValue(mockUpdatedTicket);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Closing this ticket. Feel free to open a new one if needed.",
          newStatus: "closed",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket.status).toBe("closed");
    });

    it("should allow admin to reply to any ticket regardless of ownership", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "other-user-uuid",
        category: "service" as const,
        subject: "Service inquiry",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "in_progress" as const,
        updatedAt: "2024-01-01T01:00:00Z",
      };

      vi.mocked(ticketsLib.replyToTicket).mockResolvedValue(mockUpdatedTicket);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Admin response to any user's ticket",
        }),
      });

      const response = await POST(mockRequest, mockContext);

      expect(response.status).toBe(200);
      // Admin should NOT call getTicket for authorization - they have full access
      expect(ticketsLib.getTicket).not.toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
        id: "user-uuid",
        email: "user@example.com",
      } as any);
      vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    });

    it("should reject invalid status values", async () => {
      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Reply with invalid status",
          newStatus: "invalid_status",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid status value");
    });

    it("should trim whitespace from reply body", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "other" as const,
        subject: "Test",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        updatedAt: "2024-01-01T01:00:00Z",
      };

      vi.mocked(ticketsLib.getTicket).mockResolvedValue(mockTicket);
      vi.mocked(ticketsLib.replyToTicket).mockResolvedValue(mockUpdatedTicket);

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "   Reply with whitespace   ",
        }),
      });

      const response = await POST(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(ticketsLib.replyToTicket).toHaveBeenCalledWith({
        ticketId: "ticket-uuid",
        body: "Reply with whitespace",
        authorRole: "customer",
        newStatus: undefined,
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
        id: "user-uuid",
        email: "user@example.com",
      } as any);
      vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    });

    it("should handle ticket not found", async () => {
      vi.mocked(ticketsLib.getTicket).mockRejectedValue(
        new Error("Ticket not found")
      );

      mockRequest = new Request("http://localhost/api/tickets/nonexistent/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Reply to nonexistent ticket",
        }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Ticket not found");
    });

    it("should handle database errors gracefully", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "other" as const,
        subject: "Test",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(ticketsLib.getTicket).mockResolvedValue(mockTicket);
      vi.mocked(ticketsLib.replyToTicket).mockRejectedValue(
        new Error("Database connection failed")
      );

      mockRequest = new Request("http://localhost/api/tickets/ticket-uuid/reply", {
        method: "POST",
        body: JSON.stringify({
          body: "Reply that will fail",
        }),
      });

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database connection failed");
    });
  });
});
