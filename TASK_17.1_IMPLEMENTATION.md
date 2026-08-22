# Task 17.1 Implementation: Guest Ticket Creation Flow

## Overview
This document verifies the implementation of Task 17.1: Create guest ticket creation flow for the refund-ticket-system spec.

## Requirements Validated
- **9.1**: Allow ticket creation without authentication with email address input
- **9.2**: Store ticket with null user_id and guest email
- **9.3**: Send notifications to guest email when ticket receives replies
- **9.4**: Track guest tickets via unique Public_ID

## Implementation Summary

### 1. Database Schema (✓ Complete)
**File**: `supabase/migrations/001_refund_ticket_system.sql`

The tickets table includes the `guest_email` field:
```sql
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS guest_email text;
```

This allows storing the guest's email address when `user_id` is null.

### 2. TypeScript Types (✓ Complete)
**File**: `src/lib/types.ts`

The `CreateTicketInput` type supports both authenticated and guest users:
```typescript
export type CreateTicketInput = {
  userId?: string;        // Optional - for authenticated users
  guestEmail?: string;    // Optional - for guest users
  category: TicketCategory;
  subject: string;
  body: string;
  orderId?: string;
};
```

### 3. Business Logic (✓ Complete)
**File**: `src/lib/tickets.ts`

The `createTicket` function implements full guest support:

**Validation** (lines 103-106):
```typescript
// Requirement 9.1, 9.2: Ensure either userId or guestEmail is provided
if (!input.userId && !input.guestEmail) {
  throw new Error("Either userId or guestEmail must be provided");
}
```

**Database Storage** (lines 140-142):
```typescript
user_id: input.userId ?? null,
guest_email: input.guestEmail ?? null,
```

**Email Notifications for Guests** (lines 329-341 in `replyToTicket`):
```typescript
} else {
  // Guest ticket - get email from ticket table
  const { data: guestTicket } = await db
    .from("tickets")
    .select("guest_email")
    .eq("id", updatedTicket.id)
    .maybeSingle();

  if (guestTicket?.guest_email) {
    await notifyTicketReply(guestTicket.guest_email, updatedTicket.publicId, updatedTicket.subject);
  }
}
```

### 4. API Endpoint (✓ Complete)
**File**: `src/app/api/tickets/route.ts`

The POST endpoint validates and processes guest tickets:

**Validation** (lines 108-112):
```typescript
// Validate authentication: either authenticated user OR guest email
if (!user && !body.guestEmail?.trim()) {
  return NextResponse.json(
    { error: "Email address is required for guest tickets" },
    { status: 400 }
  );
}
```

**Ticket Creation** (lines 117-125):
```typescript
const ticket = await createTicket({
  userId: user?.id,
  guestEmail: !user ? body.guestEmail?.trim() : undefined,
  category: body.category as TicketCategory,
  subject: body.subject.trim(),
  body: body.body.trim(),
  orderId: body.orderId?.trim() || undefined,
});
```

### 5. User Interface (✓ Complete)
**File**: `src/app/tickets/new/page.tsx`

The ticket creation form includes guest email input:

**Email Field** (lines 173-186):
```typescript
{!user && (
  <div className="glass p-6">
    <label htmlFor="guestEmail" className="block text-sm font-medium mb-2">
      Your Email Address <span className="text-red-400">*</span>
    </label>
    <input
      id="guestEmail"
      type="email"
      className="field"
      placeholder="email@example.com"
      value={guestEmail}
      onChange={(e) => setGuestEmail(e.target.value)}
      required={!user}
    />
    <p className="text-xs text-[#9aa3b5] mt-2">
      We'll use this email to send updates about your ticket.
    </p>
  </div>
)}
```

**Client-side Validation** (lines 65-73):
```typescript
if (!user && !guestEmail.trim()) {
  return "Email address is required for guest tickets";
}

if (!user && guestEmail.trim() && !isValidEmail(guestEmail)) {
  return "Please enter a valid email address";
}
```

**Success Message for Guests** (lines 147-152):
```typescript
{createdTicketId && !user && (
  <p className="text-sm text-green-400/80 mt-2">
    Save your ticket ID ({createdTicketId}) to track your request.
  </p>
)}
```

### 6. Test Coverage (✓ Complete)
**File**: `src/lib/tickets.test.ts`

Tests include guest ticket scenarios:

**Guest Ticket Access Test** (lines 204-226):
```typescript
it("should handle guest tickets (null user_id) when accessed by admin", async () => {
  const mockTicketData = {
    id: "ticket-uuid",
    public_id: "TKT123456",
    user_id: null,
    category: "other",
    subject: "Guest ticket",
    status: "open",
    order_id: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  mockSupabase.maybeSingle.mockResolvedValue({
    data: mockTicketData,
    error: null,
  });

  const result = await getTicket("ticket-uuid", null, true);

  expect(result.userId).toBeNull();
  expect(result.subject).toBe("Guest ticket");
});
```

