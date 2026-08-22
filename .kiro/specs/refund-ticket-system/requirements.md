# Requirements Document: Automatic Refund & Ticket System

## Introduction

This document specifies the requirements for two critical features in the cheapfollower.shop platform: (1) an automatic refund system that calculates and processes refunds when orders are canceled or partially completed, crediting users' wallets with appropriate amounts, and (2) a functional support ticket system enabling users to create and track support requests with email notifications and admin management capabilities.

The refund system ensures users receive fair compensation for undelivered services, while the ticket system provides a structured communication channel between customers and support staff.

## Glossary

- **Refund_Engine**: The component responsible for calculating refund amounts based on order status and delivery progress
- **Order**: A purchase request for social media services (followers, likes, etc.)
- **Wallet**: A user's credit balance stored in the platform for making purchases
- **Transaction**: A record of money movement (credit, debit, or refund) in a user's wallet
- **Ticket**: A support request created by a user or guest to seek assistance
- **Ticket_Message**: An individual communication entry within a ticket conversation
- **Public_ID**: A human-readable unique identifier (e.g., "CF123456" for orders, "TKT001234" for tickets)
- **Agent**: An administrator or support staff member who responds to tickets
- **Guest_User**: A person creating a ticket without a registered account

## Requirements

### Requirement 1: Refund Amount Calculation

**User Story:** As a user, I want refunds to be calculated accurately based on what was delivered, so that I receive fair compensation for incomplete orders.

#### Acceptance Criteria

1. WHEN an order is canceled AND delivered quantity is zero, THE Refund_Engine SHALL calculate refund amount equal to the original order total
2. WHEN an order is partially completed, THE Refund_Engine SHALL calculate refund amount as (quantity ordered - quantity delivered) / quantity ordered × order total
3. THE Refund_Engine SHALL round all refund amounts to two decimal places
4. THE Refund_Engine SHALL ensure calculated refund amount never exceeds the original order total
5. THE Refund_Engine SHALL return zero refund amount when delivered quantity equals ordered quantity

### Requirement 2: Refund Processing

**User Story:** As a user, I want my refund to be automatically credited to my wallet, so that I can use the funds immediately for future purchases.

#### Acceptance Criteria

1. WHEN a refund is processed, THE System SHALL verify the order exists and is paid
2. WHEN a refund is processed, THE System SHALL verify the order has not been previously refunded
3. WHEN a refund is successfully processed, THE System SHALL credit the user's wallet balance by the refund amount
4. WHEN a refund is successfully processed, THE System SHALL create a transaction record with type "refund"
5. WHEN a refund is successfully processed, THE System SHALL update the order status to "refunded"
6. IF a refund fails at any step, THEN THE System SHALL rollback all changes to maintain data consistency

### Requirement 3: Refund Idempotency

**User Story:** As a system administrator, I want refunds to be processed only once per order, so that users cannot receive duplicate refunds.

#### Acceptance Criteria

1. WHEN a refund is requested for an order with status "refunded", THE System SHALL reject the request with error message "Already refunded"
2. WHEN concurrent refund requests are made for the same order, THE System SHALL process exactly one refund
3. THE System SHALL use database transactions to ensure atomic refund processing

### Requirement 4: Ticket Creation

**User Story:** As a user, I want to create support tickets to report issues or ask questions, so that I can receive assistance from the support team.

#### Acceptance Criteria

1. WHEN a user submits a ticket, THE System SHALL require a non-empty subject
2. WHEN a user submits a ticket, THE System SHALL require a non-empty message body
3. WHEN a user submits a ticket, THE System SHALL require a valid category selection
4. WHEN a ticket is created, THE System SHALL generate a unique Public_ID in format "TKT" followed by digits
5. WHEN a ticket is created, THE System SHALL set initial status to "open"
6. WHEN a ticket is created, THE System SHALL record the current timestamp as created_at and updated_at
7. WHERE a user associates an order with the ticket, THE System SHALL validate the order exists

### Requirement 5: Ticket Message Management

**User Story:** As a user, I want to view and reply to my support tickets, so that I can have ongoing conversations with the support team.

