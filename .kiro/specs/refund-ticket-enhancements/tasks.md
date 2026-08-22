# Implementation Plan: Bug Fixes and UI Enhancements for Refund-Ticket System

## Overview

This implementation plan breaks down 38 requirements into actionable coding tasks. The plan follows a phased approach, prioritizing critical bug fixes before UI enhancements to ensure system stability.

The implementation is organized into logical groups:
1. **Critical Bug Fixes** (Refund system, validation, authentication)
2. **Core UI Improvements** (Loading states, empty states, toast notifications)
3. **Search and Filtering** (Search functionality, pagination, filter presets)
4. **Admin Tools** (Bulk actions, quick replies, analytics)
5. **Advanced Features** (File uploads, real-time updates, export)
6. **Mobile & Accessibility** (Responsive design, dark mode, animations)
7. **Enhanced User Experience** (Markdown, reactions, templates, auto-save)

## Tasks

- [x] 1. Fix Critical Refund System Bugs
  - [x] 1.1 Implement atomic refund processing with rollback
    - Create `processRefund` function in `src/lib/commerce.ts` that handles wallet credit and order status update atomically
    - Add rollback logic: if order update fails, create debit transaction to reverse wallet credit
    - Add comprehensive audit logging for all refund operations
    - Return clear error messages indicating refund failure and need for retry
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 1.2 Write integration tests for refund rollback
    - Test wallet credit succeeds but order update fails scenario
    - Verify debit transaction is created to reverse credit
    - Verify wallet balance remains unchanged after rollback
    - Test complete success path
    - Test complete failure path (both operations fail)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.3 Add authentication and authorization checks to refund API
    - Create `requireAuth` middleware function
    - Verify user session exists
    - Verify user owns the order OR is admin
    - Return 401 for unauthenticated, 403 for unauthorized requests
    - Apply middleware to `/api/refund` route
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 1.4 Write unit tests for refund authentication
    - Test unauthenticated request returns 401
    - Test non-owner request returns 403
    - Test owner request succeeds
    - Test admin request succeeds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 1.5 Implement optimistic locking for wallet operations
    - Update `creditWallet` and `debitWallet` to use optimistic locking
    - Add `expectedBalance` parameter to verify balance before update
    - Implement retry logic when race condition detected
    - Add wallet balance consistency check function
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 1.6 Write integration tests for wallet race conditions
    - Test concurrent refund operations maintain correct balance
    - Test concurrent deposit and debit operations
    - Verify final balance equals sum of all transactions
    - Test retry logic when optimistic lock fails
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. Fix Ticket System Validation and Routing Bugs
  - [x] 2.1 Consolidate ticket validation logic
    - Create `validateTicketInput` function returning `ValidationResult` with distinct errors array
    - Update ticket creation endpoint to use consolidated validation
    - Ensure subject and body errors are distinct and non-repetitive
    - Add validation for all required fields with specific error messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 2.2 Write unit tests for ticket validation
    - Test empty subject returns single "Subject is required" error
    - Test empty body returns single "Message body is required" error
    - Test both empty returns two distinct errors
    - Test body exceeding 5000 characters returns specific error
    - Test invalid category returns specific error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 2.3 Update support page to capture guest email
    - Add email input field to support form that shows for unauthenticated users
    - Add email format validation (regex pattern)
    - Make email required for guests, optional for authenticated users
    - Update form submission to include `guestEmail` in API request
    - Update ticket creation API to accept and store `guestEmail`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 2.4 Fix ticket routing to use UUID internally and Public ID in URLs
    - Update ticket list links to use `publicId` instead of `id`
    - Update ticket detail page route to accept `publicId` parameter
    - Update `getTicketByPublicId` function if needed
    - Add "Ticket not found" error handling with user-friendly message
    - Test all ticket navigation flows
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 2.5 Align support page category dropdown with TicketCategory enum
    - Create `CATEGORY_OPTIONS` mapping with value (enum) and label (display)
    - Update category dropdown to use mapped values
    - Ensure submitted value matches enum exactly
    - Update server-side validation to check against enum
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. Implement Transaction Parsing Enhancement
  - [x] 3.1 Create flexible order ID parser
    - Implement `parseOrderId` function with pattern `/\b([A-Z]{2,4})(\d{6,8})\b/i`
    - Support configurable prefixes (CF, TKT, ORD, etc.)
    - Return `OrderIdParseResult` with prefix, number, and fullId
    - Return null instead of throwing errors when no match found
    - Make matching case-insensitive
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 3.2 Write unit tests for order ID parsing
    - Test standard formats: CF123456, TKT987654, ORD555555
    - Test various prefix lengths (2-4 characters)
    - Test case insensitivity: cf123456, Cf123456, CF123456
    - Test extraction from sentences: "Order CF123456 received"
    - Test no match returns null without throwing
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Checkpoint - Core Bug Fixes Complete
  - Ensure all tests pass for bug fixes
  - Manually test refund flow with rollback scenarios
  - Verify ticket creation and validation work correctly
  - Check transaction parsing with various formats

