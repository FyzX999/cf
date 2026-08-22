/**
 * Rate Limit Feedback Hook
 * 
 * Provides user-friendly feedback for rate-limited API requests with countdown timer.
 * Parses 429 errors and Retry-After headers to display countdown and auto-enable retry.
 * 
 * **Validates Requirements:**
 * - 8.1: Parse Retry-After header from 429 status responses
 * - 8.2: Display countdown timer showing seconds until retry allowed
 * - 8.3: Auto-enable retry button when countdown reaches 0
 * - 8.4: Show clear message explaining rate limit
 * - 8.5: Apply to all API request error handling
 */

import { useState, useEffect, useCallback } from "react";

export interface RateLimitState {
  /** Whether the request is currently rate-limited */
  isRateLimited: boolean;
  /** Initial retry-after value in seconds */
  retryAfter: number;
  /** Current countdown value in seconds (decrements each second) */
  countdown: number;
  /** User-friendly error message */
  message: string;
}

interface RateLimitError {
  error?: string;
  retryAfter?: number;
}

/**
 * Parse a rate limit error from API response
 * 
 * @param error - Error object or message
 * @param response - Optional Response object with headers
 * @returns Parsed rate limit information or null if not a rate limit error
 */
export function parseRateLimitError(
  error: unknown,
  response?: Response
): { retryAfter: number; message: string } | null {
  // Check if response has 429 status
  if (response?.status !== 429) {
    return null;
  }

  // Try to extract retryAfter from various sources
  let retryAfter = 0;
  let message = "Too many requests. Please try again later.";

  // 1. Check Retry-After header (Requirement 8.1)
  const retryAfterHeader = response.headers.get("Retry-After");
  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10);
    if (!isNaN(parsed)) {
      retryAfter = parsed;
    }
  }

  // 2. Check response body for retryAfter field
  if (error && typeof error === "object" && "retryAfter" in error) {
    const bodyRetryAfter = (error as RateLimitError).retryAfter;
    if (typeof bodyRetryAfter === "number") {
      retryAfter = bodyRetryAfter;
    }
  }

  // 3. Extract message from error object
  if (error && typeof error === "object" && "error" in error) {
    const errorMessage = (error as RateLimitError).error;
    if (typeof errorMessage === "string") {
      message = errorMessage;
    }
  }

  // Default to 60 seconds if no retry-after found
  if (retryAfter === 0) {
    retryAfter = 60;
  }

  return { retryAfter, message };
}

/**
 * Hook for managing rate limit feedback with countdown timer
 * 
 * **Usage Example:**
 * ```tsx
 * const rateLimit = useRateLimitFeedback(error, response);
 * 
 * if (rateLimit.isRateLimited) {
 *   return (
 *     <div>
 *       <p>{rateLimit.message}</p>
 *       <p>Please wait {rateLimit.countdown} seconds...</p>
 *       <button disabled={rateLimit.countdown > 0}>Retry</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @param error - Error from API request (can be Error object or JSON error response)
 * @param response - Optional Response object with headers
 * @returns Rate limit state with countdown and message
 */
export function useRateLimitFeedback(
  error: unknown | null,
  response?: Response
): RateLimitState {
  const [state, setState] = useState<RateLimitState>({
    isRateLimited: false,
    retryAfter: 0,
    countdown: 0,
    message: "",
  });

  // Parse error and initialize countdown
  useEffect(() => {
    if (!error) {
      // Clear rate limit state when error is cleared
      setState({
        isRateLimited: false,
        retryAfter: 0,
        countdown: 0,
        message: "",
      });
      return;
    }

    const rateLimitInfo = parseRateLimitError(error, response);

    if (rateLimitInfo) {
      // Initialize rate limit state (Requirements 8.1, 8.4)
      setState({
        isRateLimited: true,
        retryAfter: rateLimitInfo.retryAfter,
        countdown: rateLimitInfo.retryAfter,
        message: rateLimitInfo.message,
      });
    } else {
      // Not a rate limit error, clear state
      setState({
        isRateLimited: false,
        retryAfter: 0,
        countdown: 0,
        message: "",
      });
    }
  }, [error, response]);

  // Countdown timer (Requirements 8.2, 8.3)
  useEffect(() => {
    if (!state.isRateLimited || state.countdown <= 0) {
      return;
    }

    // Decrement countdown every second
    const timer = setInterval(() => {
      setState((prev) => {
        const newCountdown = prev.countdown - 1;
        
        // Auto-enable retry when countdown reaches 0 (Requirement 8.3)
        if (newCountdown <= 0) {
          return {
            ...prev,
            countdown: 0,
            isRateLimited: false, // Clear rate limit state to enable retry
          };
        }

        return {
          ...prev,
          countdown: newCountdown,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isRateLimited, state.countdown]);

  return state;
}

/**
 * Helper to format countdown message (Requirement 8.4)
 * 
 * @param countdown - Number of seconds remaining
 * @returns Formatted countdown message
 */
export function formatCountdownMessage(countdown: number): string {
  if (countdown <= 0) {
    return "You can retry now.";
  }
  
  const seconds = countdown === 1 ? "second" : "seconds";
  return `Please wait ${countdown} ${seconds}...`;
}

/**
 * Create a rate limit aware fetch wrapper
 * 
 * This wrapper automatically handles rate limit responses and provides
 * structured error information for the useRateLimitFeedback hook.
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Response with rate limit metadata
 */
export async function rateLimitAwareFetch(
  url: string,
  options?: RequestInit
): Promise<{ response: Response; error: unknown | null }> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const json = await response.json().catch(() => ({ error: "Request failed" }));
      return {
        response,
        error: json,
      };
    }

    return {
      response,
      error: null,
    };
  } catch (err) {
    // Network error or other exception
    return {
      response: new Response(null, { status: 500 }),
      error: err,
    };
  }
}