#### Acceptance Criteria

1. WHEN a ticket is created, THE System SHALL store the initial message with author_role "customer"
2. WHEN a message is added to a ticket, THE System SHALL record the message body and author role
3. WHEN a message is added to a ticket, THE System SHALL update the ticket's updated_at timestamp
4. WHEN messages are retrieved for a ticket, THE System SHALL order them chronologically by created_at
5. IF a reply is attempted on a closed ticket, THEN THE System SHALL reject the request with error "Cannot reply to closed ticket"

### Requirement 6: Ticket Status Management

**User Story:** As a support agent, I want to update ticket statuses to track progress, so that I can organize my workload and communicate resolution status.

#### Acceptance Criteria

1. WHEN an agent first replies to an "open" ticket, THE System SHALL automatically update status to "in_progress"
2. WHEN an agent or user changes ticket status, THE System SHALL accept only valid status values: open, in_progress, waiting_customer, resolved, closed
3. WHEN a ticket status is "closed", THE System SHALL prevent further status changes
4. WHEN a ticket status is updated, THE System SHALL record the updated_at timestamp

### Requirement 7: Email Notifications

**User Story:** As a user, I want to receive email notifications about my tickets, so that I know when support has responded without constantly checking the website.

#### Acceptance Criteria

1. WHEN a ticket is created, THE System SHALL send an email notification to the support team
2. WHEN an agent replies to a ticket, THE System SHALL send an email notification to the customer
3. WHEN a customer replies to a ticket, THE System SHALL send an email notification to the support team
4. THE System SHALL include ticket Public_ID and subject in notification emails
5. IF email sending fails, THEN THE System SHALL log the error without blocking ticket operations

### Requirement 8: Ticket Access Control

**User Story:** As a user, I want to see only my own tickets, so that my support conversations remain private.

#### Acceptance Criteria

1. WHEN a user lists tickets, THE System SHALL return only tickets where user_id matches the authenticated user
2. WHEN a user views a specific ticket, THE System SHALL verify the user owns the ticket or is an administrator
3. WHEN an administrator lists tickets, THE System SHALL return all tickets regardless of ownership
4. WHEN an administrator views or replies to any ticket, THE System SHALL allow the operation

### Requirement 9: Guest Ticket Support

**User Story:** As a guest without an account, I want to create support tickets using my email address, so that I can get help without registering.

#### Acceptance Criteria

1. WHEN a guest creates a ticket, THE System SHALL require a valid email address
2. WHEN a guest creates a ticket, THE System SHALL store the ticket with null user_id
3. WHEN a guest ticket receives a reply, THE System SHALL send notification to the provided email address
4. THE System SHALL allow guest tickets to be tracked via the unique Public_ID

### Requirement 10: Refund Authorization

**User Story:** As a system administrator, I want to control who can process refunds, so that refunds are only issued for legitimate reasons.

#### Acceptance Criteria

1. WHEN a refund is requested, THE System SHALL verify the requester is either the order owner or an administrator
2. WHEN a non-owner attempts to refund another user's order, THE System SHALL reject the request with error "Unauthorized"
3. THE System SHALL log all refund operations with user ID and timestamp for audit purposes

### Requirement 11: Order-Ticket Association

**User Story:** As a support agent, I want to see which order a ticket refers to, so that I can quickly investigate order-related issues.

#### Acceptance Criteria

1. WHERE a ticket references an order, THE System SHALL display the order Public_ID in the ticket details
2. WHERE a ticket references an order, THE System SHALL provide a link to view the order details
3. WHEN displaying order details, THE System SHALL show any associated tickets for that order

### Requirement 12: Wallet Balance Updates

**User Story:** As a user, I want to see my updated wallet balance immediately after a refund, so that I know I can use those funds.

#### Acceptance Criteria

1. WHEN a refund is processed, THE System SHALL atomically update the wallet balance
2. WHEN a refund transaction is created, THE System SHALL record the amount, method "Refund", and a descriptive note
3. THE System SHALL ensure wallet balance is updated in the same database transaction as the refund record
4. WHEN a user views their wallet, THE System SHALL display the current balance including all refunds