- [x] 5. Implement Core UI Components
  - [x] 5.1 Create rate limit feedback component with countdown
    - Create `useRateLimitFeedback` hook to parse 429 errors and Retry-After header
    - Implement countdown timer that decrements every second
    - Auto-enable retry button when countdown reaches 0
    - Display user-friendly message: "Too many requests. Please wait X seconds..."
    - Apply to all API request error handling
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 5.2 Add loading states to ticket and transaction lists
    - Create `LoadingSpinner` component with centered layout
    - Add `isLoading` state to ticket list page
    - Add `isLoading` state to transaction list page
    - Disable filter controls while loading
    - Show error message with retry button on failure
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 5.3 Create empty state component with SVG illustrations
    - Create reusable `EmptyState` component accepting type, title, description, action props
    - Design SVG illustrations for tickets, transactions, refunds, orders
    - Use application's color palette in SVGs
    - Include actionable text and optional action button
    - Apply to ticket list, transaction list, and refund history pages
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 5.4 Implement toast notification system
    - Create `ToastProvider` and `useToast` hook
    - Support types: success, error, info, warning with color coding
    - Implement auto-dismiss after 5 seconds
    - Add manual dismiss button
    - Implement vertical stacking for multiple toasts
    - Add slide-in animation
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_
  
  - [x] 5.5 Replace inline errors with toast notifications across app
    - Update refund API error handling to use toasts
    - Update ticket creation error handling to use toasts
    - Update transaction error handling to use toasts
    - Keep inline errors only for form validation
    - Show success toasts for all successful operations
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [ ] 6. Implement Search, Filtering, and Pagination
  - [ ] 6.1 Add search functionality to ticket list
    - Create `useTicketSearch` hook with debounced input (300ms)
    - Filter tickets by subject and publicId (case-insensitive, partial match)
    - Add search input field above ticket list
    - Show "No results found" message when search returns empty
    - Preserve other filters when searching
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 6.2 Add search functionality to transaction list
    - Create `useTransactionSearch` hook with debounced input
    - Filter transactions by orderId and note (case-insensitive, partial match)
    - Add search input field above transaction list
    - Show "No results found" message when search returns empty
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 6.3 Implement pagination for ticket list
    - Create `usePagination` hook with currentPage, pageSize, totalItems
    - Set pageSize to 25 for tickets
    - Add pagination controls: Previous, Next, page numbers
    - Show current page and total pages
    - Sync page number with URL query parameter (?page=N)
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_
  
  - [ ] 6.4 Implement pagination for transaction list
    - Use `usePagination` hook with pageSize 50 for transactions
    - Add pagination controls: Previous, Next, page numbers
    - Sync page number with URL query parameter
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_
  
  - [ ] 6.5 Add filter presets for ticket list
    - Create `TICKET_PRESETS` array with "My Open Tickets", "Resolved", "All"
    - Add preset button group above manual filters
    - Highlight active preset
    - Apply corresponding filters when preset clicked
    - Only show "My Open Tickets" for authenticated users
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 7. Implement Refund Preview and History Features
  - [ ] 7.1 Add refund amount preview to orders
    - Create `calculateRefundPreview` function
    - Calculate refundable amount based on delivered vs total quantity
    - Display original amount, delivered percentage, and refundable amount
    - Show explanation text (e.g., "Refund for 200 undelivered items" or "Order fully delivered")
    - Disable refund button when refundable amount is zero
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ] 7.2 Create dedicated refund history page
    - Create new page at `/refunds` or `/wallet/refunds`
    - List all refunded orders with orderId, original amount, refund amount, date
    - Make list sortable by date and amount
    - Add pagination (25 refunds per page)
    - Calculate and display total refunded amount
    - Apply empty state when no refunds exist
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [ ] 8. Implement Ticket Status Timeline and Priority
  - [ ] 8.1 Create ticket status timeline component
    - Create `TicketTimeline` component showing status transitions
    - Display all status changes with timestamps in chronological order
    - Visually highlight current status
    - Use vertical timeline design with dots and connecting lines
    - Format timestamps as relative time with tooltip for absolute time
    - Add to ticket detail page
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 8.2 Add priority levels to ticket system
    - Update `Ticket` type to include optional `priority` field
    - Support priority levels: urgent, high, normal, low
    - Allow admins to set priority when creating tickets
    - Create colored badge component for priority display
    - Add priority sorting to ticket list
    - Update database schema if needed (add priority column)
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [ ] 9. Checkpoint - Core UI Features Complete
  - Ensure all core UI components render correctly
  - Test search and filtering across different scenarios
  - Verify pagination works with URL sync
  - Check refund preview calculations
  - Review ticket timeline display

