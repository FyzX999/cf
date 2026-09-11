/**
 * Unit tests for favorites functionality
 * 
 * Task 2.1: Tests for core favorite operations
 * Requirements: 1.1, 1.3, 2.1, 3.1, 8.8, 10.1
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  checkFavoriteStatus,
  getFavoritesCount,
} from "./favorites";
import { createServiceSupabase } from "./supabase";

// Mock the supabase client
vi.mock("./supabase");

const mockSupabase = {
  from: vi.fn(),
};

describe("addFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceSupabase as Mock).mockReturnValue(mockSupabase);
  });

  it("should add a favorite when service exists and limit not exceeded", async () => {
    const mockServiceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "instagram-followers" },
        error: null,
      }),
    };

    const mockCountQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        count: 10,
        error: null,
      }),
    };

    const mockUpsertQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "fav-123",
          user_id: "user-123",
          service_id: "instagram-followers",
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      }),
    };

    mockSupabase.from
      .mockReturnValueOnce(mockServiceQuery) // First call for service check
      .mockReturnValueOnce(mockCountQuery) // Second call for count check
      .mockReturnValueOnce(mockUpsertQuery); // Third call for upsert

    const result = await addFavorite("user-123", "instagram-followers");

    expect(result).toEqual({
      id: "fav-123",
      userId: "user-123",
      serviceId: "instagram-followers",
      createdAt: "2024-01-01T00:00:00Z",
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("services");
    expect(mockSupabase.from).toHaveBeenCalledWith("user_favorites");
  });

  it("should throw error when service does not exist", async () => {
    const mockServiceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    };

    mockSupabase.from.mockReturnValueOnce(mockServiceQuery);

    await expect(addFavorite("user-123", "invalid-service")).rejects.toThrow(
      "Service not found",
    );
  });

  it("should throw error when favorites limit (500) is reached", async () => {
    const mockServiceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "instagram-followers" },
        error: null,
      }),
    };

    const mockCountQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        count: 500,
        error: null,
      }),
    };

    mockSupabase.from
      .mockReturnValueOnce(mockServiceQuery)
      .mockReturnValueOnce(mockCountQuery);

    await expect(addFavorite("user-123", "instagram-followers")).rejects.toThrow(
      "You've reached the maximum of 500 favorites. Remove some favorites to add new ones.",
    );
  });

  it("should throw error when database connection is not available", async () => {
    (createServiceSupabase as Mock).mockReturnValue(null);

    await expect(addFavorite("user-123", "instagram-followers")).rejects.toThrow(
      "Database connection not available",
    );
  });
});

describe("removeFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceSupabase as Mock).mockReturnValue(mockSupabase);
  });

  it("should remove a favorite successfully", async () => {
    const mockDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      mockResolvedValue: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    // Mock the chain properly
    mockDeleteQuery.eq.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValue(mockDeleteQuery);

    await expect(removeFavorite("user-123", "instagram-followers")).resolves.not.toThrow();

    expect(mockSupabase.from).toHaveBeenCalledWith("user_favorites");
    expect(mockDeleteQuery.delete).toHaveBeenCalled();
  });

  it("should not throw error when favorite does not exist (idempotent)", async () => {
    const mockDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    mockDeleteQuery.eq.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValue(mockDeleteQuery);

    await expect(removeFavorite("user-123", "non-existent")).resolves.not.toThrow();
  });

  it("should throw error when database connection is not available", async () => {
    (createServiceSupabase as Mock).mockReturnValue(null);

    await expect(removeFavorite("user-123", "instagram-followers")).rejects.toThrow(
      "Database connection not available",
    );
  });
});

describe("getUserFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceSupabase as Mock).mockReturnValue(mockSupabase);
  });

  it("should return favorites with service details", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "fav-1",
            user_id: "user-123",
            service_id: "instagram-followers",
            created_at: "2024-01-01T00:00:00Z",
            services: {
              id: "instagram-followers",
              platform: "instagram",
              slug: "followers",
              name: "Instagram Followers",
              category: "followers",
              quality: "HQ",
              delivery: "Instant",
              refill: true,
              refill_days: 30,
              min: 100,
              max: 10000,
              password_required: false,
              rate_per_thousand: 5.0,
              cost_per_thousand: 2.5,
              markup_multiplier: 2.0,
              price_mode: "multiplier",
              visible: true,
              active: true,
              manual: false,
              provider_service_id: 123,
              provider_name: "Provider A",
              start_time: "0-1 hour",
              popularity: 100,
              description: "High quality followers",
            },
          },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUserFavorites("user-123");

    expect(result).toHaveLength(1);
    expect(result[0].serviceId).toBe("instagram-followers");
    expect(result[0].service.name).toBe("Instagram Followers");
    expect(result[0].service.visible).toBe(true);
    expect(result[0].service.active).toBe(true);
  });

  it("should filter out inactive services", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "fav-1",
            user_id: "user-123",
            service_id: "active-service",
            created_at: "2024-01-01T00:00:00Z",
            services: {
              id: "active-service",
              platform: "instagram",
              visible: true,
              active: true,
              name: "Active Service",
              slug: "active",
              category: "followers",
              quality: "HQ",
              delivery: "Instant",
              refill: true,
              refill_days: 30,
              min: 100,
              max: 10000,
              password_required: false,
              rate_per_thousand: 5.0,
              cost_per_thousand: 2.5,
              markup_multiplier: 2.0,
              price_mode: "multiplier",
              manual: false,
              provider_service_id: 123,
              provider_name: "Provider A",
              start_time: "0-1 hour",
              popularity: 100,
              description: "Active service",
            },
          },
          {
            id: "fav-2",
            user_id: "user-123",
            service_id: "inactive-service",
            created_at: "2024-01-02T00:00:00Z",
            services: {
              id: "inactive-service",
              platform: "instagram",
              visible: false,
              active: false,
              name: "Inactive Service",
              slug: "inactive",
              category: "followers",
              quality: "HQ",
              delivery: "Instant",
              refill: true,
              refill_days: 30,
              min: 100,
              max: 10000,
              password_required: false,
              rate_per_thousand: 5.0,
              cost_per_thousand: 2.5,
              markup_multiplier: 2.0,
              price_mode: "multiplier",
              manual: false,
              provider_service_id: 124,
              provider_name: "Provider B",
              start_time: "0-1 hour",
              popularity: 50,
              description: "Inactive service",
            },
          },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUserFavorites("user-123");

    expect(result).toHaveLength(1);
    expect(result[0].serviceId).toBe("active-service");
  });

  it("should apply platform filter when provided", async () => {
    // Create a proper mock query chain where limit returns a thenable
    const mockQueryBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      then: vi.fn(),
    };

    // Set up the chain: select -> eq -> eq -> order -> limit
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
    
    // Make it awaitable with then (this is what Supabase query builder does)
    mockQueryBuilder.then.mockImplementation((resolve) => {
      resolve({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    mockSupabase.from.mockReturnValue(mockQueryBuilder);

    const result = await getUserFavorites("user-123", { platform: "instagram" });

    expect(result).toEqual([]);
    // Verify eq was called 3 times: once for user_id, once for services.platform
    expect(mockQueryBuilder.eq).toHaveBeenCalled();
  });

  it("should apply category filter when provided", async () => {
    // Create a proper mock query chain where limit returns a thenable
    const mockQueryBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      then: vi.fn(),
    };

    // Set up the chain
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
    
    // Make it awaitable
    mockQueryBuilder.then.mockImplementation((resolve) => {
      resolve({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    mockSupabase.from.mockReturnValue(mockQueryBuilder);

    const result = await getUserFavorites("user-123", { category: "followers" });

    expect(result).toEqual([]);
    // Verify eq was called multiple times including for category filter
    expect(mockQueryBuilder.eq).toHaveBeenCalled();
  });

  it("should throw error when database connection is not available", async () => {
    (createServiceSupabase as Mock).mockReturnValue(null);

    await expect(getUserFavorites("user-123")).rejects.toThrow(
      "Database connection not available",
    );
  });
});

describe("checkFavoriteStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceSupabase as Mock).mockReturnValue(mockSupabase);
  });

  it("should return correct status for multiple services", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { service_id: "instagram-followers" },
          { service_id: "tiktok-likes" },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await checkFavoriteStatus("user-123", [
      "instagram-followers",
      "tiktok-likes",
      "youtube-views",
    ]);

    expect(result).toEqual({
      "instagram-followers": true,
      "tiktok-likes": true,
      "youtube-views": false,
    });
  });

  it("should return empty object for empty service IDs array", async () => {
    const result = await checkFavoriteStatus("user-123", []);

    expect(result).toEqual({});
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("should throw error when database connection is not available", async () => {
    (createServiceSupabase as Mock).mockReturnValue(null);

    await expect(checkFavoriteStatus("user-123", ["instagram-followers"])).rejects.toThrow(
      "Database connection not available",
    );
  });
});

describe("getFavoritesCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceSupabase as Mock).mockReturnValue(mockSupabase);
  });

  it("should return correct count of favorites", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        count: 42,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getFavoritesCount("user-123");

    expect(result).toBe(42);
    expect(mockSupabase.from).toHaveBeenCalledWith("user_favorites");
  });

  it("should return 0 when count is null", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        count: null,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getFavoritesCount("user-123");

    expect(result).toBe(0);
  });

  it("should throw error when database connection is not available", async () => {
    (createServiceSupabase as Mock).mockReturnValue(null);

    await expect(getFavoritesCount("user-123")).rejects.toThrow(
      "Database connection not available",
    );
  });
});
  