### Requirement 13: Refund Error Handling

**User Story:** As a user, I want clear error messages when a refund cannot be processed, so that I understand what went wrong.

#### Acceptance Criteria

1. IF an order is not found, THEN THE System SHALL return error message "Order not found"
2. IF an order is not paid, THEN THE System SHALL return error message "Cannot refund unpaid order"
3. IF an order is already refunded, THEN THE System SHALL return error message "Already refunded"
4. IF order data is invalid or incomplete, THEN THE System SHALL return error message "Invalid order data"
5. IF a database error occurs, THEN THE System SHALL return error message "Refund failed, please retry"

### Requirement 14: Ticket Input Validation

**User Story:** As a support agent, I want all tickets to have meaningful content, so that I can provide effective assistance.

#### Acceptance Criteria

1. WHEN ticket subject is submitted, THE System SHALL trim whitespace and verify length is greater than zero
2. WHEN ticket body is submitted, THE System SHALL trim whitespace and verify length is greater than zero
3. IF subject or body is empty after trimming, THEN THE System SHALL reject the ticket with error "Subject and message body are required"
4. THE System SHALL accept ticket body with maximum length of 5000 characters

### Requirement 15: Ticket Category Classification

**User Story:** As a support agent, I want tickets to be categorized, so that I can prioritize and route them appropriately.

#### Acceptance Criteria

1. WHEN a ticket is created, THE System SHALL require category selection from valid options
2. THE System SHALL support categories: order, payment, refill, account, api, service, other
3. WHEN tickets are listed, THE System SHALL display the category for each ticket
4. WHEN filtering tickets, THE System SHALL allow filtering by one or more categories

### Requirement 16: Partial Order Refunds

**User Story:** As a user, I want to receive a proportional refund when my order is only partially delivered, so that I only pay for what I received.

#### Acceptance Criteria

1. WHEN an order has delivered quantity less than ordered quantity, THE System SHALL calculate proportional refund
2. WHEN calculating proportional refund, THE Refund_Engine SHALL use formula: (ordered - delivered) / ordered × total
3. THE System SHALL handle partial refunds for orders with any positive delivered quantity less than ordered quantity

### Requirement 17: Transaction History

**User Story:** As a user, I want to view my refund transactions in my wallet history, so that I can track all money movements.

#### Acceptance Criteria

1. WHEN a refund is processed, THE System SHALL create a transaction record visible in wallet history
2. WHEN displaying transaction history, THE System SHALL show transaction type "refund"
3. WHEN displaying refund transactions, THE System SHALL include the order Public_ID in the transaction note
4. WHEN filtering transactions, THE System SHALL allow filtering by transaction type

### Requirement 18: Ticket Public ID Generation

**User Story:** As a user, I want a simple ticket reference number to cite when contacting support, so that support can quickly locate my ticket.

#### Acceptance Criteria

1. WHEN a ticket is created, THE System SHALL generate a Public_ID with prefix "TKT"
2. THE System SHALL ensure Public_ID is unique across all tickets
3. THE System SHALL use Public_ID in email notifications and user interface
4. THE System SHALL allow ticket lookup by Public_ID

### Requirement 19: Atomic Ticket Creation

**User Story:** As a system architect, I want ticket creation to be atomic, so that tickets are never created without their initial message.

#### Acceptance Criteria

1. WHEN creating a ticket, THE System SHALL insert both ticket record and initial message in a single database transaction
2. IF ticket record creation fails, THEN THE System SHALL not create the initial message
3. IF initial message creation fails, THEN THE System SHALL rollback ticket record creation
4. THE System SHALL ensure ticket and message records are both created or neither is created

### Requirement 20: Refund Calculation Determinism

**User Story:** As a system administrator, I want refund calculations to be deterministic and consistent, so that users are treated fairly.

#### Acceptance Criteria

1. WHEN the same order data is provided multiple times, THE Refund_Engine SHALL return identical refund amounts
2. THE Refund_Engine SHALL use consistent rounding rules for all calculations
3. THE Refund_Engine SHALL avoid floating-point precision errors in monetary calculations

