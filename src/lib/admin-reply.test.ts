import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { replyToTicket } from "./tickets";
import { createServiceSupabase } from "./supabase";
import * as emailService from "./email";

// Mock the supabase module
vi.mock("./supabase", () => ({
  createServiceSupabase: vi.fn(),
}));

// Mock the email module
vi.mock("./email", () => ({
  notifyNewTicket: vi.fn(),
  notifyTicketReply: vi.fn(),
  notifyTicketUpdate: vi.fn(),
}));

/**
 * Test suite for Task 15.2: Admin Reply Interface
 * 
 * Requirements being tested:
 * - 5.5: Prevent replies to closed tickets with clear error message
 * - 6.2: Accept only valid status values
 * - 6.3: Prevent status changes to closed tickets
 * - 6.4: Record updated_at timestamp on status change
 */
describe("Task 15.2: Admin Reply Interface", () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    vi.mocked(createServiceSupabase).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Requirement 5.5: Prevent replies to closed tickets", () => {
    it("should reject reply to closed ticket with error message", async () => {
      const mockClosedTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Closed ticket",
        status: "closed",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockClosedTicket,
        error: null,
      });

      // Attempt to reply to closed ticket
      await expect(
        replyToTicket({
          ticketId: "ticket-uuid",
          body: "Trying to reply to closed ticket",
          authorRole: "agent",
        })
      ).rejects.toThrow("Cannot reply to closed ticket");

      // Verify no message was inserted
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it("should allow agent to reply to open tickets", async () => {
      const mockOpenTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Open ticket",
        status: "open",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockOpenTicket,
        status: "in_progress",
        updated_at: "2024-01-01T01:00:00Z",
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockOpenTicket, error: null })
        .mockResolvedValueOnce({ data: { email: "user@example.com" }, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "Admin response",
        authorRole: "agent",
      });

      expect(result.status).toBe("in_progress");
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          author_role: "agent",
          body: "Admin response",
        })
      );
    });
  });

  describe("Requirement 6.2: Admin status updates", () => {
    it("should allow admin to update ticket status to 'closed'", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Test ticket",
        status: "in_progress",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "closed",
        updated_at: "2024-01-01T02:00:00Z",
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockTicket, error: null })
        .mockResolvedValueOnce({ data: { email: "user@example.com" }, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "Closing ticket as resolved",
        authorRole: "agent",
        newStatus: "closed",
      });

      expect(result.status).toBe("closed");
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "closed",
        })
      );
    });

    it("should allow admin to update status to 'waiting_customer'", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Test ticket",
        status: "in_progress",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "waiting_customer",
        updated_at: "2024-01-01T02:00:00Z",
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockTicket, error: null })
        .mockResolvedValueOnce({ data: { email: "user@example.com" }, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "Need more information from you",
        authorRole: "agent",
        newStatus: "waiting_customer",
      });

      expect(result.status).toBe("waiting_customer");
    });

    it("should allow admin to update status to 'resolved'", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Test ticket",
        status: "in_progress",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "resolved",
        updated_at: "2024-01-01T02:00:00Z",
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockTicket, error: null })
        .mockResolvedValueOnce({ data: { email: "user@example.com" }, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "Issue has been resolved",
        authorRole: "agent",
        newStatus: "resolved",
      });

      expect(result.status).toBe("resolved");
    });
  });

  describe("Requirement 6.3: Prevent status changes to closed tickets", () => {
    it("should prevent changing status of closed ticket", async () => {
      const mockClosedTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Closed ticket",
        status: "closed",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockClosedTicket,
        error: null,
      });

      // Even though we can't add replies, this tests the status change prevention
      // The function will reject at the closed ticket check first
      await expect(
        replyToTicket({
          ticketId: "ticket-uuid",
          body: "Reopening",
          authorRole: "agent",
          newStatus: "open",
        })
      ).rejects.toThrow("Cannot reply to closed ticket");
    });
  });

  describe("Requirement 6.4: Record updated_at timestamp", () => {
    it("should update timestamp when status changes", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Test ticket",
        status: "open",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "in_progress",
        updated_at: "2024-01-01T01:00:00Z",
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockTicket, error: null })
        .mockResolvedValueOnce({ data: { email: "user@example.com" }, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "Agent reply",
        authorRole: "agent",
      });

      // Verify updated_at timestamp was changed
      expect(result.updatedAt).not.toBe(mockTicket.updated_at);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      );
    });

    it("should update timestamp even when status stays the same", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "Test ticket",
        status: "in_progress",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        updated_at: "2024-01-01T02:00:00Z",
      };

      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockTicket, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "Customer reply",
        authorRole: "customer",
      });

      // Verify updated_at timestamp was changed even though status stayed the same
      expect(result.updatedAt).toBe("2024-01-01T02:00:00Z");
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      );
    });
  });

  describe("Automatic status transitions (Requirement 6.1)", () => {
    it("should auto-transition from 'open' to 'in_progress' on first agent reply", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "New ticket",
        status: "open",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "in_progress",
        updated_at: "2024-01-01T01:00:00Z",
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockTicket, error: null })
        .mockResolvedValueOnce({ data: { email: "user@example.com" }, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "First agent reply",
        authorRole: "agent",
      });

      // Verify automatic transition occurred
      expect(result.status).toBe("in_progress");
    });

    it("should not auto-transition if explicit status provided", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        public_id: "TKT123456",
        user_id: "user-uuid",
        category: "order",
        subject: "New ticket",
        status: "open",
        order_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        status: "waiting_customer",
        updated_at: "2024-01-01T01:00:00Z",
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockTicket, error: null })
        .mockResolvedValueOnce({ data: { email: "user@example.com" }, error: null });

      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedTicket, error: null });

      const result = await replyToTicket({
        ticketId: "ticket-uuid",
        body: "Need more info",
        authorRole: "agent",
        newStatus: "waiting_customer",
      });

      // Verify explicit status was used instead of auto-transition
      expect(result.status).toBe("waiting_customer");
    });
  });
});
