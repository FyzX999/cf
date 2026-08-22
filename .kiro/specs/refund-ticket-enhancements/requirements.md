# Requirements Document: Bug Fixes and UI Enhancements for Refund-Ticket System

## Introduction

This specification addresses 10 critical/medium/minor bugs and implements 25+ UI improvements to enhance the refund and ticket support system. The goal is to improve system reliability, user experience, and operational efficiency while maintaining backward compatibility with existing code patterns.

## Glossary

- **Refund_System**: The automated system that processes refund requests for canceled or partially delivered orders
- **Ticket_System**: The support ticket management system for customer inquiries and issues
- **Guest_User**: An unauthenticated user who can submit support tickets without an account
- **Wallet**: The user's account balance that receives refund credits
- **Transaction_Record**: A record of financial activity (deposits, orders, refunds) in the wallet
- **Order**: A service purchase with quantity, delivery status, and payment information
- **Rollback**: The process of reversing changes when a transaction fails partway through
- **Rate_Limiter**: System component that prevents excessive API requests
- **Public_ID**: A user-facing identifier (e.g., "TKT123456" for tickets, "CF123456" for orders)
- **UUID**: Internal database identifier (universally unique identifier)
- **Empty_State**: Visual display shown when no data exists (no tickets, orders, or transactions)
- **Toast_Notification**: A temporary popup message providing feedback on user actions
- **Admin_Panel**: Dashboard interface for support agents to manage tickets and users

## Requirements

### Requirement 1: Complete Refund Rollback on Partial Failure

**User Story:** As a system administrator, I want refund operations to be fully atomic, so that partial failures don't leave the system in an inconsistent state.

#### Acceptance Criteria

1. WHEN a wallet credit succeeds but the order status update fails, THEN THE Refund_System SHALL rollback the wallet credit
2. WHEN a rollback is required, THE Refund_System SHALL create a debit transaction to reverse the credit
3. WHEN a rollback occurs, THE Refund_System SHALL log the failure with full details for audit purposes
4. THE Refund_System SHALL return a clear error message indicating the refund failed and needs retry
5. FOR ANY refund operation, either all database changes succeed or none persist (atomic operation)

### Requirement 2: Eliminate Duplicate Validation Error Messages

**User Story:** As a user, I want to see clear, non-repetitive error messages, so that I understand exactly what went wrong.

#### Acceptance Criteria

1. WHEN subject validation fails, THE Ticket_System SHALL return exactly one error message
2. WHEN body validation fails, THE Ticket_System SHALL return exactly one error message
3. WHEN multiple validation failures occur, THE Ticket_System SHALL combine them into distinct messages
4. THE Ticket_System SHALL not repeat the same error text for subject and body validation
5. FOR ANY validation error, the error message SHALL clearly identify which field failed

### Requirement 3: Pass Guest Email to Support Page

**User Story:** As a guest user, I want my email to be captured when I submit a support ticket, so that agents can contact me.

#### Acceptance Criteria

1. WHEN an unauthenticated user accesses /support, THE Support_Page SHALL prompt for email address
2. WHEN a guest submits a ticket, THE Support_Page SHALL include guestEmail in the API request
3. THE Support_Page SHALL validate the email format before submission
4. WHEN email validation fails, THE Support_Page SHALL display an error message
5. THE Ticket_System SHALL store the guest email with the ticket record

### Requirement 4: Fix Ticket Routing to Use UUID

**User Story:** As a user, I want ticket links to work correctly, so that I can view ticket details without errors.

#### Acceptance Criteria

1. WHEN displaying ticket lists, THE Ticket_System SHALL use UUID for internal routing
2. WHEN generating ticket detail links, THE Ticket_System SHALL use Public_ID in the URL path
3. THE Ticket_System SHALL resolve Public_ID to UUID when loading ticket details
4. WHEN a ticket is not found, THE Ticket_System SHALL display a clear "Ticket not found" message
5. FOR ANY ticket link, clicking it SHALL navigate to the correct ticket detail page

### Requirement 5: Make Transaction Regex Flexible

**User Story:** As a system administrator, I want order ID extraction to be flexible, so that different order ID formats are supported.

#### Acceptance Criteria

1. WHEN parsing transaction notes, THE Transaction_Parser SHALL support configurable order ID prefixes
2. THE Transaction_Parser SHALL extract order IDs matching pattern `[A-Z]{2,4}\d{6,8}`
3. WHEN no order ID is found, THE Transaction_Parser SHALL return null instead of throwing an error
4. THE Transaction_Parser SHALL be case-insensitive for prefix matching
5. FOR ANY order ID format, the parser SHALL correctly extract numeric and prefix components

