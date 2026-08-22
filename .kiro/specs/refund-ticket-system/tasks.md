# Implementation Plan: Automatic Refund & Ticket System

## Overview

This implementation plan breaks down the automatic refund system and functional ticket system into discrete coding tasks. The refund system will extend the existing order management to automatically calculate and process refunds for canceled or partially completed orders. The ticket system will provide a complete support workflow with email notifications and admin management.

## Tasks

- [x] 1. Create refund system types and database schema
  - Define TypeScript interfaces for `RefundCalculation`, `RefundResult`, and `RefundRequest` in `src/lib/types.ts`
  - Verify `orders` table has `paid` and `promo_code` columns (already exists per schema)
  - Create database migration for `tickets` and `ticket_messages` tables if they don't exist
  - Add necessary database indexes for performance (orders.status, tickets.user_id, ticket_messages.ticket_id)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 4.1, 4.4, 19.1_

- [x] 2. Implement refund calculation engine
  - [x] 2.1 Create `src/lib/refunds.ts` with `calculateRefundAmount()` function
    - Implement logic for full cancellation refunds (delivered = 0)
    - Implement logic for partial delivery refunds using proportional calculation
    - Implement precise rounding to 2 decimal places to avoid floating-point errors
    - Handle edge cases (fully delivered orders return 0)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 16.1, 16.2, 16.3, 20.1, 20.2, 20.3_
  
  - [ ]* 2.2 Write property test for refund amount calculation
    - **Property 2: Refund Amount Accuracy**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
    - Test that refund never exceeds order total
    - Test that calculation is deterministic (same input = same output)
    - Use fast-check to generate random order quantities, delivered amounts, and totals

- [x] 3. Implement refund processing workflow
  - [x] 3.1 Create `processRefund()` function in `src/lib/refunds.ts`
    - Validate order exists and is paid
    - Check order has not been previously refunded (idempotency)
    - Calculate refund amount using `calculateRefundAmount()`
    - Credit user wallet using existing `creditWallet()` from commerce.ts
    - Update order status to 'refunded' in database transaction
    - Implement rollback on failure to maintain data consistency
    - Return `RefundResult` with success status, amounts, and transaction ID
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 10.1, 10.2, 10.3, 12.1, 12.2, 12.3, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ]* 3.2 Write property test for refund idempotency
    - **Property 1: Refund Idempotency**
    - **Validates: Requirements 3.1, 3.2**
    - Test that processing the same refund multiple times results in exactly one transaction
    - Test that concurrent refund attempts are handled correctly

  - [ ]* 3.3 Write unit tests for refund error handling
    - Test order not found error case
    - Test unpaid order rejection
    - Test already refunded rejection
    - Test database failure rollback
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 4. Integrate refund system with order cancellation
  - [x] 4.1 Update `cancelOrder()` in `src/lib/orders.ts`
    - After successful cancellation, check if order is paid
    - If paid, automatically call `processRefund()` with reason='canceled'
    - Log refund result for audit trail
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.3_
  
  - [x] 4.2 Create function to handle partial order refunds
    - Create `markOrderPartial()` function in `src/lib/orders.ts`
    - Update order status to 'partial' based on delivered quantity
    - Automatically trigger `processRefund()` if not already refunded
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create ticket system types and database setup
  - Define TypeScript types for `Ticket`, `TicketMessage`, `CreateTicketInput`, `TicketReplyInput`, `TicketCategory`, `TicketStatus` in `src/lib/types.ts`
  - Create Supabase RLS policies for ticket access control (users see only their tickets, admins see all)
  - Ensure database schema includes tickets and ticket_messages tables with proper foreign keys
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.2, 8.3, 8.4_