- [ ] 10. Implement Admin Tools
  - [ ] 10.1 Add bulk actions for ticket management
    - Create `useBulkActions` hook managing selectedIds and handlers
    - Add checkbox column to admin ticket list
    - Add "Select All" checkbox in table header
    - Show bulk action buttons when tickets selected: "Close", "Update Status"
    - Implement bulk close operation
    - Implement bulk status update operation
    - Show progress indicator during bulk operations
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ] 10.2 Create quick reply templates system
    - Define `DEFAULT_TEMPLATES` array with common responses
    - Add template dropdown above reply textarea in admin panel
    - Populate textarea with template content when selected
    - Allow editing before sending
    - Store templates in admin settings (future: make configurable)
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [ ] 10.3 Build analytics dashboard for admin panel
    - Create analytics calculation function `getTicketAnalytics`
    - Calculate average response time (minutes)
    - Calculate resolution rate (percentage)
    - Count tickets by category and status
    - Create dashboard page with metric cards
    - Add bar chart for tickets by category
    - Add line chart for daily ticket trends
    - Add date range filter
    - Implement auto-refresh every 5 minutes
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5_

- [ ] 11. Implement Advanced Features
  - [ ] 11.1 Add file attachment upload to tickets
    - Create `uploadAttachment` function using Supabase Storage
    - Add file upload button to ticket creation form
    - Validate file types (JPEG, PNG, GIF, WebP) server-side
    - Enforce 5MB maximum file size
    - Show thumbnail preview after upload
    - Store attachment URLs in `ticket_messages.attachments` JSONB field
    - Display attachments in ticket detail view
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ]* 11.2 Write unit tests for file upload validation
    - Test accepted file types pass validation
    - Test rejected file types fail validation
    - Test file size under limit succeeds
    - Test file size over limit fails
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ] 11.3 Implement real-time ticket updates with polling
    - Create `useTicketRealtime` hook with 10-second polling interval
    - Fetch latest messages and compare with current list
    - Append new messages smoothly to list
    - Show visual indicator when new messages arrive
    - Stop polling when user navigates away
    - Preserve scroll position during updates
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ] 11.4 Add CSV export for transactions
    - Create `exportData` function supporting CSV format
    - Add "Export to CSV" button to transaction list
    - Include all transaction fields in export
    - Generate filename with timestamp: `transactions_YYYY-MM-DD.csv`
    - Trigger browser download
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [ ] 11.5 Add PDF export for tickets
    - Integrate PDF generation library (jsPDF or server-side Puppeteer)
    - Add "Export Ticket" button to ticket detail page
    - Include ticket details, all messages, and status history in PDF
    - Generate filename with pattern: `ticket_{publicId}_YYYY-MM-DD.pdf`
    - Trigger browser download
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 12. Implement Mobile Responsiveness and Accessibility
  - [ ] 12.1 Add mobile swipe actions to ticket list
    - Create `useSwipeActions` hook detecting touch gestures
    - Implement swipe-to-close gesture for tickets on mobile
    - Add visual feedback during swipe
    - Calculate swipe distance threshold
    - Apply only on screens <768px
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ] 12.2 Make tables responsive and touch-friendly
    - Add horizontal scrolling to tables on mobile
    - Stack filter controls vertically on small screens (<640px)
    - Increase button size to minimum 44x44 pixels for touch targets
    - Add increased padding on mobile
    - Test responsive layout from 320px to 1920px
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ] 12.3 Improve dark mode contrast ratios
    - Define dark mode color variables with WCAG AA compliance
    - Ensure all text meets 4.5:1 contrast ratio
    - Update border colors for better visibility in dark mode
    - Adjust status badge colors for sufficient contrast
    - Make disabled buttons visually distinct
    - Use Figma or contrast checker tool to verify
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_
  
  - [ ]* 12.4 Run accessibility audit
    - Run axe-core accessibility linter on all pages
    - Test keyboard-only navigation through all features
    - Add missing aria-labels to icon buttons
    - Ensure focus indicators are visible
    - Test with screen reader (NVDA or JAWS)
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

