# Requirements Document: Marketing & Conversion Features

## Introduction

This document specifies the requirements for four critical marketing and conversion features for the cheapfollower.shop platform: (1) Flash Sales with countdown timers to create urgency, (2) Auto-Reorder subscription system to increase customer lifetime value, (3) Live Order Counter to display social proof and FOMO (fear of missing out), and (4) Review Submission system to collect customer testimonials.

These features are designed to increase conversion rates, boost customer retention, and enhance trust through social proof. The system will integrate with existing admin panel capabilities and leverage the current order processing infrastructure.

## Glossary

- **Flash_Sale**: A time-limited promotional offer with discounted prices on selected services
- **Countdown_Timer**: A visual component displaying remaining time in a flash sale
- **Subscription**: A recurring order configuration that automatically places orders at specified intervals
- **Auto_Reorder**: The same as Subscription - a feature allowing users to set up automatic recurring purchases
- **Live_Counter**: A real-time display showing recent purchase activity to create social proof
- **Baseline_Count**: The minimum number displayed by the Live_Counter, configurable by admin
- **Time_Window**: The period over which live orders are counted (e.g., "last hour", "last 24 hours")
- **Review_Submission**: A customer testimonial collected through a submission form
- **Service**: A social media growth product (followers, likes, views, etc.)
- **Admin_Store**: The JSON-based data store at data/admin-store.json for admin configuration
- **Subscription_Frequency**: The recurring interval for auto-orders (weekly, bi-weekly, monthly)
- **Subscription_Status**: The state of a subscription (active, paused, canceled)
- **Auto_Discount**: A percentage discount applied to subscription orders (default 15%)

## Requirements

### Requirement 1: Flash Sale Creation

**User Story:** As an administrator, I want to create flash sales with specific services and time limits, so that I can create urgency and boost sales during specific periods.

#### Acceptance Criteria

1. WHEN an admin creates a flash sale, THE System SHALL require a non-empty sale title
2. WHEN an admin creates a flash sale, THE System SHALL require a discount percentage between 1 and 99
3. WHEN an admin creates a flash sale, THE System SHALL require a valid start date/time
4. WHEN an admin creates a flash sale, THE System SHALL require a valid end date/time after the start date
5. WHEN an admin creates a flash sale, THE System SHALL require at least one service to be selected
6. WHEN a flash sale is created, THE System SHALL store it in Admin_Store with a unique identifier
7. WHEN a flash sale is created, THE System SHALL set initial status to "scheduled" if start time is in the future
8. WHEN a flash sale is created with start time in the past or present, THE System SHALL set status to "active"

### Requirement 2: Flash Sale Display

**User Story:** As a visitor, I want to see active flash sales with countdown timers, so that I understand the urgency and can take advantage of limited-time offers.

#### Acceptance Criteria

1. WHEN a flash sale is active, THE System SHALL display it on the homepage
2. WHEN a flash sale applies to a specific service, THE System SHALL display it on that service's page
3. WHEN displaying a flash sale, THE System SHALL show the sale title, discount percentage, and countdown timer
4. WHEN displaying a countdown timer, THE System SHALL update every second
5. WHEN displaying a countdown timer, THE System SHALL show format "HH:MM:SS" or "DD:HH:MM:SS" for sales longer than 24 hours
6. THE System SHALL use urgent styling for flash sales including red/orange colors and visual emphasis
7. WHEN multiple flash sales apply to the same service, THE System SHALL display the highest discount percentage

### Requirement 3: Flash Sale Expiration

**User Story:** As an administrator, I want flash sales to automatically expire when time runs out, so that discounts are not applied after the promotional period.

#### Acceptance Criteria

1. WHEN the current time exceeds a flash sale's end time, THE System SHALL automatically set status to "expired"
2. WHEN a flash sale expires, THE System SHALL immediately stop displaying it to users
3. WHEN a flash sale expires, THE System SHALL stop applying the discount to affected services
4. WHEN checking flash sale status, THE System SHALL compare current server time to end time
5. THE System SHALL allow expired flash sales to remain in Admin_Store for historical reference

### Requirement 4: Flash Sale Discount Application