**Guest Email Notification Test** (lines 609-651):
```typescript
it("should call notifyTicketReply when agent replies to guest ticket", async () => {
  const mockTicketData = {
    id: "ticket-uuid",
    public_id: "TKT123456",
    user_id: null,
    guest_email: "guest@example.com",
    category: "payment",
    subject: "Guest ticket",
    status: "open",
    // ...
  };

  // ... test implementation

  expect(emailService.notifyTicketReply).toHaveBeenCalledWith(
    "guest@example.com",
    "TKT123456",
    "Guest ticket"
  );
});
```

## Feature Flow

### Guest User Journey
1. **Navigate to Ticket Creation**: User visits `/tickets/new` without authentication
2. **Form Display**: Email field is shown with required indicator
3. **Fill Form**: User enters:
   - Email address (required for guests)
   - Category
   - Subject
   - Message body
   - Optional order ID
4. **Client Validation**: Form validates email format before submission
5. **API Request**: POST to `/api/tickets` with `guestEmail` field
6. **Server Processing**:
   - Validates guest email is provided
   - Creates ticket with `user_id: null` and `guest_email: "guest@example.com"`
   - Generates unique public ID (e.g., "TKT123456")
   - Sends email notification to support team
7. **Success Response**: User sees ticket ID and is told to save it for tracking
8. **Future Replies**: When admin replies:
   - System looks up `guest_email` from ticket record
   - Sends notification to guest's email address

### Authenticated User Journey (No Changes)
1. User is logged in
2. Form shows without email field
3. Ticket created with `user_id` populated
4. User can view all their tickets in `/tickets`

## Database Records

### Guest Ticket Example
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "public_id": "TKT123456",
  "user_id": null,
  "guest_email": "guest@example.com",
  "category": "payment",
  "subject": "Payment processing issue",
  "status": "open",
  "order_id": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Authenticated User Ticket Example
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "public_id": "TKT123457",
  "user_id": "user-uuid-here",
  "guest_email": null,
  "category": "order",
  "subject": "Order delivery issue",
  "status": "open",
  "order_id": "CF789012",
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

## Security Considerations

### Row-Level Security (RLS)
**File**: `supabase/migrations/001_refund_ticket_system.sql`

Guest tickets are protected with RLS policies:

```sql
-- Users can create tickets (either with user_id or as guest with null user_id)
CREATE POLICY "users_create_tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
```

This allows:
- Authenticated users to create tickets with their user_id
- Unauthenticated users to create tickets with null user_id (guest mode)

### Data Isolation
- Guest tickets cannot be listed by authenticated users (they only see their own tickets)
- Admins can view all tickets (including guest tickets)
- Guest users track tickets via the public ID only (no login required)

## Testing Verification

### Manual Testing Steps
1. **Create Guest Ticket**:
   - Open browser in incognito/private mode
   - Navigate to `http://localhost:3000/tickets/new`
   - Fill in email, category, subject, and body
   - Submit form
   - Verify success message with ticket ID

2. **Verify Database Record**:
   - Check Supabase tickets table
   - Confirm `user_id` is null
   - Confirm `guest_email` is populated

3. **Admin Reply**:
   - Login as admin
   - View the guest ticket
   - Reply to the ticket
   - Check email is sent to guest's email address

### Automated Testing
Run the test suite:
```bash
npm test src/lib/tickets.test.ts
```

Expected results:
- ✓ Guest ticket creation with null user_id
- ✓ Email notification to guest email on reply
- ✓ Validation of missing identifiers
- ✓ Ticket access control

## Requirements Traceability

| Requirement | Implemented | File(s) | Lines |
|-------------|-------------|---------|-------|
| 9.1 - Guest can create ticket with email | ✓ | tickets.ts | 103-106 |
| 9.2 - Store with null user_id and guest email | ✓ | tickets.ts | 140-142 |
| 9.3 - Send notifications to guest email | ✓ | tickets.ts | 329-341 |
| 9.4 - Track via public ID | ✓ | tickets.ts | 125 |
| 4.1, 4.2, 4.3 - Validate subject, body, category | ✓ | tickets.ts | 78-100 |
| 14.1, 14.2, 14.3 - Input validation | ✓ | tickets.ts | 78-82 |

## Conclusion

Task 17.1 has been **fully implemented** with:
- ✓ Complete database schema support
- ✓ Full TypeScript type definitions
- ✓ Comprehensive business logic with validation
- ✓ API endpoint with error handling
- ✓ User interface with email field for guests
- ✓ Email notification support for guest tickets
- ✓ Unit test coverage
- ✓ Row-level security policies

The guest ticket creation flow is production-ready and meets all specified requirements.