- [ ] 13. Implement Animated UI Enhancements
  - [ ] 13.1 Add status transition animations
    - Create `AnimatedStatusBadge` component with CSS transitions
    - Animate color change on status update (300ms ease-in-out)
    - Respect `prefers-reduced-motion` media query
    - Apply to ticket list and detail pages
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [ ] 13.2 Add confetti animation for resolved tickets
    - Integrate `canvas-confetti` library
    - Create `ConfettiCelebration` component
    - Trigger confetti when ticket status changes to "resolved"
    - Use application's accent colors
    - Duration: 2 seconds with fade out
    - Respect `prefers-reduced-motion` media query
    - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5_
  
  - [ ] 13.3 Add character count with color coding
    - Create `CharacterCounter` component
    - Implement `getCharacterCountColor` function
    - Green for <4000 characters (safe zone)
    - Yellow for 4000-4800 characters (warning zone)
    - Red for 4800-5000 characters (danger zone)
    - Add to ticket body textarea
    - Prevent input at 5000 characters
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

- [ ] 14. Implement Enhanced Time Display and Copy Features
  - [ ] 14.1 Add relative time with absolute tooltips
    - Create `RelativeTime` component
    - Display relative time by default (e.g., "3 days ago")
    - Show tooltip with exact timestamp on hover
    - Format timestamps in user's locale
    - Update relative time dynamically every minute
    - Apply to all timestamp displays
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_
  
  - [ ] 14.2 Add copy-to-clipboard buttons for IDs
    - Create `CopyButton` component
    - Use `navigator.clipboard.writeText` API
    - Show brief "Copied!" feedback after successful copy
    - Add copy buttons next to ticket IDs, order IDs, transaction IDs
    - Ensure cross-browser compatibility
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

- [ ] 15. Implement Order Quick Actions Menu
  - [ ] 15.1 Create order actions dropdown menu
    - Create `OrderActionsMenu` component with dropdown
    - Include actions: "Request Refund", "Contact Support", "View Details"
    - "Request Refund" opens refund modal with order context
    - "Contact Support" opens ticket form with orderId pre-filled
    - "View Details" navigates to order detail page
    - Make dropdown keyboard accessible (Tab, Enter, Escape)
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [ ] 16. Checkpoint - Advanced Features Complete
  - Verify file uploads work correctly
  - Test real-time updates polling
  - Verify CSV and PDF exports generate correctly
  - Check mobile responsiveness across devices
  - Test animations and transitions

- [ ] 17. Implement Markdown and Rich Text Features
  - [ ] 17.1 Add markdown support for ticket messages
    - Integrate `marked` library for parsing and `DOMPurify` for sanitization
    - Create `renderMarkdown` function
    - Support bold, italic, lists, and links
    - Sanitize output to prevent XSS attacks
    - Add formatting toolbar above textarea
    - Add preview tab to see formatted output
    - Apply to ticket message display
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5_
  
  - [ ] 17.2 Implement rich text editor option
    - Integrate lightweight WYSIWYG editor (Lexical or Tiptap)
    - Create `RichTextEditor` component
    - Add formatting buttons: bold, italic, underline, lists, links
    - Add keyboard shortcuts (Ctrl+B, Ctrl+I)
    - Convert output to markdown or HTML for storage
    - Make accessible with ARIA labels
    - Allow toggling between markdown and WYSIWYG modes
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5_