- [x] 7. Implement ticket creation
  - [x] 7.1 Create `src/lib/tickets.ts` with `createTicket()` function
    - Validate input: non-empty subject, non-empty body (trimmed), valid category
    - Validate order ID if provided (check order exists)
    - Generate unique ticket ID and public ID (format: "TKT" + digits)
    - Support both authenticated users (userId) and guests (guestEmail)
    - Insert ticket record with status='open' in database transaction
    - Insert initial message with authorRole='customer'
    - Ensure atomic creation (both ticket and message or neither)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.2, 9.3, 9.4, 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 18.1, 18.2, 18.3, 18.4, 19.1, 19.2, 19.3, 19.4_
  
  - [ ]* 7.2 Write property test for ticket creation atomicity
    - **Property 6: Ticket Creation Atomicity**
    - **Validates: Requirements 19.1, 19.2, 19.3, 19.4**
    - Test that ticket and initial message are created together or not at all
    - Simulate database failures during creation

  - [ ]* 7.3 Write unit tests for ticket input validation
    - Test empty subject rejection
    - Test empty body rejection
    - Test invalid order ID rejection
    - Test whitespace trimming
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 8. Implement ticket reply and message management
  - [x] 8.1 Create `replyToTicket()` function in `src/lib/tickets.ts`
    - Validate ticket exists and is not closed
    - Validate reply body is non-empty (trimmed)
    - Insert new message with appropriate authorRole ('customer' or 'agent')
    - Update ticket's updated_at timestamp
    - Implement automatic status transition (open → in_progress on first agent reply)
    - Support optional explicit status updates
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 6.1, 6.2, 6.3, 6.4_
  
  - [x] 8.2 Create `getTicket()` and `listTicketMessages()` functions
    - Fetch ticket by ID with authorization check (owner or admin)
    - Retrieve messages ordered chronologically by created_at
    - _Requirements: 5.4, 8.1, 8.2_
  
  - [ ]* 8.3 Write property test for message chronological ordering
    - **Property 7: Message Chronological Ordering**
    - **Validates: Requirements 5.4**
    - Test that multiple rapid replies maintain strict timestamp ordering
    - Use fast-check to generate sequences of messages

