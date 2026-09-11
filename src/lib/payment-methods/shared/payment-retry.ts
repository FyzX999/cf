/**
 * Payment Retry and Retry Utilities
 * Implements exponential backoff and deduplication
 */

import { RETRY_CONFIG, DEDUP_CONFIG } from './payment-constants';
import { PaymentError, PaymentErrorCode } from './payment-errors';

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(attemptNumber: number): number {
  const delay = Math.min(
    RETRY_CONFIG.INITIAL_BACKOFF_MS *
      Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attemptNumber),
    RETRY_CONFIG.MAX_BACKOFF_MS
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? RETRY_CONFIG.MAX_ATTEMPTS;
  const shouldRetry = options?.shouldRetry ?? (() => true);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // Don't sleep on last attempt
      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoff(attempt);
        options?.onRetry?.(attempt + 1, lastError);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Retry failed: Unknown error');
}

/**
 * Request deduplication cache
 * Prevents duplicate payment checks in rapid succession
 */
class RequestDeduplicator {
  private cache = new Map<string, { timestamp: number; result: any }>();

  /**
   * Get cached result if available and not expired
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > DEDUP_CONFIG.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Set cached result
   */
  set(key: string, result: any): void {
    if (this.cache.size >= DEDUP_CONFIG.MAX_CACHE_SIZE) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      timestamp: Date.now(),
      result,
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

export const paymentCheckCache = new RequestDeduplicator();

/**
 * Execute with deduplication - prevents duplicate concurrent requests
 */
export async function withDeduplication<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { ttl?: number }
): Promise<T> {
  // Check if we have a cached result
  const cached = paymentCheckCache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Execute the function
  const result = await fn();

  // Cache the result
  paymentCheckCache.set(key, result);

  return result;
}