- [ ] 18. Implement Emoji Reactions and Ticket Templates
  - [ ] 18.1 Add emoji reactions to agent replies
    - Add `reactions` JSONB column to `ticket_messages` table
    - Create `MessageReaction` interface
    - Implement `addReaction` function with one-reaction-per-user limit
    - Add reaction buttons below agent replies: 👍, ❤️, 😕
    - Display reaction counts
    - Highlight user's reaction
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5_
  
  - [ ] 18.2 Create ticket template system
    - Define `TICKET_TEMPLATES` array with common issues
    - Include templates: "Refund Request", "Delivery Delay", "Wrong Link"
    - Add "Use Template" dropdown to ticket creation form
    - Pre-fill subject, category, and body when template selected
    - Allow editing before submission
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_

- [ ] 19. Implement Auto-Save Draft Feature
  - [ ] 19.1 Add auto-save for ticket drafts
    - Create `useAutoSaveDraft` hook saving to localStorage
    - Save draft every 5 seconds while typing
    - Store subject, category, body, and orderId
    - Restore draft when returning to form
    - Show "Draft saved" indicator after each save
    - Clear draft after successful ticket submission
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

- [ ] 20. Final Integration and Testing
  - [ ] 20.1 Perform end-to-end testing of complete refund flow
    - Test refund with successful wallet credit and order update
    - Test refund rollback when order update fails
    - Test refund with authentication and authorization
    - Verify wallet balance consistency
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 20.2 Perform end-to-end testing of complete ticket flow
    - Test guest ticket creation with email
    - Test authenticated ticket creation
    - Test ticket reply and status updates
    - Test file attachment upload and display
    - Test real-time message updates
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 17.1, 17.2, 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ] 20.3 Cross-browser compatibility testing
    - Test in Chrome, Firefox, Safari, Edge
    - Verify clipboard API works in all browsers
    - Verify file uploads work in all browsers
    - Check CSS compatibility and fallbacks
  
  - [ ] 20.4 Performance optimization pass
    - Lazy load heavy components (analytics charts, rich text editor, confetti)
    - Implement React.memo for expensive renders
    - Optimize bundle size for chart libraries (<50KB gzipped)
    - Add dynamic imports for admin-only features
    - Verify pagination reduces initial load time
  
  - [ ] 20.5 Security audit
    - Review all authentication checks
    - Verify XSS prevention in markdown rendering
    - Check file upload validation server-side
    - Review rate limiting implementation
    - Ensure no sensitive data in error messages

- [ ] 21. Final Checkpoint - Production Readiness
  - All integration tests pass
  - All unit tests pass
  - Cross-browser testing complete
  - Performance benchmarks met
  - Security audit complete
  - Documentation updated
  - Ready for deployment

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Critical bug fixes (tasks 1-3) should be deployed first before UI enhancements
- Use feature flags for gradual rollout of advanced features (file uploads, real-time updates, analytics)
- Maintain backward compatibility with existing codebase patterns
- Follow TypeScript and Next.js best practices throughout implementation
- All UI components should be accessible (WCAG AA) and responsive (320px - 1920px)
- Checkpoints ensure incremental validation and allow for user feedback

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.3", "2.1", "2.3", "3.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "1.4", "2.2", "2.4", "2.5", "3.2"]
    },
    {
      "id": 2,
      "tasks": ["1.5", "5.1", "5.2", "5.3", "5.4"]
    },
    {
      "id": 3,
      "tasks": ["1.6", "5.5", "6.1", "6.2", "6.3", "6.4"]
    },
    {
      "id": 4,
      "tasks": ["6.5", "7.1", "7.2", "8.1", "8.2"]
    },
    {
      "id": 5,
      "tasks": ["10.1", "10.2", "11.1", "13.1", "13.2", "13.3"]
    },
    {
      "id": 6,
      "tasks": ["11.2", "11.3", "11.4", "11.5", "14.1", "14.2", "15.1"]
    },
    {
      "id": 7,
      "tasks": ["10.3", "12.1", "12.2", "12.3"]
    },
    {
      "id": 8,
      "tasks": ["12.4", "17.1", "17.2", "18.1", "18.2", "19.1"]
    },
    {
      "id": 9,
      "tasks": ["20.1", "20.2", "20.3", "20.4", "20.5"]
    }
  ]
}
```
