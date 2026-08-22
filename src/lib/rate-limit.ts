/**
 * Rate Limiting Middleware
 * 
 * Implements in-memory rate limiting for API endpoints to prevent abuse.
 * Uses a sliding window algorithm to track requests per user/IP.
 * 
 * Security Requirements:
 * - Prevent refund request spam (max 5 per minute per user)
 * - Prevent ticket creation spam (configurable limits)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

// In-memory store for rate limit tracking
const rateLimitStore: RateLimitStore = {};

// Cleanup interval to remove expired entries
const CLEANUP_INTERVAL = 60000; // 1 minute

// Periodic cleanup to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    Object.keys(rateLimitStore).forEach((key) => {
      if (rateLimitStore[key].resetAt < now) {
        delete rateLimitStore[key];
      }
    });
  }, CLEANUP_INTERVAL);
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Identifier for the rate limit bucket (e.g., "refund", "ticket") */
  identifier: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Timestamp when the rate limit resets (milliseconds) */
  resetAt: number;
  /** Number of seconds until reset */
  retryAfter?: number;
}

/**
 * Check if a request is allowed based on rate limiting rules
 * 
 * @param userId - User ID or IP address for tracking
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.identifier}:${userId}`;
  const now = Date.now();
  
  // Get or initialize the rate limit entry
  let entry = rateLimitStore[key];
  
  // If no entry exists or the window has expired, create a new one
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore[key] = entry;
  }
  
  // Check if the request is allowed
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }
  
  // Increment the request count
  entry.count += 1;
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RateLimitConfigs = {
  /** Refund requests: max 5 per minute per user */
  REFUND: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    identifier: "refund",
  } satisfies RateLimitConfig,
  
  /** Ticket creation: max 10 per hour per user/IP */
  TICKET_CREATION: {
    maxRequests: 10,
    windowMs: 3600000, // 1 hour
    identifier: "ticket",
  } satisfies RateLimitConfig,
  
  /** Ticket replies: max 30 per hour per user */
  TICKET_REPLY: {
    maxRequests: 30,
    windowMs: 3600000, // 1 hour
    identifier: "ticket-reply",
  } satisfies RateLimitConfig,
};

/**
 * Get a unique identifier from a request
 * Uses user ID if authenticated, falls back to IP address
 * 
 * @param userId - Authenticated user ID (optional)
 * @param ipAddress - Request IP address (optional)
 * @returns Unique identifier for rate limiting
 */
export function getRateLimitIdentifier(
  userId?: string,
  ipAddress?: string
): string {
  // Prefer user ID for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address for anonymous requests
  if (ipAddress) {
    return `ip:${ipAddress}`;
  }
  
  // Last resort: use a generic identifier (not ideal, but prevents crashes)
  return "anonymous";
}

/**
 * Extract IP address from request headers
 * Checks common headers used by proxies and load balancers
 * 
 * @param request - Next.js request object
 * @returns IP address or undefined
 */
export function getClientIp(request: Request): string | undefined {
  // Check x-forwarded-for header (used by most proxies)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP if multiple are present
    return forwardedFor.split(",")[0].trim();
  }
  
  // Check x-real-ip header (used by Nginx)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  
  // No IP found
  return undefined;
}

/**
 * Reset rate limit for a specific user/identifier
 * Useful for testing or admin override
 * 
 * @param userId - User ID or IP address
 * @param identifier - Rate limit identifier
 */
export function resetRateLimit(userId: string, identifier: string): void {
  const key = `${identifier}:${userId}`;
  delete rateLimitStore[key];
}
