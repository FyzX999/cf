import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import * as ticketLib from "@/lib/tickets";
import * as supabaseServer from "@/lib/supabase-server";
import * as requireAdmin from "@/lib/require-admin";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/tickets");
vi.mock("@/lib/supabase-server");
vi.mock("@/lib/require-admin");

describe("GET /api/tickets/[id]", () => {
  const mockTicket = {
    id: "ticket-123",
    publicId: "TKT123456",
    userId: "user-123",
    category: "order" as const,
    subject: "Test Ticket",
    status: "open" as const,
    orderId: "CF123456",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockMessages = [
    {
      id: "msg-1",
      ticketId: "ticket-123",
      authorRole: "customer" as const,
      body: "Initial message",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "msg-2",
      ticketId: "ticket-123",
      authorRole: "agent" as const,
      body: "Reply message",
      createdAt: "2024-01-01T01:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ticket details with messages for owner (Req 8.2)", async () => {
    // Mock authenticated user who owns the ticket
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
    } as any);
    vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    vi.mocked(ticketLib.getTicket).mockResolvedValue(mockTicket);
    vi.mocked(ticketLib.listTicketMessages).mockResolvedValue(mockMessages);

    const req = new Request("http://localhost/api/tickets/ticket-123");
    const ctx = { params: Promise.resolve({ id: "ticket-123" }) };

    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ticket).toEqual(mockTicket);
    expect(data.messages).toEqual(mockMessages);
    expect(ticketLib.getTicket).toHaveBeenCalledWith("ticket-123", "user-123", false);
    expect(ticketLib.listTicketMessages).toHaveBeenCalledWith("ticket-123");
  });

  it("should return ticket details with messages for admin (Req 8.3)", async () => {
    // Mock admin user
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
      id: "admin-123",
      email: "admin@example.com",
    } as any);
    vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(true);
    vi.mocked(ticketLib.getTicket).mockResolvedValue(mockTicket);
    vi.mocked(ticketLib.listTicketMessages).mockResolvedValue(mockMessages);

    const req = new Request("http://localhost/api/tickets/ticket-123");
    const ctx = { params: Promise.resolve({ id: "ticket-123" }) };

    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ticket).toEqual(mockTicket);
    expect(data.messages).toEqual(mockMessages);
    // Admin should be able to view any ticket
    expect(ticketLib.getTicket).toHaveBeenCalledWith("ticket-123", "admin-123", true);
  });

  it("should return 401 for unauthenticated non-admin users (Req 8.2)", async () => {
    // Mock no user and not admin
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(null);
    vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);

    const req = new Request("http://localhost/api/tickets/ticket-123");
    const ctx = { params: Promise.resolve({ id: "ticket-123" }) };

    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
    expect(ticketLib.getTicket).not.toHaveBeenCalled();
  });

  it("should return 403 when user tries to access another user's ticket (Req 8.2)", async () => {
    // Mock authenticated user who does not own the ticket
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
      id: "user-456",
      email: "other@example.com",
    } as any);
    vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    vi.mocked(ticketLib.getTicket).mockRejectedValue(new Error("Unauthorized"));

    const req = new Request("http://localhost/api/tickets/ticket-123");
    const ctx = { params: Promise.resolve({ id: "ticket-123" }) };

    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this ticket");
  });

  it("should return 404 when ticket does not exist", async () => {
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
    } as any);
    vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    vi.mocked(ticketLib.getTicket).mockRejectedValue(new Error("Ticket not found"));

    const req = new Request("http://localhost/api/tickets/nonexistent");
    const ctx = { params: Promise.resolve({ id: "nonexistent" }) };

    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Ticket not found");
  });

  it("should return messages in chronological order (Req 8.4)", async () => {
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
    } as any);
    vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    vi.mocked(ticketLib.getTicket).mockResolvedValue(mockTicket);
    vi.mocked(ticketLib.listTicketMessages).mockResolvedValue(mockMessages);

    const req = new Request("http://localhost/api/tickets/ticket-123");
    const ctx = { params: Promise.resolve({ id: "ticket-123" }) };

    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.messages).toHaveLength(2);
    // Verify messages are in chronological order
    expect(data.messages[0].createdAt).toBe("2024-01-01T00:00:00Z");
    expect(data.messages[1].createdAt).toBe("2024-01-01T01:00:00Z");
  });

  it("should handle database errors gracefully", async () => {
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
    } as any);
    vi.mocked(requireAdmin.isAdminRequest).mockResolvedValue(false);
    vi.mocked(ticketLib.getTicket).mockRejectedValue(
      new Error("Database connection failed")
    );

    const req = new Request("http://localhost/api/tickets/ticket-123");
    const ctx = { params: Promise.resolve({ id: "ticket-123" }) };

    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });
});