**User Story:** As a customer, I want flash sale discounts to be automatically applied to my order, so that I receive the promotional price without entering a code.

#### Acceptance Criteria

1. WHEN a user adds a service to cart during an active flash sale, THE System SHALL apply the discount percentage
2. WHEN calculating the discounted price, THE System SHALL use formula: original_price × (1 - discount_percentage / 100)
3. WHEN displaying the discounted price, THE System SHALL show both original and sale prices
4. WHEN a flash sale expires during checkout, THE System SHALL revert to original pricing and notify the user
5. THE System SHALL round all discounted prices to two decimal places
6. WHEN multiple discounts are available (flash sale + promo code), THE System SHALL apply only the higher discount

### Requirement 5: Subscription Creation

**User Story:** As a customer, I want to set up recurring orders for services I use regularly, so that I don't have to manually reorder and can receive a subscription discount.

#### Acceptance Criteria

1. WHEN a user creates a subscription, THE System SHALL require a valid service selection
2. WHEN a user creates a subscription, THE System SHALL require a positive quantity
3. WHEN a user creates a subscription, THE System SHALL require a frequency selection (weekly, bi-weekly, monthly)
4. WHEN a subscription is created, THE System SHALL generate a unique subscription ID
5. WHEN a subscription is created, THE System SHALL set status to "active"
6. WHEN a subscription is created, THE System SHALL calculate next_order_date based on frequency
7. WHEN a subscription is created, THE System SHALL apply 15% auto-discount by default
8. WHEN a subscription is created, THE System SHALL store it with user_id association

### Requirement 6: Subscription Processing

**User Story:** As a customer, I want my subscription orders to be automatically placed at the scheduled intervals, so that I receive consistent service without manual intervention.

#### Acceptance Criteria

1. WHEN a subscription's next_order_date is reached, THE System SHALL automatically create an order
2. WHEN creating a subscription order, THE System SHALL apply the auto-discount percentage
3. WHEN creating a subscription order, THE System SHALL charge the user's wallet or payment method
4. IF wallet balance is insufficient, THEN THE System SHALL pause the subscription and notify the user
5. WHEN a subscription order is successful, THE System SHALL update next_order_date based on frequency
6. WHEN a subscription order is successful, THE System SHALL send confirmation email to the user
7. THE System SHALL process subscription orders within 1 hour of the scheduled time

### Requirement 7: Subscription Notification

**User Story:** As a customer, I want to receive email notifications before subscription orders are placed, so that I can pause or modify my subscription if needed.

#### Acceptance Criteria

1. WHEN a subscription order is scheduled, THE System SHALL send email notification 24 hours before processing
2. WHEN sending subscription notification, THE System SHALL include service name, quantity, and amount
3. WHEN sending subscription notification, THE System SHALL include links to pause or modify the subscription
4. WHEN sending subscription notification, THE System SHALL include estimated processing date/time
5. IF email delivery fails, THEN THE System SHALL retry up to 3 times
6. WHEN a subscription order is processed, THE System SHALL send order confirmation email

### Requirement 8: Subscription Management

**User Story:** As a customer, I want to manage my subscriptions from my dashboard, so that I can pause, resume, modify, or cancel them at any time.

#### Acceptance Criteria

1. WHEN a user views their dashboard, THE System SHALL display all subscriptions with current status
2. WHEN displaying subscriptions, THE System SHALL show service name, quantity, frequency, next order date, and total
3. WHEN a user pauses a subscription, THE System SHALL set status to "paused" and skip next scheduled order
4. WHEN a user resumes a subscription, THE System SHALL set status to "active" and calculate new next_order_date
5. WHEN a user cancels a subscription, THE System SHALL set status to "canceled" and prevent future orders
6. WHEN a user modifies subscription quantity, THE System SHALL update quantity and recalculate pricing
7. THE System SHALL allow paused subscriptions to be resumed at any time
8. THE System SHALL prevent modifications to canceled subscriptions

### Requirement 9: Subscription Discount

**User Story:** As a customer, I want to receive a discount on subscription orders compared to one-time purchases, so that I'm incentivized to commit to recurring orders.

#### Acceptance Criteria