### Requirement 6: Add Authentication Check for Refunds

**User Story:** As a security-conscious user, I want the system to verify I'm authenticated before processing refunds, so that unauthorized requests are blocked.

#### Acceptance Criteria

1. WHEN a refund request is initiated, THE Refund_System SHALL verify user authentication status
2. WHEN the user is not authenticated, THE Refund_System SHALL redirect to login page
3. THE Refund_System SHALL verify the requesting user owns the order or is an admin
4. WHEN authorization fails, THE Refund_System SHALL return a 403 Forbidden error
5. FOR ANY refund request, authentication SHALL be checked before processing

### Requirement 7: Align Support Page Categories with Enum

**User Story:** As a developer, I want support page categories to match the TicketCategory enum, so that validation doesn't fail unexpectedly.

#### Acceptance Criteria

1. THE Support_Page SHALL use category values matching the TicketCategory enum exactly
2. THE Support_Page SHALL map display labels (e.g., "Order Issue") to enum values (e.g., "order")
3. WHEN a category is selected, THE Support_Page SHALL send the enum value to the API
4. THE Ticket_System SHALL validate categories against the enum before processing
5. FOR ANY category selection, the submitted value SHALL be a valid TicketCategory

### Requirement 8: Display Rate Limit Feedback with Countdown

**User Story:** As a user, I want to see how long I need to wait when rate-limited, so that I know when to retry my request.

#### Acceptance Criteria

1. WHEN a rate limit error occurs (429 status), THE UI SHALL parse the Retry-After header
2. THE UI SHALL display a countdown timer showing seconds until retry is allowed
3. WHEN the countdown reaches zero, THE UI SHALL automatically enable the retry button
4. THE UI SHALL show a clear message explaining the rate limit (e.g., "Too many requests. Please wait...")
5. FOR ANY rate-limited request, the user SHALL see both the reason and wait time

### Requirement 9: Prevent Wallet Balance Race Conditions

**User Story:** As a system administrator, I want wallet balance updates to be atomic, so that concurrent operations don't cause incorrect balances.

#### Acceptance Criteria

1. WHEN multiple refunds are processed concurrently, THE Wallet_System SHALL serialize balance updates
2. THE Wallet_System SHALL use database-level locking or atomic operations for balance changes
3. WHEN a balance update fails, THE Wallet_System SHALL not commit any related transaction records
4. THE Wallet_System SHALL ensure balance equals sum of all transaction amounts
5. FOR ANY wallet operation, the balance SHALL remain consistent regardless of concurrent requests

### Requirement 10: Add Loading State to Ticket List

**User Story:** As a user, I want to see a loading indicator when tickets are being fetched, so that I know the system is working.

#### Acceptance Criteria

1. WHEN the ticket list page loads, THE UI SHALL display a loading spinner
2. WHEN tickets are being fetched, THE UI SHALL disable filter controls
3. WHEN loading completes, THE UI SHALL hide the spinner and show the ticket list
4. WHEN loading fails, THE UI SHALL show an error message with a retry button
5. THE loading indicator SHALL be visually centered and clearly visible

### Requirement 11: Implement Empty State Illustrations

**User Story:** As a user, I want to see helpful illustrations when lists are empty, so that the interface feels polished and informative.

#### Acceptance Criteria

1. WHEN no tickets exist, THE Tickets_Page SHALL display an SVG illustration with a call-to-action
2. WHEN no transactions exist, THE Transactions_Page SHALL display an SVG illustration with helpful text
3. WHEN no refunded orders exist, THE Refunds_Page SHALL display an SVG illustration
4. THE empty state SVG SHALL use the application's color palette
5. FOR ANY empty list, the illustration SHALL include actionable text (e.g., "Create your first ticket")

### Requirement 12: Add Refund Amount Preview

**User Story:** As a user, I want to see the refund amount before requesting it, so that I know what to expect.

#### Acceptance Criteria

1. WHEN viewing a refundable order, THE UI SHALL calculate and display the refund amount
2. THE preview SHALL show original amount, delivered quantity, and refund calculation
3. WHEN the refund amount is zero, THE UI SHALL explain why (e.g., "Fully delivered")
4. THE preview SHALL update dynamically if delivery status changes
5. THE refund button SHALL be disabled when refund amount is zero

### Requirement 13: Implement Ticket Status Timeline

**User Story:** As a user, I want to see a visual timeline of ticket status changes, so that I understand the support workflow progress.

#### Acceptance Criteria

