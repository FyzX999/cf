# Toast Integration Example

This document shows how to integrate the toast notification system into the support page, replacing inline errors with toast notifications (Task 5.5).

## Before (Current Implementation)

The current support page uses inline error messages:

```typescript
{error && (
  <div className="rounded-lg bg-[#f07167]/10 border border-[#f07167]/20 p-3">
    <p className="text-sm text-[#f07167]">
      {typeof error === "object" && error !== null && "error" in error
        ? String((error as { error: string }).error)
        : "Could not open ticket"}
    </p>
  </div>
)}
```

## After (With Toast Notifications)

### Modified Support Page with Toasts

```typescript
"use client";

import { useState, useEffect } from "react";
import type { TicketCategory } from "@/lib/types";
import { useRateLimitFeedback, formatCountdownMessage } from "@/lib/useRateLimitFeedback";
import { useToast } from "@/components/ToastProvider"; // Import useToast hook

const CATEGORY_OPTIONS: Array<{ value: TicketCategory; label: string }> = [
  { value: "order", label: "Order Issue" },
  { value: "payment", label: "Payment Issue" },
  { value: "refill", label: "Refill Request" },
  { value: "account", label: "Account Issue" },
  { value: "api", label: "API Issue" },
  { value: "service", label: "Service Question" },
  { value: "other", label: "Other" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SupportPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [lastResponse, setLastResponse] = useState<Response | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // Add toast hook
  const { show } = useToast();

  // Rate limit feedback hook
  const rateLimit = useRateLimitFeedback(error, lastResponse);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/tickets", { method: "GET" });
        const json = await res.json();
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
      // Show toast for inline validation (optional - keep inline for form validation)
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
        category: String(formData.get("category") || "other"),
        subject: String(formData.get("subject") || ""),
        orderId: String(formData.get("orderId") || ""),
        body: String(formData.get("body") || ""),
      };

      if (!isAuthenticated) {
        payload.guestEmail = guestEmail;
      }

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      setLastResponse(res);
      const json = await res.json();
      
      if (!res.ok) {
        // Handle rate limit separately
        if (res.status === 429) {
          setError(json);
          show({
            type: "warning",
            message: rateLimit.message || "Too many requests. Please wait before trying again.",
            duration: 10000, // Longer duration for rate limit
          });
        } else {
          // Show error toast for other errors
          show({
            type: "error",
            message: json.error || "Failed to create ticket. Please try again.",
          });
        }
        throw json;
      }
      
      // Success!
      setSent(json.ticket.publicId);
      show({
        type: "success",
        message: `Ticket #${json.ticket.publicId} created successfully!`,
      });
    } catch (err) {
      setError(err);
      // Error toast already shown above
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Support center</h1>
      <p className="muted mt-2 text-sm">
        Tickets are threaded like a conversation. Agents see your orders, payments, and history.
      </p>
      
      {sent ? (
        <div className="glass mt-6 p-5">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-[#3ddc97]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Ticket #{sent} opened. We&apos;ll reply in your dashboard inbox.</span>
          </div>
        </div>
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
          
          {/* Email field for guest users - keep inline validation error */}
          {isAuthenticated === false && (
            <div>
              <input
                className="field"
                name="guestEmail"
                type="email"
                placeholder="Your email address"
                required
                onChange={(e) => {
                  if (emailError) {
                    setEmailError(null);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    validateEmail(e.target.value);
                  }
                }}
              />
              {/* Keep inline error for form validation */}
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
          
          {/* Rate limit countdown - keep minimal inline feedback */}
          {rateLimit.isRateLimited && (
            <p className="text-sm text-[#f5b942]">
              ⏱️ {formatCountdownMessage(rateLimit.countdown)}
            </p>
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
```

## Key Changes

### 1. Import Toast Hook
```typescript
import { useToast } from "@/components/ToastProvider";
const { show } = useToast();
```

### 2. Replace Error Display with Toasts

**Before:**
```typescript
{error && (
  <div className="rounded-lg bg-[#f07167]/10 border border-[#f07167]/20 p-3">
    <p className="text-sm text-[#f07167]">{errorMessage}</p>
  </div>
)}
```

**After:**
```typescript
// In the catch block
show({
  type: "error",
  message: json.error || "Failed to create ticket. Please try again.",
});
```

### 3. Add Success Toast
```typescript
// On successful ticket creation
show({
  type: "success",
  message: `Ticket #${json.ticket.publicId} created successfully!`,
});
```

### 4. Special Handling for Rate Limits
```typescript
if (res.status === 429) {
  show({
    type: "warning",
    message: rateLimit.message || "Too many requests. Please wait before trying again.",
    duration: 10000, // Longer duration for important warnings
  });
}
```

## Best Practices

### When to Use Inline Errors vs Toasts

**Use Inline Errors For:**
- Form field validation (email format, required fields)
- Input-specific errors that need to be next to the field
- Persistent errors that shouldn't auto-dismiss

**Use Toasts For:**
- Operation results (success/failure)
- Network errors
- Rate limit notifications
- General feedback messages
- Non-critical information

### Toast Duration Guidelines

```typescript
// Quick success messages
show({ type: "success", message: "Saved!", duration: 3000 });

// Standard messages (default)
show({ type: "info", message: "Processing...", duration: 5000 });

// Important warnings
show({ type: "warning", message: "Rate limited", duration: 10000 });

// Critical errors (manual dismiss)
show({ type: "error", message: "Critical failure", duration: 0 });
```

## Migration Checklist

When replacing inline errors with toasts in other components:

- [ ] Import `useToast` hook
- [ ] Replace error display blocks with `show()` calls
- [ ] Add success toasts for successful operations
- [ ] Keep inline validation errors for form fields
- [ ] Test with multiple simultaneous toasts
- [ ] Verify accessibility (screen readers)
- [ ] Test on mobile devices
- [ ] Ensure error messages are user-friendly

## Other Components to Update (Task 5.5)

1. **Refund API error handling** - Show toasts instead of inline errors
2. **Ticket creation** - Success and error toasts (shown above)
3. **Transaction operations** - Success/error feedback
4. **Authentication flows** - Login/logout feedback
5. **File uploads** - Progress and completion feedback
6. **Admin operations** - Bulk action results

## Example: Refund Button with Toast

```typescript
"use client";

import { useToast } from "@/components/ToastProvider";

export function RefundButton({ orderId }: { orderId: string }) {
  const { show } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRefund = async () => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/refund`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        show({
          type: "success",
          message: `Refund of $${data.amount.toFixed(2)} processed successfully!`,
        });
      } else {
        show({
          type: "error",
          message: data.error || "Failed to process refund. Please try again.",
        });
      }
    } catch (error) {
      show({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleRefund}
      disabled={isProcessing}
      className="btn btn-primary"
    >
      {isProcessing ? "Processing..." : "Request Refund"}
    </button>
  );
}
```

## Testing

1. Navigate to `/test-toast` to verify toast system works
2. Submit a ticket to see success toast
3. Submit invalid ticket to see error toast
4. Trigger rate limit to see warning toast
5. Check multiple toasts stack properly
6. Verify auto-dismiss timing
7. Test manual dismiss button
8. Check mobile responsiveness

## Accessibility Notes

The toast system is accessible:
- Uses `role="alert"` for screen readers
- Has `aria-live="polite"` region
- Dismiss buttons have `aria-label`
- Color is not the only indicator (icons included)
- Keyboard accessible (Tab to dismiss button, Enter to dismiss)

## Conclusion

The toast notification system provides a cleaner, more modern UX compared to inline errors. By following this integration pattern, you can consistently show feedback across the entire application while keeping form validation errors inline where they belong.