1. WHEN displaying subscription pricing, THE System SHALL show comparison between one-time and subscription prices
2. THE System SHALL apply 15% discount to subscription orders by default
3. WHEN an admin updates the subscription discount percentage, THE System SHALL apply it to all future orders
4. WHEN calculating subscription pricing, THE System SHALL use formula: base_price × quantity × (1 - discount_percentage / 100)
5. THE System SHALL clearly label subscription-discounted prices in the user interface
6. WHEN a subscription order is placed, THE System SHALL reflect the discount in order details

### Requirement 10: Live Counter Initialization

**User Story:** As an administrator, I want to configure the live order counter baseline and time window, so that the counter displays realistic activity levels.

#### Acceptance Criteria

1. WHEN configuring the live counter, THE System SHALL allow setting a baseline count (default 100,000)
2. WHEN configuring the live counter, THE System SHALL allow selecting a time window (last_hour, last_24_hours)
3. WHEN live counter settings are updated, THE System SHALL store them in Admin_Store
4. THE System SHALL initialize live counter settings with sensible defaults on first use
5. WHEN admin sets baseline count, THE System SHALL validate it is a non-negative integer
6. WHEN admin selects time window, THE System SHALL accept only valid options

### Requirement 11: Live Counter Display

**User Story:** As a visitor, I want to see how many people have recently purchased followers, so that I feel confident in the service's popularity and quality.

#### Acceptance Criteria

1. WHEN viewing the homepage, THE System SHALL display the live order counter near the hero section
2. WHEN displaying the counter, THE System SHALL show format "X followers purchased in the last [time window]"
3. WHEN a real purchase occurs, THE System SHALL animate the number change with smooth transition
4. WHEN the counter value increases, THE System SHALL use attention-grabbing animation
5. THE System SHALL update the counter display within 5 seconds of a new purchase
6. THE System SHALL display the counter value as a formatted number with commas (e.g., "125,847")

### Requirement 12: Live Counter Calculation

**User Story:** As a system architect, I want the live counter to combine baseline activity with real orders, so that the display is both realistic and responsive to actual sales.

#### Acceptance Criteria

1. WHEN calculating the counter value, THE System SHALL sum baseline count and real orders within time window
2. WHEN a new order is placed, THE System SHALL add the order quantity to the live counter
3. WHEN time window is "last_hour", THE System SHALL count orders from the past 60 minutes
4. WHEN time window is "last_24_hours", THE System SHALL count orders from the past 24 hours
5. THE System SHALL exclude refunded orders from the live counter
6. THE System SHALL count only paid and completed orders in the live counter
7. WHEN baseline count is updated, THE System SHALL reflect the change in the live counter immediately

### Requirement 13: Live Counter State Persistence

**User Story:** As an administrator, I want the live counter configuration to persist across server restarts, so that settings are not lost.

#### Acceptance Criteria

1. WHEN live counter settings are saved, THE System SHALL write them to Admin_Store.settings
2. WHEN the application starts, THE System SHALL load live counter settings from Admin_Store
3. IF live counter settings are missing, THEN THE System SHALL initialize with default values
4. THE System SHALL store baseline_count and time_window in the live counter configuration
5. WHEN retrieving live counter settings, THE System SHALL return current configuration or defaults

### Requirement 14: Review Submission Form

**User Story:** As a customer, I want to submit my testimonial or review, so that I can share my positive experience with others.

#### Acceptance Criteria

1. WHEN a user accesses the review submission form, THE System SHALL require their name
2. WHEN a user submits a review, THE System SHALL require review text with minimum 10 characters
3. WHEN a user submits a review, THE System SHALL optionally accept their email address
4. WHEN a user submits a review, THE System SHALL optionally accept a rating (1-5 stars)
5. WHEN a review is submitted, THE System SHALL store it with status "pending"
6. WHEN a review is submitted, THE System SHALL generate a unique review ID
7. WHEN a review is submitted, THE System SHALL timestamp it with created_at
8. THE System SHALL store reviews in Admin_Store for admin review

### Requirement 15: Review Submission Access

**User Story:** As a visitor, I want to find the review submission form easily, so that I can share my feedback without difficulty.

#### Acceptance Criteria