1. WHEN viewing a ticket detail page, THE UI SHALL display a status timeline
2. THE timeline SHALL show all status transitions with timestamps
3. THE timeline SHALL visually highlight the current status
4. THE timeline SHALL display status changes in chronological order
5. FOR ANY ticket, the timeline SHALL be accessible and easy to understand

### Requirement 14: Add Search Functionality

**User Story:** As a user, I want to search tickets and transactions by keywords, so that I can quickly find specific items.

#### Acceptance Criteria

1. THE Tickets_Page SHALL include a search input field above the ticket list
2. WHEN a user types in the search field, THE UI SHALL filter tickets by subject and public ID
3. THE Transactions_Page SHALL include a search input to filter by order ID and note
4. THE search SHALL be case-insensitive and support partial matches
5. WHEN search results are empty, THE UI SHALL show "No results found" message

### Requirement 15: Implement Bulk Actions for Admins

**User Story:** As an admin, I want to perform bulk operations on tickets, so that I can manage multiple tickets efficiently.

#### Acceptance Criteria

1. WHEN an admin views the ticket list, THE Admin_Panel SHALL display checkboxes for each ticket
2. THE Admin_Panel SHALL provide a "Select All" checkbox in the table header
3. THE Admin_Panel SHALL show bulk action buttons (Close, Update Status) when tickets are selected
4. WHEN a bulk action is performed, THE Admin_Panel SHALL update all selected tickets
5. THE Admin_Panel SHALL show progress feedback during bulk operations

### Requirement 16: Add Quick Reply Templates

**User Story:** As an admin, I want to use predefined reply templates, so that I can respond to common questions quickly.

#### Acceptance Criteria

1. WHEN replying to a ticket, THE Admin_Panel SHALL display a templates dropdown
2. THE templates SHALL include common responses (e.g., "Refund processed", "Order completed")
3. WHEN a template is selected, THE reply textarea SHALL be populated with the template text
4. THE admin SHALL be able to edit the template text before sending
5. THE templates SHALL be configurable in the admin settings

### Requirement 17: Support Attachment Uploads

**User Story:** As a user, I want to attach images to my support tickets, so that I can provide visual evidence of issues.

#### Acceptance Criteria

1. THE ticket creation form SHALL include an image upload button
2. THE upload SHALL accept common image formats (JPEG, PNG, GIF, WebP)
3. THE upload SHALL enforce a maximum file size limit (5MB per image)
4. WHEN an image is uploaded, THE UI SHALL display a thumbnail preview
5. THE uploaded images SHALL be stored securely and displayed in ticket details

### Requirement 18: Implement Real-Time Updates

**User Story:** As a user, I want to see ticket updates in real-time, so that I don't need to manually refresh the page.

#### Acceptance Criteria

1. THE Ticket_Detail_Page SHALL poll for new messages every 10 seconds
2. WHEN a new message arrives, THE UI SHALL append it to the message list smoothly
3. THE polling SHALL stop when the user navigates away from the page
4. THE UI SHALL show a visual indicator when new messages arrive
5. THE real-time updates SHALL not disrupt the user's scroll position

### Requirement 19: Add Export Functionality

**User Story:** As a user, I want to export my transactions and tickets, so that I can keep records for my own use.

#### Acceptance Criteria

1. THE Transactions_Page SHALL include an "Export to CSV" button
2. THE exported CSV SHALL include all transaction fields (date, type, amount, note)
3. THE Tickets_Page SHALL include an "Export Ticket" button for PDF export
4. THE PDF export SHALL include ticket details, messages, and status history
5. THE export filename SHALL include a timestamp (e.g., "transactions_2024-01-15.csv")

### Requirement 20: Improve Mobile Responsiveness

**User Story:** As a mobile user, I want swipe actions and responsive tables, so that the interface is easy to use on small screens.

#### Acceptance Criteria

1. WHEN viewing tickets on mobile, THE UI SHALL support swipe-to-close gestures
2. THE ticket and transaction tables SHALL be horizontally scrollable on mobile
3. THE filter controls SHALL stack vertically on small screens
4. THE buttons SHALL be appropriately sized for touch interaction (minimum 44x44 pixels)
5. FOR ANY page, the layout SHALL adapt gracefully to screen sizes from 320px to 1920px

### Requirement 21: Replace Inline Errors with Toast Notifications

**User Story:** As a user, I want non-blocking toast notifications for success and error messages, so that errors don't clutter the interface.

#### Acceptance Criteria

1. WHEN an operation succeeds, THE UI SHALL display a green toast notification
2. WHEN an operation fails, THE UI SHALL display a red toast notification
3. THE toast SHALL auto-dismiss after 5 seconds
4. THE toast SHALL include a close button for manual dismissal
5. THE toast SHALL stack vertically when multiple notifications are shown

