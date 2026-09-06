/**
 * Enhanced in-memory rate limiter with violation tracking and IP blocking
 * SECURITY: Prevents brute force attacks, API abuse, and automated enumeration
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface ViolationTracker {
  count: number;           // Number of rate limit violations
  firstViolation: number;  // Timestamp of first violation in window
  blockedUntil: number | null;  // Timestamp when block expires
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const violationMap = new Map<string, ViolationTracker>();
const blockList = new Map<string, number>(); // identifier -> blockedUntil timestamp

// Configuration for automatic IP blocking
const VIOLATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_VIOLATIONS_BEFORE_BLOCK = 10;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired rate limit entries
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
  
  // Clean up expired violation entries
  for (const [key, violation] of violationMap.entries()) {
    if (violation.firstViolation + VIOLATION_WINDOW_MS < now) {
      violationMap.delete(key);
    }
  }
  
  // Clean up expired blocks
  for (const [key, blockedUntil] of blockList.entries()) {
    if (blockedUntil < now) {
      blockList.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  blockDuration?: number; // Optional: how long to block after violations
}

/**
 * Check if identifier is currently blocked
 */
export function isBlocked(identifier: string): boolean {
  const blockedUntil = blockList.get(identifier);
  if (!blockedUntil) return false;
  
  const now = Date.now();
  if (blockedUntil < now) {
    // Block expired, clean up
    blockList.delete(identifier);
    return false;
  }
  
  return true;
}

/**
 * Block an identifier for specified duration
 */
export function blockIdentifier(identifier: string, durationMs: number): void {
  const blockedUntil = Date.now() + durationMs;
  blockList.set(identifier, blockedUntil);
  
  // Also update violation tracker
  const violation = violationMap.get(identifier);
  if (violation) {
    violation.blockedUntil = blockedUntil;
  }
}

/**
 * Track a rate limit violation and potentially block the identifier
 */
function trackViolation(identifier: string): void {
  const now = Date.now();
  const violation = violationMap.get(identifier);
  
  if (!violation || violation.firstViolation + VIOLATION_WINDOW_MS < now) {
    // Start new violation tracking window
    violationMap.set(identifier, {
      count: 1,
      firstViolation: now,
      blockedUntil: null,
    });
    return;
  }
  
  // Increment violation count
  violation.count++;
  
  // Check if we should block this identifier
  if (violation.count >= MAX_VIOLATIONS_BEFORE_BLOCK) {
    blockIdentifier(identifier, BLOCK_DURATION_MS);
  }
}

/**
 * Check if request should be rate limited
 * Returns true if rate limit exceeded
 * @param identifier - Unique identifier for the client (IP or user ID)
 * @param config - Rate limit configuration
 * @param trackViolations - Whether to track violations for automatic blocking (default: false)
 */
export function isRateLimited(
  identifier: string, 
  config: RateLimitConfig,
  trackViolations = false
): boolean {
  // First check if identifier is blocked
  if (isBlocked(identifier)) {
    return true;
  }
  
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    // First request or window expired - allow and start new window
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return false;
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    if (trackViolations) {
      trackViolation(identifier);
    }
    return true;
  }

  // Increment count
  entry.count++;
  return false;
}

/**
 * Get remaining requests in current window
 */
export function getRemainingRequests(identifier: string, config: RateLimitConfig): number {
  if (isBlocked(identifier)) {
    return 0;
  }
  
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || entry.resetAt < now) {
    return config.maxRequests;
  }
  
  return Math.max(0, config.maxRequests - entry.count);
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  
  // Try to get real IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`;
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }
  
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return `ip:${cfConnectingIp}`;
  }
  
  // Fallback to a generic identifier (not ideal but better than nothing)
  return 'ip:unknown';
}

// Preset rate limit configurations
export const rateLimits = {
  // Admin login - strict limit to prevent brute force
  adminLogin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
  },
  
  // Order creation - prevent spam (10 per hour as per requirements)
  orderCreation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 orders per hour
  },
  
  // Payment verification - strict limit (5 per minute as per requirements)
  paymentVerification: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 per minute
  },
  
  // Order tracking - prevent enumeration (20 per hour as per requirements)
  orderTracking: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 per hour
  },
  
  // Promo code validation - prevent enumeration (5 per minute as per requirements)
  promoCodeValidation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 per minute
  },
  
  // Public API - general limit (100 per minute as per requirements)
  publicAPI: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 per minute
  },
  
  // Payment checkout - prevent abuse
  paymentCheckout: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 checkouts per minute
  },
  
  // General API - reasonable limit (kept for backward compatibility)
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
};