1. WHEN viewing the FAQ page, THE System SHALL display a section titled "How can I submit my review?"
2. WHEN displaying the review submission section, THE System SHALL include a link or embedded form
3. WHEN a user clicks the submission link, THE System SHALL navigate to the review submission page
4. THE System SHALL allow both authenticated users and guests to submit reviews
5. WHEN an authenticated user submits a review, THE System SHALL pre-fill their name and email

### Requirement 16: Review Admin Approval

**User Story:** As an administrator, I want to review and approve submitted testimonials before they appear publicly, so that I can ensure quality and appropriateness.

#### Acceptance Criteria

1. WHEN an admin views pending reviews, THE System SHALL list all reviews with status "pending"
2. WHEN displaying pending reviews, THE System SHALL show submitter name, rating, review text, and submission date
3. WHEN an admin approves a review, THE System SHALL update status to "approved"
4. WHEN an admin rejects a review, THE System SHALL update status to "rejected"
5. WHEN a review is approved, THE System SHALL make it visible on the testimonials page
6. WHEN a review is rejected, THE System SHALL hide it from public view but retain it in Admin_Store
7. THE System SHALL allow admins to approve multiple reviews in bulk

### Requirement 17: Review Display

**User Story:** As a visitor, I want to see approved customer reviews, so that I can learn from others' experiences before making a purchase.

#### Acceptance Criteria

1. WHEN viewing the testimonials section, THE System SHALL display only reviews with status "approved"
2. WHEN displaying reviews, THE System SHALL show customer name, rating (if provided), and review text
3. WHEN displaying reviews, THE System SHALL order them by created_at descending (newest first)
4. THE System SHALL limit testimonial display to the most recent 10 reviews by default
5. WHEN a review includes a rating, THE System SHALL display it as stars or numeric value
6. THE System SHALL allow pagination or "load more" functionality for additional reviews

### Requirement 18: Flash Sale Admin Management

**User Story:** As an administrator, I want to view and manage all flash sales from the admin panel, so that I can track active promotions and edit them if needed.

#### Acceptance Criteria

1. WHEN an admin views the flash sales page, THE System SHALL list all flash sales with status and time remaining
2. WHEN displaying flash sales, THE System SHALL show title, discount, date range, services, and status
3. WHEN an admin edits a flash sale, THE System SHALL allow modification of title, discount, dates, and services
4. WHEN an admin edits an active flash sale, THE System SHALL immediately apply changes to public display
5. WHEN an admin deletes a flash sale, THE System SHALL confirm the action before removal
6. THE System SHALL allow admins to manually expire a flash sale before the end date
7. WHEN flash sale status changes, THE System SHALL update the updated_at timestamp

### Requirement 19: Subscription Order History

**User Story:** As a customer, I want to view all orders placed through my subscriptions, so that I can track my recurring purchases.

#### Acceptance Criteria

1. WHEN a user views their subscription details, THE System SHALL display order history for that subscription
2. WHEN displaying subscription order history, THE System SHALL show order date, order ID, quantity, and status
3. WHEN displaying subscription order history, THE System SHALL allow filtering by date range
4. THE System SHALL link each subscription order to its full order details page
5. WHEN a subscription order fails, THE System SHALL display the failure reason in order history

### Requirement 20: Subscription Billing Error Handling

**User Story:** As a customer, I want to be notified if my subscription order fails due to insufficient funds, so that I can add funds and resume service.

#### Acceptance Criteria

1. WHEN a subscription order fails due to insufficient wallet balance, THE System SHALL pause the subscription
2. WHEN a subscription is paused due to payment failure, THE System SHALL send email notification
3. WHEN sending payment failure notification, THE System SHALL include required amount and wallet balance
4. WHEN sending payment failure notification, THE System SHALL include link to add funds
5. WHEN user adds sufficient funds, THE System SHALL allow manual retry or automatic resume
6. THE System SHALL retry failed subscription orders up to 3 times over 3 days before final pause
7. WHEN a subscription order fails for other reasons, THE System SHALL log the error and notify admins

### Requirement 21: Live Counter Real-Time Updates

**User Story:** As a visitor, I want to see the order counter update in real-time when purchases happen, so that I perceive active and immediate service.

#### Acceptance Criteria