### Requirement 22: Create Dedicated Refund History Page

**User Story:** As a user, I want to view all my refunds in one place, so that I can track refunded amounts easily.

#### Acceptance Criteria

1. THE Refund_History_Page SHALL list all refunded orders with amounts
2. THE list SHALL show order ID, original amount, refund amount, and refund date
3. THE list SHALL be sortable by date and amount
4. THE list SHALL include pagination when more than 50 refunds exist
5. THE page SHALL calculate and display total refunded amount

### Requirement 23: Add Ticket Priority Levels

**User Story:** As an admin, I want to assign priority levels to tickets, so that urgent issues are handled first.

#### Acceptance Criteria

1. THE Ticket_System SHALL support priority levels: urgent, high, normal, low
2. WHEN creating a ticket, admins SHALL be able to set priority
3. THE ticket list SHALL display priority as a colored badge
4. THE ticket list SHALL allow sorting by priority
5. THE Admin_Panel SHALL allow bulk priority updates

### Requirement 24: Implement Auto-Save for Ticket Drafts

**User Story:** As a user, I want my ticket draft to be saved automatically, so that I don't lose my work if the page closes unexpectedly.

#### Acceptance Criteria

1. WHEN typing a ticket message, THE UI SHALL save the draft to localStorage every 5 seconds
2. WHEN returning to the ticket form, THE UI SHALL restore the saved draft
3. THE UI SHALL show a "Draft saved" indicator after each save
4. WHEN a ticket is submitted successfully, THE UI SHALL clear the saved draft
5. THE draft SHALL include subject, category, body, and order ID fields

### Requirement 25: Improve Dark Mode Contrast

**User Story:** As a dark mode user, I want better contrast for text and borders, so that content is easier to read.

#### Acceptance Criteria

1. THE UI SHALL ensure all text meets WCAG AA contrast ratio (4.5:1 for normal text)
2. THE UI SHALL use distinct border colors for input fields in dark mode
3. THE status badges SHALL have sufficient contrast against dark backgrounds
4. THE disabled buttons SHALL be visibly different from enabled buttons
5. FOR ANY UI element, color alone SHALL not be the only means of conveying information

### Requirement 26: Add Pagination to Lists

**User Story:** As a user with many tickets and transactions, I want pagination controls, so that pages load quickly.

#### Acceptance Criteria

1. THE Tickets_Page SHALL display 25 tickets per page with pagination controls
2. THE Transactions_Page SHALL display 50 transactions per page with pagination controls
3. THE pagination controls SHALL show current page and total pages
4. THE pagination controls SHALL include Previous, Next, and page number buttons
5. THE URL SHALL reflect the current page number for bookmarking and sharing

### Requirement 27: Implement Filter Presets

**User Story:** As a user, I want quick filter presets, so that I can access common views with one click.

#### Acceptance Criteria

1. THE Tickets_Page SHALL include preset buttons: "My Open Tickets", "Resolved", "All"
2. WHEN a preset is clicked, THE UI SHALL apply the corresponding filters
3. THE active preset SHALL be visually highlighted
4. THE presets SHALL be displayed above the manual filter controls
5. THE presets SHALL respect user authentication (e.g., "My Open Tickets" for logged-in users)

### Requirement 28: Add Order Quick Actions

**User Story:** As a user, I want quick access to actions for recent orders, so that I can request refunds or support quickly.

#### Acceptance Criteria

1. WHEN viewing an order in a list, THE UI SHALL show a dropdown menu with actions
2. THE dropdown SHALL include options: "Request Refund", "Contact Support", "View Details"
3. WHEN "Request Refund" is clicked, THE UI SHALL open the refund modal
4. WHEN "Contact Support" is clicked, THE UI SHALL open the ticket form with order ID pre-filled
5. THE dropdown SHALL be accessible via keyboard navigation

### Requirement 29: Add Character Count Color Coding

**User Story:** As a user, I want to see color-coded character counts, so that I know how close I am to the limit.

#### Acceptance Criteria

1. WHEN typing in a ticket body textarea, THE UI SHALL display a character counter
2. THE counter SHALL be green when under 4000 characters (safe zone)
3. THE counter SHALL be yellow when between 4000-4800 characters (warning zone)
4. THE counter SHALL be red when between 4800-5000 characters (danger zone)
5. THE textarea SHALL prevent input when 5000 characters is reached

### Requirement 30: Add Animated Status Transitions

**User Story:** As a user, I want smooth animations when ticket statuses change, so that the interface feels responsive.

#### Acceptance Criteria

