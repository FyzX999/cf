/**
 * Unit tests for rate limiting functionality
 * 
 * Tests verify:
 * - Rate limit enforcement
 * - Counter tracking and reset
 * - Multiple buckets (refund, ticket)
 * - IP vs user-based limiting
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  RateLimitConfigs,
  getRateLimitIdentifier,
  getClientIp,
  resetRateLimit,
} from "./rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Clear rate limits between tests
    resetRateLimit("test-user-1", "refund");
    resetRateLimit("test-user-1", "ticket");
    resetRateLimit("test-user-2", "refund");
    resetRateLimit("ip:192.168.1.1", "ticket");
  });

  describe("checkRateLimit", () => {
    it("should allow requests within the limit", () => {
      const config = RateLimitConfigs.REFUND;
      
      // First request should be allowed
      const result1 = checkRateLimit("test-user-1", config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4); // 5 - 1 = 4
      
      // Second request should be allowed
      const result2 = checkRateLimit("test-user-1", config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3); // 5 - 2 = 3
    });

    it("should block requests exceeding the limit", () => {
      const config = RateLimitConfigs.REFUND;
      
      // Use up all 5 allowed requests
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit("test-user-1", config);
        expect(result.allowed).toBe(true);
      }
      
      // 6th request should be blocked
      const result = checkRateLimit("test-user-1", config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should track different users independently", () => {
      const config = RateLimitConfigs.REFUND;
      
      // User 1 uses up all requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit("test-user-1", config);
      }
      
      // User 2 should still be able to make requests
      const result = checkRateLimit("test-user-2", config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should track different rate limit buckets independently", () => {
      // Use up refund limit for user
      for (let i = 0; i < 5; i++) {
        checkRateLimit("test-user-1", RateLimitConfigs.REFUND);
      }
      
      // Ticket creation should still be available
      const result = checkRateLimit("test-user-1", RateLimitConfigs.TICKET_CREATION);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1 = 9
    });

    it("should provide accurate reset timestamps", () => {
      const config = RateLimitConfigs.REFUND;
      const now = Date.now();
      
      const result = checkRateLimit("test-user-1", config);
      
      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + config.windowMs);
    });

    it("should reset counter after window expires", async () => {
      // Create a custom config with a very short window for testing
      const shortConfig = {
        maxRequests: 2,
        windowMs: 100, // 100ms window
        identifier: "test-short",
      };
      
      // Use up the limit
      checkRateLimit("test-user-1", shortConfig);
      checkRateLimit("test-user-1", shortConfig);
      
      // Verify blocked
      let result = checkRateLimit("test-user-1", shortConfig);
      expect(result.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Should be allowed again
      result = checkRateLimit("test-user-1", shortConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe("getRateLimitIdentifier", () => {
    it("should prefer user ID over IP address", () => {
      const identifier = getRateLimitIdentifier("user-123", "192.168.1.1");
      expect(identifier).toBe("user:user-123");
    });

    it("should use IP address when user ID is not available", () => {
      const identifier = getRateLimitIdentifier(undefined, "192.168.1.1");
      expect(identifier).toBe("ip:192.168.1.1");
    });

    it("should return anonymous when neither is available", () => {
      const identifier = getRateLimitIdentifier(undefined, undefined);
      expect(identifier).toBe("anonymous");
    });
  });

  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const mockRequest = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });
      
      const ip = getClientIp(mockRequest);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const mockRequest = new Request("http://example.com", {
        headers: {
          "x-real-ip": "192.168.1.1",
        },
      });
      
      const ip = getClientIp(mockRequest);
      expect(ip).toBe("192.168.1.1");
    });

    it("should prefer x-forwarded-for over x-real-ip", () => {
      const mockRequest = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "x-real-ip": "10.0.0.1",
        },
      });
      
      const ip = getClientIp(mockRequest);
      expect(ip).toBe("192.168.1.1");
    });

    it("should return undefined when no IP headers present", () => {
      const mockRequest = new Request("http://example.com");
      
      const ip = getClientIp(mockRequest);
      expect(ip).toBeUndefined();
    });
  });

  describe("Rate Limit Configs", () => {
    it("should have correct refund config", () => {
      expect(RateLimitConfigs.REFUND.maxRequests).toBe(5);
      expect(RateLimitConfigs.REFUND.windowMs).toBe(60000); // 1 minute
      expect(RateLimitConfigs.REFUND.identifier).toBe("refund");
    });

    it("should have correct ticket creation config", () => {
      expect(RateLimitConfigs.TICKET_CREATION.maxRequests).toBe(10);
      expect(RateLimitConfigs.TICKET_CREATION.windowMs).toBe(3600000); // 1 hour
      expect(RateLimitConfigs.TICKET_CREATION.identifier).toBe("ticket");
    });

    it("should have correct ticket reply config", () => {
      expect(RateLimitConfigs.TICKET_REPLY.maxRequests).toBe(30);
      expect(RateLimitConfigs.TICKET_REPLY.windowMs).toBe(3600000); // 1 hour
      expect(RateLimitConfigs.TICKET_REPLY.identifier).toBe("ticket-reply");
    });
  });

  describe("resetRateLimit", () => {
    it("should reset rate limit for a specific user", () => {
      const config = RateLimitConfigs.REFUND;
      
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit("test-user-1", config);
      }
      
      // Verify blocked
      let result = checkRateLimit("test-user-1", config);
      expect(result.allowed).toBe(false);
      
      // Reset
      resetRateLimit("test-user-1", config.identifier);
      
      // Should be allowed again
      result = checkRateLimit("test-user-1", config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });
});
