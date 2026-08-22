/**
 * Unit tests for /api/admin/tickets endpoint
 * 
 * Tests Requirements: 8.3, 8.4, 15.3, 15.4
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import * as requireAdmin from "@/lib/require-admin";
import * as supabase from "@/lib/supabase";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/require-admin");
vi.mock("@/lib/supabase");
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data, options) => ({ data, options })),
    },
  };
});

describe("GET /api/admin/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should require admin authentication", async () => {
    // Requirement 8.3, 8.4: Admin authentication required
    const adminError = NextResponse.json(
      { error: "Admin login required" },
      { status: 401 }
    );
    vi.mocked(requireAdmin.requireAdminApi).mockResolvedValue(adminError as any);

    const req = new Request("http://localhost/api/admin/tickets");
    const result = await GET(req);

    expect(requireAdmin.requireAdminApi).toHaveBeenCalled();
    expect(result).toBe(adminError);
  });

  it("should fetch all tickets with user emails for admins", async () => {
    // Requirement 8.3: Admins can list all tickets
    // Requirement 15.3: Display user email
    vi.mocked(requireAdmin.requireAdminApi).mockResolvedValue(null);

    const mockTicketsData = [
      {
        id: "ticket-1",
        public_id: "TKT123456",
        user_id: "user-1",
        category: "order",
        subject: "Test ticket 1",
        status: "open",
        order_id: "CF123456",
        created_at: "2025-01-01T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z",
        profiles: { email: "user1@example.com" },
        guest_email: null,
      },
      {
        id: "ticket-2",
        public_id: "TKT123457",
        user_id: null,
        category: "payment",
        subject: "Test ticket 2",
        status: "in_progress",
        order_id: null,
        created_at: "2025-01-02T10:00:00Z",
        updated_at: "2025-01-02T10:00:00Z",
        profiles: null,
        guest_email: "guest@example.com",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockTicketsData,
        error: null,
      }),
    };

    vi.mocked(supabase.createServiceSupabase).mockReturnValue(mockSupabase as any);

    const req = new Request("http://localhost/api/admin/tickets");
    const result = await GET(req);

    expect(supabase.createServiceSupabase).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith("tickets");
    expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining("profiles:user_id"));
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: false });

    expect(result.data.tickets).toHaveLength(2);
    expect(result.data.tickets[0]).toEqual({
      id: "ticket-1",
      publicId: "TKT123456",
      userId: "user-1",
      category: "order",
      subject: "Test ticket 1",
      status: "open",
      orderId: "CF123456",
      createdAt: "2025-01-01T10:00:00Z",
      updatedAt: "2025-01-01T10:00:00Z",
      userEmail: "user1@example.com",
    });
    expect(result.data.tickets[1].userEmail).toBe("guest@example.com");
  });

  it("should support pagination parameters", async () => {
    vi.mocked(requireAdmin.requireAdminApi).mockResolvedValue(null);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    vi.mocked(supabase.createServiceSupabase).mockReturnValue(mockSupabase as any);

    const req = new Request("http://localhost/api/admin/tickets?limit=50&offset=20");
    await GET(req);

    expect(mockSupabase.range).toHaveBeenCalledWith(20, 69); // offset to offset + limit - 1
  });

  it("should enforce maximum limit of 500", async () => {
    vi.mocked(requireAdmin.requireAdminApi).mockResolvedValue(null);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    vi.mocked(supabase.createServiceSupabase).mockReturnValue(mockSupabase as any);

    const req = new Request("http://localhost/api/admin/tickets?limit=1000");
    await GET(req);

    // Should cap at 500
    expect(mockSupabase.range).toHaveBeenCalledWith(0, 499);
  });

  it("should handle database errors gracefully", async () => {
    vi.mocked(requireAdmin.requireAdminApi).mockResolvedValue(null);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      }),
    };

    vi.mocked(supabase.createServiceSupabase).mockReturnValue(mockSupabase as any);

    const req = new Request("http://localhost/api/admin/tickets");
    const result = await GET(req);

    expect(result.data.error).toBe("Failed to fetch tickets");
    expect(result.options.status).toBe(500);
  });

  it("should return error if database not configured", async () => {
    vi.mocked(requireAdmin.requireAdminApi).mockResolvedValue(null);
    vi.mocked(supabase.createServiceSupabase).mockReturnValue(null);

    const req = new Request("http://localhost/api/admin/tickets");
    const result = await GET(req);

    expect(result.data.error).toBe("Database not configured");
    expect(result.options.status).toBe(500);
  });
});
