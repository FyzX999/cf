/**
 * Tests for Rate Limit Feedback Hook
 * 
 * **Validates Requirements:**
 * - 8.1: Parse Retry-After header from 429 status
 * - 8.2: Display countdown timer
 * - 8.3: Auto-enable retry when countdown reaches 0
 * - 8.4: Show clear message explaining rate limit
 * - 8.5: Apply to all API request error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { 
  useRateLimitFeedback, 
  parseRateLimitError, 
  formatCountdownMessage,
  rateLimitAwareFetch
} from "./useRateLimitFeedback";

describe("parseRateLimitError", () => {
  it("should return null for non-429 responses", () => {
    const response = new Response(null, { status: 400 });
    const result = parseRateLimitError({ error: "Bad request" }, response);
    expect(result).toBeNull();
  });

  it("should parse retryAfter from Retry-After header (Requirement 8.1)", () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "45" },
    });
    const result = parseRateLimitError({ error: "Too many requests" }, response);
    
    expect(result).not.toBeNull();
    expect(result?.retryAfter).toBe(45);
  });

  it("should parse retryAfter from error object body", () => {
    const response = new Response(null, { status: 429 });
    const error = {
      error: "Too many refund requests. Please try again later.",
      retryAfter: 30,
    };
    const result = parseRateLimitError(error, response);
    
    expect(result).not.toBeNull();
    expect(result?.retryAfter).toBe(30);
  });

  it("should use custom error message from response body (Requirement 8.4)", () => {
    const response = new Response(null, { status: 429 });
    const error = {
      error: "Custom rate limit message",
      retryAfter: 60,
    };
    const result = parseRateLimitError(error, response);
    
    expect(result).not.toBeNull();
    expect(result?.message).toBe("Custom rate limit message");
  });

  it("should default to 60 seconds when no retryAfter provided", () => {
    const response = new Response(null, { status: 429 });
    const result = parseRateLimitError({ error: "Too many requests" }, response);
    
    expect(result).not.toBeNull();
    expect(result?.retryAfter).toBe(60);
  });

  it("should prioritize header over body retryAfter", () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "10" },
    });
    const error = {
      error: "Too many requests",
      retryAfter: 30,
    };
    const result = parseRateLimitError(error, response);
    
    expect(result).not.toBeNull();
    expect(result?.retryAfter).toBe(10);
  });
});

describe("formatCountdownMessage", () => {
  it("should format singular second correctly (Requirement 8.4)", () => {
    expect(formatCountdownMessage(1)).toBe("Please wait 1 second...");
  });

  it("should format plural seconds correctly (Requirement 8.4)", () => {
    expect(formatCountdownMessage(45)).toBe("Please wait 45 seconds...");
  });

  it("should show retry message when countdown is 0 (Requirement 8.3)", () => {
    expect(formatCountdownMessage(0)).toBe("You can retry now.");
  });

  it("should show retry message when countdown is negative", () => {
    expect(formatCountdownMessage(-5)).toBe("You can retry now.");
  });
});

describe("useRateLimitFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with no rate limit when error is null", () => {
    const { result } = renderHook(() => useRateLimitFeedback(null));

    expect(result.current.isRateLimited).toBe(false);
    expect(result.current.countdown).toBe(0);
    expect(result.current.retryAfter).toBe(0);
    expect(result.current.message).toBe("");
  });

  it("should detect rate limit from 429 response (Requirement 8.1)", () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "30" },
    });
    const error = { error: "Too many requests", retryAfter: 30 };

    const { result } = renderHook(() => useRateLimitFeedback(error, response));

    expect(result.current.isRateLimited).toBe(true);
    expect(result.current.retryAfter).toBe(30);
    expect(result.current.countdown).toBe(30);
    expect(result.current.message).toBe("Too many requests");
  });

  it("should countdown every second (Requirement 8.2)", async () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "5" },
    });
    const error = { error: "Too many requests", retryAfter: 5 };

    const { result } = renderHook(() => useRateLimitFeedback(error, response));

    expect(result.current.countdown).toBe(5);

    // Advance by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(result.current.countdown).toBe(4));

    // Advance by 1 more second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(result.current.countdown).toBe(3));
  });

  it("should auto-enable retry when countdown reaches 0 (Requirement 8.3)", async () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "3" },
    });
    const error = { error: "Too many requests", retryAfter: 3 };

    const { result } = renderHook(() => useRateLimitFeedback(error, response));

    expect(result.current.isRateLimited).toBe(true);
    expect(result.current.countdown).toBe(3);

    // Advance by 3 seconds to reach 0
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.countdown).toBe(0);
      expect(result.current.isRateLimited).toBe(false); // Should auto-clear
    });
  });

  it("should clear rate limit state when error is cleared", async () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "10" },
    });
    const error = { error: "Too many requests", retryAfter: 10 };

    const { result, rerender } = renderHook(
      ({ err, res }) => useRateLimitFeedback(err, res),
      { initialProps: { err: error as unknown, res: response } }
    );

    expect(result.current.isRateLimited).toBe(true);

    // Clear error
    rerender({ err: null, res: undefined });

    await waitFor(() => {
      expect(result.current.isRateLimited).toBe(false);
      expect(result.current.countdown).toBe(0);
    });
  });

  it("should not set rate limit for non-429 errors", () => {
    const response = new Response(null, { status: 500 });
    const error = { error: "Internal server error" };

    const { result } = renderHook(() => useRateLimitFeedback(error, response));

    expect(result.current.isRateLimited).toBe(false);
    expect(result.current.countdown).toBe(0);
  });

  it("should stop countdown timer on unmount", async () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "10" },
    });
    const error = { error: "Too many requests", retryAfter: 10 };

    const { result, unmount } = renderHook(() => useRateLimitFeedback(error, response));

    expect(result.current.countdown).toBe(10);

    // Unmount the hook
    unmount();

    // Advance time - countdown should not continue after unmount
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Countdown should remain at 10 because hook was unmounted
    expect(result.current.countdown).toBe(10);
  });
});

describe("rateLimitAwareFetch", () => {
  it("should return response and null error on success", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const result = await rateLimitAwareFetch("/api/test");

    expect(result.response.ok).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should return response and error object on 429", async () => {
    const errorBody = { error: "Too many requests", retryAfter: 30 };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorBody), { 
        status: 429,
        headers: { "Retry-After": "30" }
      })
    );

    const result = await rateLimitAwareFetch("/api/test");

    expect(result.response.status).toBe(429);
    expect(result.error).toEqual(errorBody);
  });

  it("should handle network errors gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await rateLimitAwareFetch("/api/test");

    expect(result.response.status).toBe(500);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("should handle non-JSON error responses", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("Internal server error", { status: 500 })
    );

    const result = await rateLimitAwareFetch("/api/test");

    expect(result.response.status).toBe(500);
    expect(result.error).toEqual({ error: "Request failed" });
  });
});
