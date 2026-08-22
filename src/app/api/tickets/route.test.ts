/**
 * Tests for /api/tickets route
 * 
 * Validates:
 * - GET: List tickets for authenticated users
 * - POST: Create new tickets (both authenticated and guest)
 * 
 * Task 17.1: Guest ticket creation flow
 * Requirements: 4.1-4.7, 9.1-9.4, 14.1-14.3, 15.1-15.2
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import * as ticketsLib from "@/lib/tickets";
import * as supabaseServer from "@/lib/supabase-server";

vi.mock("@/lib/tickets", () => ({
  validateTicketInput: vi.fn((input) => {
    const errors: string[] = [];
    
    // Validate subject
    const subject = input.subject?.trim() || "";
    if (subject.length === 0) {
      errors.push("Subject is required");
    }
    
    // Validate body
    const body = input.body?.trim() || "";
    if (body.length === 0) {
      errors.push("Message body is required");
    } else if (body.length > 5000) {
      errors.push("Message body cannot exceed 5000 characters");
    }
    
    // Validate category
    const validCategories = ["order", "payment", "refill", "account", "api", "service", "other"];
    if (!input.category) {
      errors.push("Category is required");
    } else if (!validCategories.includes(input.category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(", ")}`);
    }
    
    // Validate authentication (either userId or guestEmail must be provided)
    if (!input.userId && !input.guestEmail) {
      errors.push("Either userId or guestEmail must be provided");
    }
    
    // Validate email format if guestEmail is provided
    if (input.guestEmail) {
      const emailTrimmed = input.guestEmail.trim();
      // If after trimming it's empty, it should be caught by the authentication check above
      if (emailTrimmed.length > 0) {
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!EMAIL_REGEX.test(emailTrimmed)) {
          errors.push("Please enter a valid email address");
        }
      } else {
        // Whitespace-only email should be treated as missing
        if (!input.userId) {
          // Replace the generic error with a more specific one
          const index = errors.indexOf("Either userId or guestEmail must be provided");
          if (index === -1) {
            errors.push("Either userId or guestEmail must be provided");
          }
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }),
  createTicket: vi.fn(),
  listTicketsForUser: vi.fn(),
}));
vi.mock("@/lib/supabase-server");
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10, resetAt: Date.now() + 3600000, retryAfter: 0 })),
  RateLimitConfigs: {
    TICKET_CREATION: { maxRequests: 10, windowMs: 3600000 },
  },
  getRateLimitIdentifier: vi.fn((userId, ip) => userId || ip),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

describe("GET /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list tickets for authenticated user", async () => {
    const mockUser = { id: "user-uuid", email: "user@example.com" };
    const mockTickets = [
      {
        id: "ticket-1",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "order" as const,
        subject: "Test ticket",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
    vi.mocked(ticketsLib.listTicketsForUser).mockResolvedValue(mockTickets);

    const req = new Request("http://localhost/api/tickets");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tickets).toEqual(mockTickets);
    expect(ticketsLib.listTicketsForUser).toHaveBeenCalledWith("user-uuid", false, 50, 0);
  });

  it("should return empty list for unauthenticated users", async () => {
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/tickets");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tickets).toEqual([]);
  });

  it("should handle pagination parameters", async () => {
    const mockUser = { id: "user-uuid", email: "user@example.com" };
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
    vi.mocked(ticketsLib.listTicketsForUser).mockResolvedValue([]);

    const req = new Request("http://localhost/api/tickets?limit=20&offset=10");
    await GET(req);

    expect(ticketsLib.listTicketsForUser).toHaveBeenCalledWith("user-uuid", false, 20, 10);
  });

  it("should cap limit at 100", async () => {
    const mockUser = { id: "user-uuid", email: "user@example.com" };
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
    vi.mocked(ticketsLib.listTicketsForUser).mockResolvedValue([]);

    const req = new Request("http://localhost/api/tickets?limit=200");
    await GET(req);

    expect(ticketsLib.listTicketsForUser).toHaveBeenCalledWith("user-uuid", false, 100, 0);
  });

  it("should handle database errors", async () => {
    const mockUser = { id: "user-uuid", email: "user@example.com" };
    vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
    vi.mocked(ticketsLib.listTicketsForUser).mockRejectedValue(
      new Error("Database connection failed")
    );

    const req = new Request("http://localhost/api/tickets");
    const response = await GET(req);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Database connection failed");
  });
});

describe("POST /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authenticated user tickets", () => {
    it("should create ticket for authenticated user", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT123456",
        userId: "user-uuid",
        category: "order" as const,
        subject: "Order issue",
        status: "open" as const,
        orderId: "CF789012",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(ticketsLib.createTicket).mockResolvedValue(mockTicket);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "order",
          subject: "Order issue",
          body: "My order hasn't been delivered",
          orderId: "CF789012",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.ticket).toEqual(mockTicket);
      expect(ticketsLib.createTicket).toHaveBeenCalledWith({
        userId: "user-uuid",
        guestEmail: undefined,
        category: "order",
        subject: "Order issue",
        body: "My order hasn't been delivered",
        orderId: "CF789012",
      });
    });
  });

  describe("Guest user tickets (Task 17.1)", () => {
    it("should create guest ticket with email address (Req 9.1, 9.2)", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT654321",
        userId: null,
        category: "payment" as const,
        subject: "Payment issue",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(null);
      vi.mocked(ticketsLib.createTicket).mockResolvedValue(mockTicket);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "payment",
          subject: "Payment issue",
          body: "Cannot process my payment",
          guestEmail: "guest@example.com",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.ticket.userId).toBeNull();
      expect(ticketsLib.createTicket).toHaveBeenCalledWith({
        userId: undefined,
        guestEmail: "guest@example.com",
        category: "payment",
        subject: "Payment issue",
        body: "Cannot process my payment",
        orderId: undefined,
      });
    });

    it("should reject guest ticket without email (Req 9.1)", async () => {
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "other",
          subject: "Question",
          body: "I have a question",
          // Missing guestEmail
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Either userId or guestEmail must be provided");
      expect(ticketsLib.createTicket).not.toHaveBeenCalled();
    });

    it("should reject guest ticket with empty email", async () => {
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "account",
          subject: "Account help",
          body: "Need help with account",
          guestEmail: "   ", // Whitespace only
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Either userId or guestEmail must be provided");
    });

    it("should trim guest email before creating ticket", async () => {
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT111111",
        userId: null,
        category: "refill" as const,
        subject: "Refill request",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(null);
      vi.mocked(ticketsLib.createTicket).mockResolvedValue(mockTicket);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "refill",
          subject: "Refill request",
          body: "Need refill for order",
          guestEmail: "  guest@example.com  ", // With whitespace
        }),
      });

      await POST(req);

      expect(ticketsLib.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          guestEmail: "guest@example.com", // Trimmed
        })
      );
    });

    it("should not include guestEmail for authenticated users", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT222222",
        userId: "user-uuid",
        category: "service" as const,
        subject: "Service request",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(ticketsLib.createTicket).mockResolvedValue(mockTicket);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "service",
          subject: "Service request",
          body: "I need a new service",
          guestEmail: "ignored@example.com", // Should be ignored for auth users
        }),
      });

      await POST(req);

      expect(ticketsLib.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-uuid",
          guestEmail: undefined, // Not passed for authenticated users
        })
      );
    });
  });

  describe("Validation (Requirements 4.1, 4.2, 4.3, 14.1, 14.2)", () => {
    it("should reject ticket without category", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: "Test",
          body: "Test body",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Category is required");
    });

    it("should reject ticket without subject", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "order",
          body: "Test body",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Subject is required");
    });

    it("should reject ticket with empty subject", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "order",
          subject: "   ", // Whitespace only
          body: "Test body",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Subject is required");
    });

    it("should reject ticket without body", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "payment",
          subject: "Test subject",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Message body is required");
    });

    it("should reject ticket with empty body", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "api",
          subject: "API issue",
          body: "   ", // Whitespace only
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Message body is required");
    });

    it("should trim subject and body before creating ticket", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT333333",
        userId: "user-uuid",
        category: "other" as const,
        subject: "Trimmed subject",
        status: "open" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(ticketsLib.createTicket).mockResolvedValue(mockTicket);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "other",
          subject: "  Trimmed subject  ",
          body: "  Trimmed body  ",
        }),
      });

      await POST(req);

      expect(ticketsLib.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Trimmed subject",
          body: "Trimmed body",
        })
      );
    });
  });

  describe("Order association (Requirement 4.7)", () => {
    it("should include order ID when provided", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      const mockTicket = {
        id: "ticket-uuid",
        publicId: "TKT444444",
        userId: "user-uuid",
        category: "order" as const,
        subject: "Order issue",
        status: "open" as const,
        orderId: "CF123456",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(ticketsLib.createTicket).mockResolvedValue(mockTicket);

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "order",
          subject: "Order issue",
          body: "Problem with my order",
          orderId: "CF123456",
        }),
      });

      await POST(req);

      expect(ticketsLib.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "CF123456",
        })
      );
    });

    it("should handle invalid order ID gracefully", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(ticketsLib.createTicket).mockRejectedValue(
        new Error("Order not found. Please verify the order ID.")
      );

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "order",
          subject: "Order issue",
          body: "Problem with order",
          orderId: "INVALID",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Order not found. Please verify the order ID.");
    });
  });

  describe("Error handling", () => {
    it("should handle database errors with 500 status", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(ticketsLib.createTicket).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "other",
          subject: "Test",
          body: "Test body",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Database connection failed");
    });

    it("should handle generic errors", async () => {
      const mockUser = { id: "user-uuid", email: "user@example.com" };
      vi.mocked(supabaseServer.getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(ticketsLib.createTicket).mockRejectedValue(
        "Unexpected error" // Non-Error object
      );

      const req = new Request("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "service",
          subject: "Service request",
          body: "New service",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to create ticket");
    });
  });
});