- [x] 9. Implement email notification system
  - [x] 9.1 Set up email service in `src/lib/email.ts`
    - Install nodemailer dependency: `npm install nodemailer @types/nodemailer`
    - Configure SMTP transporter using environment variables
    - Create `sendEmail()` helper function
    - Add environment variables to `.env.local`: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SUPPORT_EMAIL
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 9.2 Implement ticket notification functions
    - Create `notifyNewTicket()` to send email to support team when ticket is created
    - Create `notifyTicketReply()` to send email to customer when agent replies
    - Create `notifyTicketUpdate()` to send email to support team when customer replies
    - Include ticket public ID, subject, and relevant context in emails
    - Handle email failures gracefully (log error, don't block ticket operations)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.3_
  
  - [x] 9.3 Integrate email notifications with ticket operations
    - Call `notifyNewTicket()` after successful ticket creation
    - Call `notifyTicketReply()` or `notifyTicketUpdate()` after adding reply based on author role
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 9.4 Write unit tests for email notification flow
    - Mock email service to verify notification calls
    - Test email content includes correct ticket information
    - Test email failure doesn't block ticket operations
    - _Requirements: 7.5_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create ticket API routes
  - [x] 11.1 Create `src/app/api/tickets/route.ts` for ticket listing and creation
    - POST endpoint: create new ticket using `createTicket()`
    - Validate authentication (allow both authenticated users and guests)
    - Return created ticket with public ID
    - GET endpoint: list tickets for current user (with pagination)
    - _Requirements: 4.1, 4.2, 4.3, 8.1, 9.1, 9.2_
  
  - [x] 11.2 Create `src/app/api/tickets/[id]/route.ts` for ticket details
    - GET endpoint: fetch specific ticket with messages
    - Implement authorization check (owner or admin)
    - _Requirements: 8.2, 8.3, 8.4_
  
  - [x] 11.3 Create `src/app/api/tickets/[id]/reply/route.ts` for replies
    - POST endpoint: add reply to ticket using `replyToTicket()`
    - Validate authorization based on author role
    - Support optional status update in request
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 6.1, 6.2, 6.4_

- [x] 12. Create refund API route
  - [x] 12.1 Create `src/app/api/orders/[id]/refund/route.ts`
    - POST endpoint: process refund for specific order
    - Validate user is order owner or admin
    - Call `processRefund()` with order ID and user ID
    - Return refund result with updated wallet balance
    - Handle errors and return appropriate error messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 10.1, 10.2, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 13. Implement ticket UI components
  - [x] 13.1 Create ticket creation form component
    - Build form with fields: category selector, subject input, body textarea, optional order ID input
    - Implement client-side validation (non-empty fields)
    - Submit to POST /api/tickets
    - Display success message with ticket public ID
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 15.1, 15.2_
  
  - [x] 13.2 Create ticket list view component
    - Fetch and display user's tickets from GET /api/tickets
    - Show ticket public ID, subject, status, category, and created date
    - Implement filtering by category and status
    - Add link to view ticket details
    - _Requirements: 8.1, 15.3, 15.4_
  
  - [ ] 13.3 Create ticket detail and reply component
    - Display ticket information (public ID, subject, category, status, order link if applicable)
    - Show all messages in chronological order
    - Implement reply form (textarea + submit)
    - Display author role for each message (customer vs agent)
    - For admins: add status update dropdown
    - _Requirements: 5.4, 6.1, 6.2, 6.4, 11.1, 11.2_

- [x] 14. Implement refund UI integration
  - [x] 14.1 Add refund button to order detail page
    - Show "Request Refund" button for eligible orders (paid, not refunded, canceled or partial)
    - On click, call POST /api/orders/[id]/refund
    - Display success message with refund amount and new wallet balance
    - Update order status to 'refunded' in UI
    - _Requirements: 2.3, 2.4, 2.5, 12.4_
  
  - [x] 14.2 Display refund transactions in wallet history
    - Show refund transactions with type badge
    - Include order public ID in transaction note
    - Allow filtering by transaction type
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 15. Create admin ticket management interface
  - [x] 15.1 Create admin tickets panel page
    - Display all tickets (not filtered by user)
    - Show ticket status, category, user, and created date
    - Implement sorting and filtering (by status, category, date)
    - Add quick actions: view, reply, change status
    - _Requirements: 8.3, 8.4, 15.3, 15.4_
  
  - [x] 15.2 Implement admin reply interface
    - Create admin-specific reply form with status update
    - Allow closing tickets (status='closed')
    - Prevent replies to closed tickets with clear error message
    - _Requirements: 5.5, 6.2, 6.3, 6.4_

- [x] 16. Add order-ticket association features
  - [x] 16.1 Link tickets to orders in UI
    - When creating ticket, allow selecting from user's orders
    - Display order public ID and link in ticket details
    - _Requirements: 4.7, 11.1, 11.2_
  
  - [x] 16.2 Show related tickets on order detail page
    - Query tickets associated with order ID
    - Display list of tickets with status and subject
    - Add link to create new ticket for this order
    - _Requirements: 11.3_

- [x] 17. Implement guest ticket support
  - [x] 17.1 Create guest ticket creation flow
    - Allow ticket creation without authentication
    - Require email address input for guests
    - Store ticket with null user_id and guest email
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 17.2 Create guest ticket tracking page
    - Allow lookup by ticket public ID
    - Display ticket details and messages without authentication
    - Allow guest to reply using email verification or unique link
    - _Requirements: 9.4, 18.4_

- [x] 18. Add audit logging for refunds
  - [x] 18.1 Create audit log entry for each refund
    - Log refund operations with actor (user or admin), timestamp, amount, and reason
    - Store audit entries in database or append to transaction notes
    - _Requirements: 10.3_
  
  - [ ]* 18.2 Write integration tests for audit trail
    - Test that all refund operations create audit entries
    - Verify audit entries contain required information

- [x] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Final integration and polish
  - [x] 20.1 Add input sanitization for XSS prevention
    - Escape HTML/script tags in ticket body before rendering
    - Sanitize email headers to prevent injection
    - _Requirements: Security considerations_
  
  - [x] 20.2 Implement rate limiting for refunds and ticket creation
    - Add rate limiting middleware (max 5 refund requests per minute per user)
    - Add rate limiting for ticket creation (prevent spam)
    - _Requirements: Security considerations_
  
  - [x] 20.3 Add loading states and error handling to UI
    - Show loading spinners during API calls
    - Display user-friendly error messages
    - Implement retry logic for failed operations
  
  - [ ]* 20.4 Write end-to-end integration tests
    - Test complete refund flow: create order → pay → cancel → verify refund → verify wallet balance
    - Test complete ticket flow: create ticket → admin reply → customer reply → resolve
    - Test guest ticket creation and tracking

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable intervals
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- The refund system integrates seamlessly with existing order and wallet infrastructure
- The ticket system provides complete support workflow with email notifications
- Both systems follow existing TypeScript and Next.js patterns in the codebase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "6.1"] },
    { "id": 1, "tasks": ["2.1", "7.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "7.2", "7.3", "8.1", "9.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1", "8.2", "8.3", "9.3", "9.4"] },
    { "id": 4, "tasks": ["4.2", "11.1", "11.2", "12.1"] },
    { "id": 5, "tasks": ["11.3", "13.1", "13.2", "14.1"] },
    { "id": 6, "tasks": ["13.3", "14.2", "15.1", "16.1"] },
    { "id": 7, "tasks": ["15.2", "16.2", "17.1", "18.1"] },
    { "id": 8, "tasks": ["17.2", "18.2", "20.1", "20.2"] },
    { "id": 9, "tasks": ["20.3", "20.4"] }
  ]
}
```