1. WHEN an order is placed, THE System SHALL emit an event to update the live counter
2. WHEN the live counter receives an update event, THE System SHALL increment by the order quantity
3. WHEN displaying the counter increment, THE System SHALL use animated number transition lasting 0.5-1 seconds
4. WHEN multiple orders occur simultaneously, THE System SHALL batch updates to avoid excessive animation
5. THE System SHALL throttle counter updates to maximum 1 update per 2 seconds for smooth experience
6. WHEN counter value exceeds 1 million, THE System SHALL display format "1.2M" or "1,234,567"

### Requirement 22: Flash Sale Service Eligibility

**User Story:** As an administrator, I want to select which services are included in a flash sale, so that I can target specific products for promotion.

#### Acceptance Criteria

1. WHEN creating a flash sale, THE System SHALL display a list of all available services
2. WHEN selecting services for a flash sale, THE System SHALL allow multi-select functionality
3. WHEN a flash sale is active, THE System SHALL apply discount only to selected services
4. WHEN displaying a service, THE System SHALL indicate if it's currently in a flash sale
5. WHEN a service is in multiple flash sales, THE System SHALL apply the highest discount percentage
6. THE System SHALL validate that at least one service is selected before saving a flash sale

### Requirement 23: Subscription Frequency Options

**User Story:** As a customer, I want to choose how often I receive my auto-reorders, so that I can align subscriptions with my actual usage needs.

#### Acceptance Criteria

1. WHEN creating a subscription, THE System SHALL offer frequency options: weekly, bi-weekly, monthly
2. WHEN frequency is "weekly", THE System SHALL schedule next order 7 days from the last order
3. WHEN frequency is "bi-weekly", THE System SHALL schedule next order 14 days from the last order
4. WHEN frequency is "monthly", THE System SHALL schedule next order 30 days from the last order
5. WHEN a user changes subscription frequency, THE System SHALL recalculate next_order_date
6. WHEN displaying subscription details, THE System SHALL clearly show the current frequency

### Requirement 24: Review Input Sanitization

**User Story:** As a system administrator, I want review submissions to be sanitized against malicious content, so that the site remains secure.

#### Acceptance Criteria

1. WHEN a review is submitted, THE System SHALL sanitize HTML tags from review text
2. WHEN a review is submitted, THE System SHALL escape special characters to prevent XSS attacks
3. WHEN a review is submitted, THE System SHALL trim excessive whitespace
4. WHEN a review is submitted, THE System SHALL limit review text to maximum 1000 characters
5. WHEN a review contains URLs, THE System SHALL validate them or remove suspicious links
6. THE System SHALL reject reviews containing profanity or offensive language

### Requirement 25: Flash Sale Countdown Precision

**User Story:** As a customer, I want the countdown timer to be accurate, so that I can trust the urgency and make timely purchase decisions.

#### Acceptance Criteria

1. WHEN displaying countdown timer, THE System SHALL calculate remaining time based on server time
2. WHEN countdown reaches zero, THE System SHALL immediately hide the flash sale display
3. WHEN countdown reaches zero, THE System SHALL mark the flash sale as expired
4. THE System SHALL synchronize countdown timers across all user sessions
5. WHEN a user refreshes the page, THE System SHALL display accurate remaining time
6. WHEN displaying time remaining, THE System SHALL use consistent time zone (UTC or server time)
7. WHEN countdown shows less than 1 hour, THE System SHALL display format "MM:SS" with minutes and seconds

### Requirement 26: Subscription Dashboard Widget

**User Story:** As a customer, I want to see my active subscriptions summary on my dashboard, so that I can quickly check status without navigating to detailed pages.

#### Acceptance Criteria

1. WHEN viewing the user dashboard, THE System SHALL display a subscriptions widget
2. WHEN displaying the subscriptions widget, THE System SHALL show count of active subscriptions
3. WHEN displaying the subscriptions widget, THE System SHALL show next upcoming order date
4. WHEN displaying the subscriptions widget, THE System SHALL show total monthly recurring amount
5. WHEN a user clicks the subscriptions widget, THE System SHALL navigate to full subscription management page
6. WHEN user has no subscriptions, THE System SHALL display a call-to-action to create one

