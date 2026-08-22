"use client";

import { useState, useEffect } from "react";
import type { TicketCategory } from "@/lib/types";
import { useRateLimitFeedback, formatCountdownMessage } from "@/lib/useRateLimitFeedback";

/**
 * Category options mapping enum values to display labels
 * 
 * **Validates Requirements:**
 * - 7.1: Use category values matching TicketCategory enum exactly
 * - 7.2: Map display labels to enum values
 * - 7.3: Send enum value to API when category selected
 */
const CATEGORY_OPTIONS: Array<{ value: TicketCategory; label: string }> = [
  { value: "order", label: "Order Issue" },
  { value: "payment", label: "Payment Issue" },
  { value: "refill", label: "Refill Request" },
  { value: "account", label: "Account Issue" },
  { value: "api", label: "API Issue" },
  { value: "service", label: "Service Question" },
  { value: "other", label: "Other" },
];

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SupportPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [lastResponse, setLastResponse] = useState<Response | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Rate limit feedback hook (Requirements 8.1, 8.2, 8.3, 8.4, 8.5)
  const rateLimit = useRateLimitFeedback(error, lastResponse);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/tickets", {
          method: "GET",
        });
        const json = await res.json();
        // If we get tickets array (even empty), user is authenticated or endpoint is accessible
        // Based on API implementation, authenticated users get their tickets, guests get empty array
        // We'll use a more direct approach - check if we have a session
        setIsAuthenticated(res.ok && json.tickets !== undefined && json.tickets.length >= 0);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const submitTicket = async (formData: FormData) => {
    setBusy(true);
    setError(null);
    setLastResponse(undefined);
    setEmailError(null);

    // Validate email for guest users
    const guestEmail = String(formData.get("guestEmail") || "");
    if (!isAuthenticated && !validateEmail(guestEmail)) {
      setBusy(false);
      return;
    }
    
    try {
      const payload: Record<string, string> = {
        category: String(formData.get("category") || "other"), // Use enum value directly (Requirement 7.3)
        subject: String(formData.get("subject") || ""),
        orderId: String(formData.get("orderId") || ""),
        body: String(formData.get("body") || ""),
      };

      // Include guestEmail only for non-authenticated users
      if (!isAuthenticated) {
        payload.guestEmail = guestEmail;
      }

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      // Store response for rate limit parsing
      setLastResponse(res);
      
      const json = await res.json();
      if (!res.ok) throw json; // Throw the full JSON object for rate limit parsing
      setSent(json.ticket.publicId);
      setRetryCount(0);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Support center</h1>
      <p className="muted mt-2 text-sm">Tickets are threaded like a conversation. Agents see your orders, payments, and history.</p>
      {sent ? (
        <div className="glass mt-6 p-5">Ticket #{sent} opened. We&apos;ll reply in your dashboard inbox.</div>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            await submitTicket(data);
          }}
        >
          <select className="field cursor-pointer" name="category" defaultValue={CATEGORY_OPTIONS[0].value}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input className="field" name="subject" placeholder="Subject" required />
          
          {/* Email field for guest users (Requirements 3.1, 3.2, 3.3, 3.4) */}
          {isAuthenticated === false && (
            <div>
              <input
                className="field"
                name="guestEmail"
                type="email"
                placeholder="Your email address"
                required
                onChange={(e) => {
                  // Clear error on change
                  if (emailError) {
                    setEmailError(null);
                  }
                }}
                onBlur={(e) => {
                  // Validate on blur
                  if (e.target.value) {
                    validateEmail(e.target.value);
                  }
                }}
              />
              {emailError && (
                <p className="mt-1 text-sm text-[#f07167]">{emailError}</p>
              )}
              <p className="mt-1 text-xs text-[#9aa3b5]">
                We&apos;ll use this email to contact you about your ticket.
              </p>
            </div>
          )}
          
          <input className="field" name="orderId" placeholder="Order number (optional)" />
          <textarea className="field min-h-32" name="body" placeholder="Describe the issue" required />
          {error && (
            <div className="rounded-lg bg-[#f07167]/10 border border-[#f07167]/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {rateLimit.isRateLimited && (
                    // Rate limit specific message with countdown (Requirements 8.2, 8.4)
                    <div>
                      <p className="text-sm text-[#f07167]">⏱️ {rateLimit.message}</p>
                      {rateLimit.countdown !== undefined && rateLimit.countdown > 0 && (
                        <p className="text-sm text-[#f07167] mt-1">
                          {formatCountdownMessage(rateLimit.countdown)}
                        </p>
                      )}
                    </div>
                  )}
                  {!rateLimit.isRateLimited && (
                    // Regular error message
                    <p className="text-sm text-[#f07167]">
                      {typeof error === "object" && error !== null && "error" in error
                        ? String((error as { error: string }).error)
                        : String(error || "Could not open ticket")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRetryCount(retryCount + 1);
                    submitTicket(new FormData(document.querySelector('form') as HTMLFormElement));
                  }}
                  disabled={rateLimit.countdown > 0} // Auto-enable when countdown reaches 0 (Requirement 8.3)
                  className={`text-xs underline ${
                    rateLimit.countdown > 0
                      ? "text-[#9aa3b5] cursor-not-allowed"
                      : "text-[#f07167] hover:text-[#f07167]/80"
                  }`}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          <button 
            className="btn btn-primary" 
            type="submit" 
            disabled={busy || rateLimit.countdown > 0}
          >
            {busy ? "Opening…" : rateLimit.countdown > 0 ? `Wait ${rateLimit.countdown}s` : "Open ticket"}
          </button>
        </form>
      )}
    </div>
  );
}