1. WHEN a ticket status changes, THE UI SHALL animate the status badge color transition
2. THE animation duration SHALL be 300ms with easing
3. THE animation SHALL not interfere with user interaction
4. THE animation SHALL be skipped if the user has motion preferences disabled
5. FOR ANY status change, the animation SHALL draw attention without being distracting

### Requirement 31: Add Confetti Animation for Resolved Tickets

**User Story:** As a user, I want a celebratory animation when my ticket is resolved, so that the experience feels rewarding.

#### Acceptance Criteria

1. WHEN a ticket status changes to "resolved", THE UI SHALL display a confetti animation
2. THE confetti SHALL animate for 2 seconds then fade out
3. THE confetti SHALL use the application's accent colors
4. THE animation SHALL be skipped if the user has motion preferences disabled
5. THE confetti SHALL not interfere with page usability

### Requirement 32: Add Relative Time Tooltips

**User Story:** As a user, I want to see both relative time ("2 hours ago") and exact timestamps, so that I have flexibility in reading dates.

#### Acceptance Criteria

1. THE UI SHALL display relative time by default (e.g., "3 days ago")
2. WHEN hovering over a relative time, THE UI SHALL show a tooltip with exact timestamp
3. THE tooltip SHALL format timestamps in the user's locale
4. THE relative time SHALL update dynamically (e.g., "1 minute ago" becomes "2 minutes ago")
5. FOR ANY timestamp, both relative and absolute times SHALL be accessible

### Requirement 33: Add Copy-to-Clipboard Buttons

**User Story:** As a user, I want to copy IDs and codes with one click, so that I can easily paste them elsewhere.

#### Acceptance Criteria

1. WHEN viewing a ticket ID, THE UI SHALL display a copy button icon next to it
2. WHEN the copy button is clicked, THE ID SHALL be copied to clipboard
3. THE UI SHALL show a brief "Copied!" toast notification after successful copy
4. THE copy button SHALL work for order IDs, transaction IDs, and ticket IDs
5. THE copy functionality SHALL work across all modern browsers

### Requirement 34: Support Markdown in Ticket Messages

**User Story:** As a user, I want to format ticket messages with markdown, so that I can structure information clearly.

#### Acceptance Criteria

1. THE ticket message textarea SHALL support basic markdown syntax (bold, italic, lists, links)
2. THE UI SHALL display a formatting toolbar above the textarea
3. THE rendered message SHALL properly sanitize and render markdown
4. THE markdown parser SHALL prevent XSS attacks by sanitizing HTML
5. THE UI SHALL show a preview tab to see formatted output before sending

### Requirement 35: Add Rich Text Editor for Tickets

**User Story:** As a user, I want a WYSIWYG editor for composing tickets, so that I don't need to learn markdown syntax.

#### Acceptance Criteria

1. THE ticket form SHALL include a rich text editor with formatting buttons
2. THE editor SHALL support bold, italic, underline, lists, and links
3. THE editor SHALL convert rich text to markdown or HTML for storage
4. THE editor SHALL preserve formatting when displaying messages
5. THE editor SHALL be accessible via keyboard shortcuts

### Requirement 36: Add Emoji Reactions to Agent Replies

**User Story:** As a user, I want to react to agent replies with emojis, so that I can quickly acknowledge helpful responses.

#### Acceptance Criteria

1. WHEN viewing an agent reply, THE UI SHALL display emoji reaction buttons
2. THE available reactions SHALL include: 👍 (helpful), ❤️ (thanks), 😕 (not helpful)
3. WHEN a reaction is clicked, THE UI SHALL save the reaction and update the count
4. THE UI SHALL display the total count for each reaction type
5. THE user SHALL only be able to add one reaction per message

### Requirement 37: Add Ticket Templates for Common Issues

**User Story:** As a user, I want to select from ticket templates, so that I can quickly report common issues.

#### Acceptance Criteria

1. THE ticket creation form SHALL display a "Use Template" dropdown
2. THE templates SHALL include common issues: "Refund Request", "Delivery Delay", "Wrong Link"
3. WHEN a template is selected, THE form fields SHALL be pre-filled with template content
4. THE user SHALL be able to edit the template content before submission
5. THE templates SHALL include appropriate category and subject defaults

### Requirement 38: Add Analytics Dashboard

**User Story:** As an admin, I want to see ticket analytics, so that I can monitor support performance and identify trends.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display an analytics dashboard with key metrics
2. THE dashboard SHALL show: average response time, resolution rate, tickets by category
3. THE dashboard SHALL include visual charts (bar charts for categories, line charts for trends)
4. THE dashboard SHALL allow filtering by date range
5. THE dashboard SHALL update automatically every 5 minutes