### Requirement 27: Live Counter Admin Analytics

**User Story:** As an administrator, I want to see analytics on the live counter's performance, so that I can optimize the baseline and time window settings.

#### Acceptance Criteria

1. WHEN viewing live counter settings, THE System SHALL display current counter value
2. WHEN viewing live counter analytics, THE System SHALL show real orders count vs baseline ratio
3. WHEN viewing live counter analytics, THE System SHALL show hourly breakdown of real orders
4. THE System SHALL provide recommendations for baseline adjustment based on actual order volume
5. WHEN real order volume is consistently higher than baseline, THE System SHALL suggest increasing baseline

### Requirement 28: Review Notification

**User Story:** As an administrator, I want to receive notifications when new reviews are submitted, so that I can review and approve them promptly.

#### Acceptance Criteria

1. WHEN a review is submitted, THE System SHALL send email notification to admin
2. WHEN sending review notification, THE System SHALL include reviewer name, rating, and review text
3. WHEN sending review notification, THE System SHALL include direct link to admin approval page
4. THE System SHALL batch review notifications if multiple reviews are submitted within 1 hour
5. THE System SHALL include review count in the admin panel navigation badge

### Requirement 29: Subscription Cancellation Confirmation

**User Story:** As a customer, I want to confirm before canceling a subscription, so that I don't accidentally cancel ongoing service.

#### Acceptance Criteria

1. WHEN a user clicks cancel subscription, THE System SHALL display confirmation dialog
2. WHEN displaying cancellation confirmation, THE System SHALL show subscription details and next order date
3. WHEN displaying cancellation confirmation, THE System SHALL warn that discounts will be lost
4. WHEN user confirms cancellation, THE System SHALL update status to "canceled"
5. WHEN user confirms cancellation, THE System SHALL send confirmation email
6. THE System SHALL allow users to reactivate canceled subscriptions as new subscriptions

### Requirement 30: Flash Sale Urgency Styling

**User Story:** As a developer, I want flash sale displays to use urgent visual styling, so that they grab attention and create a sense of urgency.

#### Acceptance Criteria

1. WHEN displaying flash sales, THE System SHALL use warm colors (red, orange, yellow)
2. WHEN displaying countdown timers, THE System SHALL use bold, large font
3. WHEN countdown shows less than 1 hour, THE System SHALL use red color and optional pulsing animation
4. THE System SHALL display flash sale badges or tags on affected service cards
5. THE System SHALL use contrasting background colors to make flash sales stand out
6. WHEN displaying flash sale discount, THE System SHALL show strikethrough on original price
7. THE System SHALL ensure flash sale styling is consistent across homepage and service pages

## Technical Considerations

### Database Schema
- Flash sales stored in `admin-store.json` under `flashSales` array
- Subscriptions stored in `admin-store.json` under `subscriptions` array  
- Live counter settings stored in `admin-store.json` under `settings.liveCounter`
- Reviews stored in `admin-store.json` under `reviews` array
- Subscription orders linked to regular orders table with `subscription_id` field

### Integration Points
- Flash sale discounts integrate with existing pricing calculation in `/lib/commerce.ts`
- Subscription processing integrates with order creation flow
- Live counter reads from orders table in Supabase
- Review submissions accessible from FAQ page and footer

### Performance Considerations
- Live counter should use caching to avoid repeated database queries
- Countdown timers use client-side JavaScript to reduce server load
- Subscription processing should run via scheduled job (cron or background task)
- Flash sale status checks should be efficient to avoid slowing page loads

### Security Considerations
- Admin-only access to flash sale management, subscription management, and review approval
- Review text sanitization to prevent XSS attacks
- Rate limiting on review submissions to prevent spam
- Subscription billing requires secure payment processing

### User Experience
- Flash sales should be visually prominent without being intrusive
- Countdown timers should be easily readable and accurate
- Subscription management should be simple and transparent
- Live counter should feel dynamic without appearing manipulative
- Review submission should be frictionless to encourage participation

### Email Notifications
- Pre-subscription order notification sent 24 hours before processing
- Subscription order confirmation after successful processing
- Subscription pause notification on payment failure
- Review submission notification to admin
- Flash sale reminder emails (optional future enhancement)
