/**
 * Simple in-memory rate limiter
 * SECURITY: Prevents brute force attacks and API abuse
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

/**
 * Check if request should be rate limited
 * Returns true if rate limit exceeded
 */
export function isRateLimited(identifier: string, config: RateLimitConfig): boolean {
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
    return true;
  }

  // Increment count
  entry.count++;
  return false;
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
  
  // Order creation - prevent spam
  orderCreation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 orders per minute
  },
  
  // Payment checkout - prevent abuse
  paymentCheckout: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 checkouts per minute
  },
  
  // General API - reasonable limit
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
};
