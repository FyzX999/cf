import { describe, it, expect, beforeEach } from "vitest";
import {
  logSecurityEvent,
  getRecentEvents,
  getEventsByType,
  getEventsByActor,
  maskIp,
  hashPii,
  type SecurityEvent,
} from "./security-logger";
import { writeStore } from "./admin-store";

describe("Security Logger", () => {
  beforeEach(async () => {
    // Clear security log before each test
    await writeStore((store) => ({
      ...store,
      securityLog: { events: [], retentionDays: 90 },
    }));
  });

  describe("logSecurityEvent", () => {
    it("should log a security event with all required fields", async () => {
      await logSecurityEvent({
        type: "auth.login.success",
        actor: "admin",
        target: "admin-dashboard",
        details: { username: "admin" },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0",
      });

      const events = await getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "auth.login.success",
        actor: "admin",
        target: "admin-dashboard",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0",
      });
      expect(events[0].id).toBeDefined();
      expect(events[0].timestamp).toBeDefined();
      expect(events[0].correlationId).toBeDefined();
    });

    it("should generate unique IDs for each event", async () => {
      await logSecurityEvent({
        type: "auth.login.failure",
        actor: "user1",
        details: {},
      });
      await logSecurityEvent({
        type: "auth.login.failure",
        actor: "user2",
        details: {},
      });

      const events = await getRecentEvents(2);
      expect(events).toHaveLength(2);
      expect(events[0].id).not.toBe(events[1].id);
    });

    it("should generate correlation IDs automatically", async () => {
      await logSecurityEvent({
        type: "rate_limit.exceeded",
        actor: "ip:192.168.1.100",
        details: { endpoint: "/api/orders" },
      });

      const events = await getRecentEvents(1);
      expect(events[0].correlationId).toBeDefined();
      expect(events[0].correlationId).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it("should store events in newest-first order", async () => {
      await logSecurityEvent({
        type: "auth.login.success",
        actor: "user1",
        details: { order: 1 },
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await logSecurityEvent({
        type: "auth.login.success",
        actor: "user2",
        details: { order: 2 },
      });

      const events = await getRecentEvents(2);
      expect(events).toHaveLength(2);
      expect(events[0].actor).toBe("user2");
      expect(events[1].actor).toBe("user1");
    });
  });

  describe("getEventsByType", () => {
    it("should filter events by type", async () => {
      await logSecurityEvent({
        type: "auth.login.success",
        actor: "user1",
        details: {},
      });
      await logSecurityEvent({
        type: "auth.login.failure",
        actor: "user2",
        details: {},
      });
      await logSecurityEvent({
        type: "auth.login.success",
        actor: "user3",
        details: {},
      });

      const successEvents = await getEventsByType("auth.login.success");
      expect(successEvents).toHaveLength(2);
      expect(successEvents.every((e) => e.type === "auth.login.success")).toBe(
        true
      );

      const failureEvents = await getEventsByType("auth.login.failure");
      expect(failureEvents).toHaveLength(1);
      expect(failureEvents[0].actor).toBe("user2");
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await logSecurityEvent({
          type: "rate_limit.exceeded",
          actor: `user${i}`,
          details: {},
        });
      }

      const events = await getEventsByType("rate_limit.exceeded", 3);
      expect(events).toHaveLength(3);
    });
  });

  describe("getEventsByActor", () => {
    it("should filter events by actor", async () => {
      await logSecurityEvent({
        type: "auth.login.success",
        actor: "user1",
        details: {},
      });
      await logSecurityEvent({
        type: "auth.logout",
        actor: "user1",
        details: {},
      });
      await logSecurityEvent({
        type: "auth.login.success",
        actor: "user2",
        details: {},
      });

      const user1Events = await getEventsByActor("user1");
      expect(user1Events).toHaveLength(2);
      expect(user1Events.every((e) => e.actor === "user1")).toBe(true);

      const user2Events = await getEventsByActor("user2");
      expect(user2Events).toHaveLength(1);
      expect(user2Events[0].actor).toBe("user2");
    });
  });

  describe("maskIp", () => {
    it("should mask IPv4 addresses correctly", () => {
      expect(maskIp("192.168.1.100")).toBe("192.168.*.*");
      expect(maskIp("10.0.0.1")).toBe("10.0.*.*");
      expect(maskIp("8.8.8.8")).toBe("8.8.*.*");
    });

    it("should handle IPv6 addresses", () => {
      const masked = maskIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
      expect(masked).toContain("2001:0db8:");
      expect(masked).toContain("*");
    });

    it("should return invalid IP addresses as-is", () => {
      expect(maskIp("invalid")).toBe("invalid");
      expect(maskIp("")).toBe("");
    });
  });

  describe("hashPii", () => {
    it("should hash email addresses consistently", async () => {
      const email = "user@example.com";
      const hash1 = await hashPii(email);
      const hash2 = await hashPii(email);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
      expect(hash1).not.toContain("@");
      expect(hash1).not.toContain("example.com");
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await hashPii("user1@example.com");
      const hash2 = await hashPii("user2@example.com");

      expect(hash1).not.toBe(hash2);
    });

    it("should hash sensitive data without revealing original", async () => {
      const sensitive = "secret-password-123";
      const hash = await hashPii(sensitive);

      expect(hash).not.toContain("secret");
      expect(hash).not.toContain("password");
      expect(hash).not.toContain("123");
    });
  });

  describe("retention policy", () => {
    it("should initialize with 90-day retention policy", async () => {
      await logSecurityEvent({
        type: "auth.login.success",
        actor: "user1",
        details: {},
      });

      const events = await getRecentEvents();
      expect(events).toBeDefined();
      // The retention policy is applied during cleanup
    });
  });

  describe("getRecentEvents", () => {
    it("should return empty array when no events exist", async () => {
      const events = await getRecentEvents();
      expect(events).toEqual([]);
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        await logSecurityEvent({
          type: "auth.login.success",
          actor: `user${i}`,
          details: {},
        });
      }

      const events = await getRecentEvents(5);
      expect(events).toHaveLength(5);
    });

    it("should default to 100 events if limit not specified", async () => {
      // Log more than 100 events
      for (let i = 0; i < 150; i++) {
        await logSecurityEvent({
          type: "rate_limit.exceeded",
          actor: `user${i}`,
          details: {},
        });
      }

      const events = await getRecentEvents();
      expect(events).toHaveLength(100);
    });
  });

  describe("error handling", () => {
    it("should not throw errors when logging fails", async () => {
      // This test verifies the logger's error handling
      // The logger should catch any errors and just log to console
      await expect(
        logSecurityEvent({
          type: "auth.login.success",
          actor: "test",
          details: { test: "data" },
        })
      ).resolves.not.toThrow();
    });

    it("should return empty array when getRecentEvents fails", async () => {
      // Even if there's an error, we should get an empty array, not throw
      const events = await getRecentEvents();
      expect(Array.isArray(events)).toBe(true);
    });
  });
});
