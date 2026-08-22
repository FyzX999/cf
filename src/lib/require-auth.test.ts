import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, verifyOrderOwnership } from "./require-auth";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("./supabase-server", () => ({
  getAuthUser: vi.fn(),
}));

vi.mock("./require-admin", () => ({
  isAdminRequest: vi.fn(),
}));

vi.mock("./supabase", () => ({
  createServiceSupabase: vi.fn(),
}));

import { getAuthUser } from "./supabase-server";
import { isAdminRequest } from "./require-admin";
import { createServiceSupabase } from "./supabase";

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication checks (Requirements 6.1, 6.2)", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(null);
      vi.mocked(isAdminRequest).mockResolvedValue(false);

      const result = await requireAuth();

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(401);
        const body = await result.json();
        expect(body.error).toBe("Authentication required");
      }
    });

    it("should return AuthResult when user is authenticated without ownership check", async () => {
      const mockUser = { id: "user-123" };
      vi.mocked(getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(isAdminRequest).mockResolvedValue(false);

      const result = await requireAuth();

      expect(result).not.toBeInstanceOf(NextResponse);
      if (!(result instanceof NextResponse)) {
        expect(result.user.id).toBe("user-123");
        expect(result.isAdmin).toBe(false);
      }
    });
  });

  describe("Authorization checks (Requirements 6.3, 6.4)", () => {
    it("should return 403 when user is authenticated but not the owner", async () => {
      const mockUser = { id: "user-123" };
      vi.mocked(getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(isAdminRequest).mockResolvedValue(false);

      const verifyOwnership = vi.fn().mockResolvedValue(false);

      const result = await requireAuth({
        allowAdmin: true,
        verifyOwnership,
      });

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
        const body = await result.json();
        expect(body.error).toBe("Unauthorized");
      }
      expect(verifyOwnership).toHaveBeenCalledWith("user-123");
    });

    it("should return AuthResult when user is the owner", async () => {
      const mockUser = { id: "user-123" };
      vi.mocked(getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(isAdminRequest).mockResolvedValue(false);

      const verifyOwnership = vi.fn().mockResolvedValue(true);

      const result = await requireAuth({
        allowAdmin: true,
        verifyOwnership,
      });

      expect(result).not.toBeInstanceOf(NextResponse);
      if (!(result instanceof NextResponse)) {
        expect(result.user.id).toBe("user-123");
        expect(result.isAdmin).toBe(false);
      }
      expect(verifyOwnership).toHaveBeenCalledWith("user-123");
    });

    it("should bypass ownership check when user is admin", async () => {
      const mockUser = { id: "admin-123" };
      vi.mocked(getAuthUser).mockResolvedValue(mockUser);
      vi.mocked(isAdminRequest).mockResolvedValue(true);

      const verifyOwnership = vi.fn().mockResolvedValue(false);

      const result = await requireAuth({
        allowAdmin: true,
        verifyOwnership,
      });

      expect(result).not.toBeInstanceOf(NextResponse);
      if (!(result instanceof NextResponse)) {
        expect(result.user.id).toBe("admin-123");
        expect(result.isAdmin).toBe(true);
      }
      // Ownership check should be skipped for admins
      expect(verifyOwnership).not.toHaveBeenCalled();
    });
  });

  describe("verifyOrderOwnership helper", () => {
    it("should return true when user owns the order", async () => {
      const mockDb = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { user_id: "user-123" },
              }),
            }),
          }),
        }),
      };
      vi.mocked(createServiceSupabase).mockReturnValue(mockDb as any);

      const result = await verifyOrderOwnership("CF123456", "user-123");

      expect(result).toBe(true);
    });

    it("should return false when user does not own the order", async () => {
      const mockDb = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { user_id: "user-456" },
              }),
            }),
          }),
        }),
      };
      vi.mocked(createServiceSupabase).mockReturnValue(mockDb as any);

      const result = await verifyOrderOwnership("CF123456", "user-123");

      expect(result).toBe(false);
    });

    it("should return false when database is not configured", async () => {
      vi.mocked(createServiceSupabase).mockReturnValue(null);

      const result = await verifyOrderOwnership("CF123456", "user-123");

      expect(result).toBe(false);
    });

    it("should return false when order is not found", async () => {
      const mockDb = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createServiceSupabase).mockReturnValue(mockDb as any);

      const result = await verifyOrderOwnership("CF999999", "user-123");

      expect(result).toBe(false);
    });
  });
});
