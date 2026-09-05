# Implementation Plan: Marketing & Conversion Features

## Overview

This implementation plan covers four critical marketing and conversion features for cheapfollower.shop:

1. **Flash Sales System** - Time-limited promotional offers with countdown timers
2. **Auto-Reorder Subscriptions** - Recurring order system with automatic processing
3. **Live Order Counter** - Real-time social proof display
4. **Review Submission System** - Customer testimonial collection and approval

The implementation follows a staged approach: foundational data structures and APIs first, then UI components, then admin interfaces, and finally integration and testing. All features integrate with existing `admin-store.json` persistence, `commerce.ts` pricing logic, and Next.js App Router architecture.

**Technology Stack**: TypeScript, Next.js 14+, React 19, Tailwind CSS, Vitest + fast-check for testing

## Tasks

### Phase 1: Flash Sales System

- [ ] 1. Implement flash sales core data model and business logic
  - [ ] 1.1 Create flash sales library module (`src/lib/flash-sales.ts`)
    - Implement `FlashSale` TypeScript interface with all required fields (id, title, discount, startTime, endTime, serviceIds, status, timestamps)
    - Implement `getActiveFlashSale(serviceId: string)` function to fetch highest discount active sale
    - Implement `applyFlashSaleDiscount(price: number, discount: number)` pricing calculation
    - Implement `updateFlashSaleStatuses()` function to transition scheduled→active→expired based on server time
    - Implement validation functions for flash sale creation (title non-empty, discount 1-99, end > start, services non-empty)
    - Add helper functions for filtering and sorting flash sales
    - _Requirements: 1.1-1.8, 3.1-3.5, 4.1-4.6, 22.1-22.6_
  
  - [ ]* 1.2 Write property tests for flash sale business logic
    - **Property 1: Flash sale discount calculation correctness**
    - **Validates: Requirements 4.2, 4.5**
    - Test that `applyFlashSaleDiscount(price, discount)` returns `price * (1 - discount/100)` rounded to 2 decimals
    - Test boundary cases: discount at 1%, 50%, 99%
    - Test that discounted price is always less than original price for valid discounts
  
  - [ ]* 1.3 Write property tests for flash sale status transitions
    - **Property 2: Status transition consistency**
    - **Validates: Requirements 1.7, 1.8, 3.1**
    - Generate random flash sales with various start/end times
    - Verify scheduled→active transition when current time >= startTime
    - Verify active→expired transition when current time >= endTime
    - Verify status remains consistent with time boundaries

- [ ] 2. Implement flash sales API endpoints
  - [ ] 2.1 Create GET `/api/flash-sales` endpoint for public access
    - Accept optional `serviceId` query parameter for filtering
    - Fetch active flash sales from admin-store.json
    - Filter by serviceId if provided
    - Return JSON response with flashSales array
    - _Requirements: 2.1-2.2, 22.3-22.5_
  
  - [ ] 2.2 Create POST `/api/admin/flash-sales` endpoint for creating flash sales (admin only)
    - Validate authentication and admin role
    - Validate request body against flash sale schema
    - Generate unique UUID for flash sale ID
    - Set status to 'scheduled' or 'active' based on start time
    - Store in admin-store.json under `flashSales` array
    - Return created flash sale
    - _Requirements: 1.1-1.8, 18.1-18.7_
  
  - [ ] 2.3 Create PUT `/api/admin/flash-sales/[id]` endpoint for updating flash sales (admin only)
    - Validate authentication and admin role
    - Validate partial flash sale updates
    - Update flash sale in admin-store.json
    - Update `updatedAt` timestamp
    - Return updated flash sale
    - _Requirements: 18.3-18.4, 18.7_
  
  - [ ] 2.4 Create DELETE `/api/admin/flash-sales/[id]` endpoint (admin only)
    - Validate authentication and admin role
    - Remove flash sale from admin-store.json
    - Return success response
    - _Requirements: 18.5_
  
  - [ ]* 2.5 Write integration tests for flash sales API endpoints
    - Test GET endpoint filters by serviceId correctly
    - Test POST endpoint validates input and generates unique IDs
    - Test PUT endpoint updates existing flash sales
    - Test DELETE endpoint removes flash sales
    - Test authentication requirements for admin endpoints
    - _Requirements: 1.1-1.8, 2.1-2.2, 18.1-18.7_

- [ ] 3. Implement flash sale UI components
  - [ ] 3.1 Create CountdownTimer component (`src/components/marketing/CountdownTimer.tsx`)
    - Accept `endTime` (ISO 8601), `onExpire` callback, `variant` prop
    - Implement useEffect hook with 1-second interval for countdown updates
    - Calculate remaining time: `new Date(endTime) - Date.now()`
    - Format display as "DD:HH:MM:SS", "HH:MM:SS", or "MM:SS" based on duration
    - Switch to urgent styling (red color, larger font, pulsing animation) when < 1 hour
    - Call `onExpire` callback when reaching zero
    - Clean up interval on component unmount
    - _Requirements: 2.4-2.5, 25.1-25.7, 30.3_
  
  - [ ] 3.2 Create FlashSaleBanner component (`src/components/marketing/FlashSaleBanner.tsx`)
    - Accept `serviceId` (optional) and `placement` ('homepage' | 'service-page') props
    - Fetch active flash sales from `/api/flash-sales` endpoint
    - Filter by highest discount if multiple sales apply
    - Display sale title, discount percentage, and CountdownTimer
    - Apply urgent styling with red/orange gradient background
    - Auto-refresh when countdown expires
    - Return null if no active sales
    - _Requirements: 2.1-2.3, 2.6-2.7, 30.1-30.7_
  
  - [ ] 3.3 Integrate FlashSaleBanner into homepage
    - Add FlashSaleBanner near hero section on homepage (`src/app/page.tsx`)
    - Position prominently without being intrusive
    - _Requirements: 2.1, 30.1-30.7_
  
  - [ ] 3.4 Integrate FlashSaleBanner into service pages
    - Add FlashSaleBanner to service page templates
    - Pass `serviceId` prop for filtering
    - Display service-specific flash sales
    - _Requirements: 2.2, 30.7_
  
  - [ ]* 3.5 Write unit tests for countdown timer component
    - Test countdown formatting for various durations
    - Test urgent styling activation at < 1 hour
    - Test onExpire callback is called at zero
    - Test cleanup on unmount
    - _Requirements: 2.4-2.5, 25.1-25.7_

- [ ] 4. Implement flash sales admin interface
  - [ ] 4.1 Create flash sales admin page (`src/app/admin/flash-sales/page.tsx`)
    - Display table with all flash sales (columns: title, discount, date range, services, status, countdown, actions)
    - Implement status badges (scheduled: blue, active: green, expired: gray)
    - Add "Create Flash Sale" button to open creation form
    - Display real-time countdown in table for active sales
    - Show manual expire button for active sales
    - Implement delete confirmation dialog
    - _Requirements: 18.1-18.7_
  
  - [ ] 4.2 Create flash sale form component (`src/components/admin/FlashSaleForm.tsx`)
    - Implement form fields: title (text, required, max 100 chars), discount (number, 1-99), start date/time (datetime-local), end date/time (datetime-local, must be > start), service selection (multi-select checkboxes)
    - Implement client-side validation
    - Handle form submission to POST or PUT endpoints
    - Display validation errors
    - Show success/error messages
    - _Requirements: 1.1-1.5, 18.3-18.4, 22.1-22.2_
  
  - [ ]* 4.3 Write integration tests for flash sales admin interface
    - Test table displays flash sales correctly
    - Test status badges update based on time
    - Test creation form validation
    - Test edit functionality updates flash sales
    - Test delete confirmation and removal
    - _Requirements: 18.1-18.7_

- [ ] 5. Integrate flash sales with pricing system
  - [ ] 5.1 Extend commerce.ts with flash sale pricing integration
    - Create `calculateServicePrice(serviceId: string, basePrice: number)` function
    - Call `getActiveFlashSale(serviceId)` to check for active sales
    - Apply flash sale discount if active sale found
    - Return discounted or original price
    - Display both original and sale prices in UI
    - _Requirements: 4.1-4.6_
  
  - [ ] 5.2 Update service pages to display flash sale pricing
    - Show strikethrough on original price when flash sale active
    - Display discounted price prominently
    - Add "Flash Sale" badge to affected services
    - _Requirements: 4.3, 30.6_
  
  - [ ]* 5.3 Write property tests for flash sale pricing integration
    - **Property 3: Pricing consistency with multiple discounts**
    - **Validates: Requirements 4.6**
    - Generate scenarios with flash sale discounts and promo codes
    - Verify that highest discount is applied
    - Verify that both discounts are never stacked
    - _Requirements: 4.6_

- [ ] 6. Checkpoint - Flash sales system complete
  - Ensure all flash sales tests pass, verify countdown timers work in browser, confirm admin interface is functional. Ask the user if questions arise.

### Phase 2: Auto-Reorder Subscriptions

- [ ] 7. Implement subscriptions core data model and business logic
  - [ ] 7.1 Create subscriptions library module (`src/lib/subscriptions.ts`)
    - Implement `Subscription` TypeScript interface (id, userId, serviceId, serviceName, quantity, frequency, status, discountPercent, nextOrderDate, lastOrderDate, timestamps)
    - Implement `calculateNextOrderDate(frequency, fromDate)` function
    - Implement `calculateSubscriptionPrice(subscription)` function with 15% default discount
    - Implement `processSubscriptionOrders()` function to find and process due subscriptions
    - Implement `processSingleSubscription(subscription)` function with wallet check, order creation, wallet debit, next date update
    - Implement `pauseSubscription(id, reason)`, `resumeSubscription(id)`, `cancelSubscription(id)` functions
    - Implement validation for subscription creation (serviceId valid, quantity > 0, frequency in allowed values)
    - _Requirements: 5.1-5.8, 6.1-6.7, 8.1-8.8, 9.1-9.6, 20.1-20.7, 23.1-23.6_
  
  - [ ]* 7.2 Write property tests for subscription date calculation
    - **Property 4: Next order date calculation correctness**
    - **Validates: Requirements 5.6, 23.2-23.4**
    - Generate random frequencies (weekly, bi-weekly, monthly)
    - Verify weekly adds exactly 7 days
    - Verify bi-weekly adds exactly 14 days
    - Verify monthly adds exactly 30 days
  
  - [ ]* 7.3 Write property tests for subscription pricing
    - **Property 5: Subscription discount application**
    - **Validates: Requirements 9.2, 9.4**
    - Generate random base prices and quantities
    - Verify subscription price = base_price * quantity * 0.85 (15% discount)
    - Verify result rounded to 2 decimal places
    - Test that subscription price < one-time price for all inputs

- [ ] 8. Implement subscriptions API endpoints
  - [ ] 8.1 Create GET `/api/subscriptions` endpoint (authenticated users)
    - Validate user authentication
    - Fetch subscriptions for current user from admin-store.json
    - Filter by userId
    - Return subscriptions array with all details
    - _Requirements: 8.1-8.2, 26.1-26.6_
  
  - [ ] 8.2 Create POST `/api/subscriptions` endpoint for creating subscriptions (authenticated users)
    - Validate user authentication
    - Validate request body (serviceId, quantity > 0, frequency in allowed values)
    - Generate unique UUID for subscription ID
    - Calculate nextOrderDate based on frequency from current date
    - Set status to 'active', discountPercent to 15
    - Store in admin-store.json under `subscriptions` array
    - Return created subscription
    - _Requirements: 5.1-5.8_
  
  - [ ] 8.3 Create PUT `/api/subscriptions/[id]` endpoint for updating subscriptions (authenticated users)
    - Validate user authentication and ownership
    - Allow updates to status (pause, resume), quantity, frequency
    - Prevent modifications to canceled subscriptions
    - Recalculate nextOrderDate if frequency changed
    - Update `updatedAt` timestamp
    - Return updated subscription
    - _Requirements: 8.3-8.8_
  
  - [ ] 8.4 Create DELETE `/api/subscriptions/[id]` endpoint for canceling (authenticated users)
    - Validate user authentication and ownership
    - Set status to 'canceled'
    - Do not remove from storage (keep for history)
    - Return success response
    - _Requirements: 8.5, 29.1-29.6_
  
  - [ ] 8.5 Create GET `/api/subscriptions/[id]/orders` endpoint for order history (authenticated users)
    - Validate user authentication and ownership
    - Query orders table where subscriptionId matches
    - Return orders array with dates, statuses, quantities
    - _Requirements: 19.1-19.5_
  
  - [ ]* 8.6 Write integration tests for subscriptions API endpoints
    - Test GET endpoint returns only user's subscriptions
    - Test POST endpoint validates input and creates subscriptions
    - Test PUT endpoint updates status and recalculates dates
    - Test DELETE endpoint sets status to canceled
    - Test ownership validation prevents unauthorized access
    - _Requirements: 5.1-5.8, 8.1-8.8, 19.1-19.5_

- [ ] 9. Implement subscription processing cron job
  - [ ] 9.1 Create subscription processing cron endpoint (`src/app/api/cron/subscriptions/route.ts`)
    - Verify cron secret from authorization header
    - Call `processSubscriptionOrders()` from subscriptions library
    - Return success response
    - _Requirements: 6.1-6.7, 20.1-20.7_
  
  - [ ] 9.2 Configure Vercel Cron job in `vercel.json`
    - Add cron configuration for `/api/cron/subscriptions` path
    - Set schedule to run every hour ("0 * * * *")
    - _Requirements: 6.7_
  
  - [ ] 9.3 Implement subscription order creation logic
    - Extend order creation in commerce.ts to accept subscriptionId
    - Add `isSubscriptionOrder` flag to orders
    - Link subscription orders to subscription via subscriptionId field
    - Apply subscription discount to order total
    - _Requirements: 6.1-6.3, 9.6_
  
  - [ ]* 9.4 Write integration tests for subscription processing
    - Test processing identifies due subscriptions correctly
    - Test order creation for subscriptions with sufficient balance
    - Test subscription pause on insufficient funds
    - Test nextOrderDate update after successful processing
    - Test error handling for failed orders
    - _Requirements: 6.1-6.7, 20.1-20.7_

- [ ] 10. Implement subscription email notifications
  - [ ] 10.1 Create subscription email templates
    - Pre-order notification template (24 hours before processing)
    - Order confirmation template
    - Payment failure notification template
    - Cancellation confirmation template
    - _Requirements: 7.1-7.6, 20.2-20.4, 29.5_
  
  - [ ] 10.2 Integrate email sending in subscription processing
    - Send pre-order notification 24 hours before nextOrderDate
    - Send confirmation after successful order processing
    - Send failure notification on insufficient funds with link to add funds
    - Send cancellation confirmation when user cancels subscription
    - Implement retry logic for failed email deliveries (up to 3 attempts)
    - _Requirements: 7.1-7.6, 20.2-20.4_
  
  - [ ]* 10.3 Write unit tests for email notification logic
    - Test correct template is selected for each notification type
    - Test retry logic for failed deliveries
    - Test notification includes required fields (links, amounts, dates)
    - _Requirements: 7.1-7.6_

- [ ] 11. Implement subscription UI components
  - [ ] 11.1 Create SubscriptionWidget for dashboard (`src/components/dashboard/SubscriptionWidget.tsx`)
    - Fetch user's subscriptions from `/api/subscriptions`
    - Display: active count, next order date, monthly total
    - Show call-to-action if no subscriptions
    - Link to full subscription management page
    - _Requirements: 26.1-26.6_
  
  - [ ] 11.2 Create subscription management page (`src/app/dashboard/subscriptions/page.tsx`)
    - Display table with all user subscriptions (columns: service, quantity, frequency, next order, total, status, actions)
    - Implement status badges (active: green, paused: yellow, canceled: gray)
    - Add action buttons: Pause, Resume, Cancel, Modify
    - Display order history for each subscription
    - Show one-time vs subscription price comparison
    - _Requirements: 8.1-8.8, 19.1-19.5, 26.1-26.6_
  
  - [ ] 11.3 Create SubscriptionCreation component (`src/components/subscriptions/SubscriptionCreation.tsx`)
    - Accept `serviceId` and optional `defaultQuantity` props
    - Display service details and pricing
    - Implement form: quantity input, frequency selector (weekly/bi-weekly/monthly)
    - Show price comparison: one-time price vs subscription price with 15% discount
    - Handle form submission to POST `/api/subscriptions`
    - Redirect to subscription management on success
    - _Requirements: 5.1-5.8, 9.1-9.6, 23.1-23.6_
  
  - [ ] 11.4 Implement cancellation confirmation dialog
    - Display when user clicks "Cancel" on a subscription
    - Show subscription details and next order date
    - Warn about lost discount benefits
    - Confirm cancellation before API call
    - _Requirements: 29.1-29.6_
  
  - [ ]* 11.5 Write integration tests for subscription UI components
    - Test SubscriptionWidget displays correct summary
    - Test subscription management page renders all subscriptions
    - Test action buttons call correct API endpoints
    - Test creation form validates input and submits correctly
    - Test cancellation dialog shows warnings
    - _Requirements: 8.1-8.8, 26.1-26.6, 29.1-29.6_

- [ ] 12. Integrate subscriptions into service pages
  - [ ] 12.1 Add "Subscribe & Save 15%" option to service pages
    - Display subscription pricing alongside one-time pricing
    - Show savings calculation
    - Add "Subscribe" button that opens SubscriptionCreation component
    - Highlight subscription benefits (auto-reorder, discount, convenience)
    - _Requirements: 9.1-9.6_
  
  - [ ] 12.2 Integrate SubscriptionWidget into user dashboard
    - Add SubscriptionWidget to dashboard layout (`src/app/dashboard/page.tsx`)
    - Position prominently for easy access
    - _Requirements: 26.1-26.6_

- [ ] 13. Checkpoint - Subscriptions system complete
  - Ensure all subscription tests pass, verify cron job runs correctly, test email notifications, confirm UI displays subscriptions properly. Ask the user if questions arise.

### Phase 3: Live Order Counter

- [ ] 14. Implement live counter core data model and business logic
  - [ ] 14.1 Create live counter library module (`src/lib/live-counter.ts`)
    - Implement `LiveCounterConfig` TypeScript interface (baselineCount, timeWindow, updatedAt)
    - Implement `getLiveCounterValue()` function that fetches config and counts recent orders
    - Implement `countRecentOrders(timeWindow)` function to query Supabase orders table
    - Filter orders by time window (last 1 hour or last 24 hours)
    - Filter by status: include paid, completed, processing; exclude refunded
    - Sum order quantities for real orders count
    - Return total = baselineCount + realOrdersCount
    - _Requirements: 10.1-10.6, 12.1-12.7, 13.1-13.5, 27.1-27.5_
  
  - [ ]* 14.2 Write property tests for counter calculation
    - **Property 6: Counter value correctness**
    - **Validates: Requirements 12.1-12.2**
    - Generate random baseline counts and order quantities
    - Verify counter = baseline + sum(order.quantity)
    - Verify refunded orders are excluded
    - Verify only paid/completed/processing orders included
  
  - [ ]* 14.3 Write unit tests for time window filtering
    - Test "last_hour" includes orders from past 60 minutes
    - Test "last_24_hours" includes orders from past 24 hours
    - Test orders outside time window are excluded
    - _Requirements: 12.3-12.4_

- [ ] 15. Implement live counter API endpoints
  - [ ] 15.1 Create GET `/api/live-counter` endpoint for public access
    - Fetch current counter configuration from admin-store.json
    - Call `getLiveCounterValue()` to calculate current count
    - Return JSON with count, timeWindow label, baselineCount, realOrdersCount
    - _Requirements: 11.1-11.6, 12.1-12.7_
  
  - [ ] 15.2 Create PUT `/api/admin/live-counter` endpoint for admin configuration (admin only)
    - Validate authentication and admin role
    - Accept partial updates to baselineCount and timeWindow
    - Validate baselineCount is non-negative integer
    - Validate timeWindow is "last_hour" or "last_24_hours"
    - Store in admin-store.json under `settings.liveCounter`
    - Update `updatedAt` timestamp
    - Return updated configuration
    - _Requirements: 10.1-10.6, 12.7, 13.1-13.5_
  
  - [ ]* 15.3 Write integration tests for live counter API endpoints
    - Test GET endpoint calculates count correctly
    - Test PUT endpoint validates and stores configuration
    - Test authentication for admin endpoint
    - _Requirements: 10.1-10.6, 12.1-12.7_

- [ ] 16. Implement live counter UI components
  - [ ] 16.1 Create LiveOrderCounter component (`src/components/marketing/LiveOrderCounter.tsx`)
    - Accept optional `refreshInterval` prop (default 5000ms)
    - Fetch counter value from `/api/live-counter` endpoint
    - Display formatted number with commas (e.g., "125,847")
    - Show time window label ("in the last hour" or "in the last 24 hours")
    - Poll API at specified interval using useEffect
    - Implement smooth number transition animation on value change
    - Use attention-grabbing pulse animation on increase
    - Handle large numbers: format > 1M as "1.2M" or "1,234,567"
    - _Requirements: 11.1-11.6, 21.1-21.6_
  
  - [ ] 16.2 Create CSS animations for counter updates
    - Implement smooth transition for number changes
    - Implement pulse animation for increases
    - Throttle animations to avoid excessive visual noise
    - _Requirements: 21.3-21.5_
  
  - [ ]* 16.3 Write unit tests for LiveOrderCounter component
    - Test counter displays formatted number correctly
    - Test polling interval triggers API calls
    - Test animation classes applied on value change
    - Test cleanup of polling interval on unmount
    - _Requirements: 11.1-11.6, 21.1-21.6_

- [ ] 17. Implement live counter admin interface
  - [ ] 17.1 Add live counter configuration section to admin settings page (`src/app/admin/settings/page.tsx`)
    - Display current counter value (read-only)
    - Display baseline count input field
    - Display time window selector (radio buttons: last_hour, last_24_hours)
    - Display real orders count (read-only)
    - Show baseline adjustment recommendations based on real order volume
    - Handle form submission to PUT `/api/admin/live-counter`
    - _Requirements: 10.1-10.6, 27.1-27.5_
  
  - [ ] 17.2 Implement live counter analytics display
    - Show current counter value
    - Show real orders vs baseline ratio
    - Display hourly breakdown of real orders (if applicable)
    - Provide recommendations for baseline adjustment
    - _Requirements: 27.1-27.5_
  
  - [ ]* 17.3 Write integration tests for live counter admin interface
    - Test configuration form updates settings
    - Test analytics display shows correct metrics
    - Test recommendations are generated based on order volume
    - _Requirements: 10.1-10.6, 27.1-27.5_

- [ ] 18. Integrate live counter into homepage
  - [ ] 18.1 Add LiveOrderCounter to homepage near hero section
    - Position prominently but not intrusively
    - Ensure counter is visible on page load
    - Test on various screen sizes (responsive design)
    - _Requirements: 11.1-11.6_
  
  - [ ] 18.2 Integrate counter updates with order processing
    - Emit event or invalidate cache when new order is placed
    - Ensure counter reflects new orders within 5 seconds
    - _Requirements: 21.1-21.2, 21.5_

- [ ] 19. Checkpoint - Live counter system complete
  - Ensure all live counter tests pass, verify counter updates in real-time, confirm admin configuration works, test animations. Ask the user if questions arise.

### Phase 4: Review Submission System

- [ ] 20. Implement reviews core data model and business logic
  - [ ] 20.1 Create reviews library module (`src/lib/reviews.ts`)
    - Implement `Review` TypeScript interface (id, name, email, rating, reviewText, status, timestamps)
    - Implement `sanitizeReviewText(text)` function to remove HTML tags, escape special characters, trim whitespace
    - Implement `containsProfanity(text)` function with basic profanity list
    - Implement `validateReview(input)` function checking name required, email format valid, rating 1-5, reviewText 10-1000 chars
    - Implement `isValidEmail(email)` helper function
    - Return validation result with errors array
    - _Requirements: 14.1-14.8, 15.1-15.5, 24.1-24.6_
  
  - [ ]* 20.2 Write property tests for review sanitization
    - **Property 7: Review text sanitization safety**
    - **Validates: Requirements 24.1-24.4**
    - Generate random strings with HTML tags, special characters, excessive whitespace
    - Verify sanitized output contains no HTML tags
    - Verify special characters are escaped
    - Verify length <= 1000 chars
  
  - [ ]* 20.3 Write property tests for review validation
    - **Property 8: Review validation completeness**
    - **Validates: Requirements 14.1-14.4**
    - Generate random review inputs (valid and invalid)
    - Verify empty names are rejected
    - Verify names > 100 chars rejected
    - Verify invalid email formats rejected
    - Verify ratings < 1 or > 5 rejected
    - Verify reviewText < 10 chars rejected

- [ ] 21. Implement reviews API endpoints
  - [ ] 21.1 Create GET `/api/reviews` endpoint for public access to approved reviews
    - Accept optional `limit` (default 10) and `offset` (default 0) query params
    - Fetch reviews from admin-store.json where status = 'approved'
    - Order by createdAt descending
    - Return reviews array and total count
    - _Requirements: 17.1-17.6_
  
  - [ ] 21.2 Create POST `/api/reviews` endpoint for submitting reviews
    - Accept name, email (optional), rating (optional), reviewText in request body
    - Validate input using `validateReview()` function
    - Sanitize reviewText using `sanitizeReviewText()`
    - Check for profanity, reject if found
    - Generate unique UUID for review ID
    - Set status to 'pending', add timestamps
    - Store in admin-store.json under `reviews` array
    - Send admin notification email about new review
    - Return created review
    - _Requirements: 14.1-14.8, 15.1-15.5, 24.1-24.6, 28.1-28.5_
  
  - [ ] 21.3 Create GET `/api/admin/reviews` endpoint for admin review management (admin only)
    - Validate authentication and admin role
    - Accept optional `status` query param (pending, approved, rejected)
    - Fetch reviews filtered by status from admin-store.json
    - Return reviews array
    - _Requirements: 16.1-16.7_
  
  - [ ] 21.4 Create PUT `/api/admin/reviews/[id]` endpoint for approval/rejection (admin only)
    - Validate authentication and admin role
    - Accept `status` in request body ('approved' or 'rejected')
    - Update review status in admin-store.json
    - Update `updatedAt` timestamp
    - Return updated review
    - _Requirements: 16.3-16.6_
  
  - [ ] 21.5 Create PUT `/api/admin/reviews/bulk-approve` endpoint (admin only)
    - Validate authentication and admin role
    - Accept `reviewIds` array in request body
    - Update all specified reviews to status 'approved'
    - Return count of updated reviews
    - _Requirements: 16.7_
  
  - [ ]* 21.6 Write integration tests for reviews API endpoints
    - Test GET endpoint returns only approved reviews
    - Test POST endpoint validates and sanitizes input
    - Test POST endpoint rejects profanity
    - Test admin endpoints require authentication
    - Test bulk approve updates multiple reviews
    - _Requirements: 14.1-14.8, 16.1-16.7, 17.1-17.6, 24.1-24.6_

- [ ] 22. Implement review UI components
  - [ ] 22.1 Create ReviewSubmissionForm component (`src/components/reviews/ReviewSubmissionForm.tsx`)
    - Accept optional `userId` prop to pre-fill authenticated user data
    - Implement form fields: name (required, text input), email (optional, email input), rating (optional, 1-5 star selector), reviewText (required, textarea, 10-1000 chars)
    - Implement client-side validation matching API validation
    - Display character count for reviewText
    - Handle form submission to POST `/api/reviews`
    - Show success message and reset form on success
    - Display validation errors from API
    - _Requirements: 14.1-14.8, 15.1-15.5_
  
  - [ ] 22.2 Create ReviewDisplay component (`src/components/reviews/ReviewDisplay.tsx`)
    - Accept optional `limit` (default 10) and `showPagination` (boolean) props
    - Fetch approved reviews from GET `/api/reviews`
    - Display review cards with name, rating (stars visualization), review text, date
    - Implement pagination or "Load More" button if showPagination=true
    - Order by newest first
    - _Requirements: 17.1-17.6_
  
  - [ ] 22.3 Create star rating visualization component
    - Display filled stars for rating value
    - Display empty stars for remainder
    - Use icon library or SVG for star graphics
    - _Requirements: 17.5_
  
  - [ ]* 22.4 Write unit tests for review UI components
    - Test ReviewSubmissionForm validates input before submission
    - Test ReviewDisplay renders approved reviews correctly
    - Test star rating component displays correct number of filled stars
    - _Requirements: 14.1-14.8, 17.1-17.6_

- [ ] 23. Implement review admin interface
  - [ ] 23.1 Create reviews admin page (`src/app/admin/reviews/page.tsx`)
    - Display tabs or sections for: pending, approved, rejected reviews
    - Show table with columns: name, rating, review text (truncated), submission date, actions
    - Add "Approve" and "Reject" buttons for pending reviews
    - Implement bulk selection checkboxes
    - Add "Bulk Approve" button for selected reviews
    - Display badge in admin navigation showing pending review count
    - _Requirements: 16.1-16.7, 28.5_
  
  - [ ] 23.2 Implement review notification email
    - Send email to admin when new review is submitted
    - Include reviewer name, rating, review text in email
    - Include direct link to admin approval page
    - Batch notifications if multiple reviews submitted within 1 hour
    - _Requirements: 28.1-28.5_
  
  - [ ]* 23.3 Write integration tests for review admin interface
    - Test pending reviews are displayed correctly
    - Test approve button updates review status
    - Test bulk approve updates multiple reviews
    - Test notification emails are sent
    - _Requirements: 16.1-16.7, 28.1-28.5_

- [ ] 24. Integrate review system into website
  - [ ] 24.1 Add review submission section to FAQ page
    - Create FAQ entry: "How can I submit my review?"
    - Include link to review submission page or embed form directly
    - _Requirements: 15.1-15.3_
  
  - [ ] 24.2 Create dedicated testimonials page
    - Display ReviewDisplay component with pagination
    - Show prominently approved customer reviews
    - Add call-to-action to submit own review
    - _Requirements: 17.1-17.6_
  
  - [ ] 24.3 Add review submission link to footer
    - Include "Submit Review" link in footer
    - Link to review submission page
    - _Requirements: 15.1-15.3_
  
  - [ ] 24.4 Display featured reviews on homepage
    - Show 3-5 top reviews on homepage
    - Select reviews with highest ratings or manually featured
    - Link to full testimonials page
    - _Requirements: 17.1-17.6_

- [ ] 25. Checkpoint - Review system complete
  - Ensure all review tests pass, verify sanitization works correctly, test admin approval workflow, confirm reviews display properly. Ask the user if questions arise.

### Phase 5: Integration and Final Testing

- [ ] 26. Cross-feature integration and polish
  - [ ] 26.1 Ensure flash sales and subscriptions work together
    - Verify flash sale discounts don't apply to subscription orders (subscriptions already have discount)
    - Test that flash sales display correctly on service pages with subscription options
    - Document pricing priority: subscription discount OR flash sale discount, not both
    - _Requirements: 4.6, 9.2_
  
  - [ ] 26.2 Update admin navigation to include all new features
    - Add "Flash Sales" link to admin sidebar
    - Add "Reviews" link to admin sidebar with pending count badge
    - Ensure "Settings" page includes live counter configuration
    - _Requirements: 18.1-18.7, 16.1-16.7, 27.1-27.5_
  
  - [ ] 26.3 Implement proper error handling and loading states
    - Add loading spinners for API calls in all components
    - Add error boundaries for component failures
    - Display user-friendly error messages for API failures
    - Implement retry logic for transient failures
  
  - [ ] 26.4 Optimize performance
    - Implement caching for flash sales and live counter to reduce database queries
    - Use React.memo for expensive components (CountdownTimer, LiveOrderCounter)
    - Implement proper cleanup of intervals and event listeners
    - Lazy load admin pages for smaller bundle size

- [ ] 27. End-to-end testing and documentation
  - [ ]* 27.1 Write end-to-end integration tests
    - Test complete flash sale lifecycle: create → display → apply discount → expire
    - Test complete subscription lifecycle: create → process → renew → cancel
    - Test live counter updates when orders are placed
    - Test review submission → approval → display workflow
  
  - [ ] 27.2 Update user-facing documentation
    - Create user guide for subscriptions (how to create, manage, cancel)
    - Add FAQ entries for flash sales (how they work, when they expire)
    - Document review submission process
    - Explain live counter and social proof
  
  - [ ] 27.3 Update admin documentation
    - Document flash sales creation and management
    - Document live counter configuration and recommendations
    - Document review approval workflow
    - Document subscription monitoring and troubleshooting
  
  - [ ] 27.4 Create monitoring and alerts
    - Log subscription processing errors for admin review
    - Alert on failed subscription orders
    - Monitor live counter API performance
    - Track review submission rate and approval backlog

- [ ] 28. Final checkpoint - All features complete
  - Run full test suite, verify all features work in production-like environment, test on multiple browsers and devices, confirm documentation is complete. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test-related sub-tasks and can be skipped for faster MVP
- Each task references specific requirements from the requirements document for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property-based tests use fast-check library to validate universal correctness properties from the design
- Unit tests validate specific examples, edge cases, and component behavior
- Integration tests verify API endpoints and end-to-end workflows
- The implementation follows a staged approach: core logic → APIs → UI → admin → integration
- All features integrate with existing admin-store.json persistence and commerce.ts infrastructure
- TypeScript is used throughout for type safety and developer experience

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1", "14.1", "20.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "2.2", "7.2", "7.3", "8.1", "8.2", "14.2", "14.3", "15.1", "20.2", "20.3", "21.1", "21.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "3.1", "8.3", "8.4", "8.5", "8.6", "9.1", "15.2", "15.3", "16.1", "21.3", "21.4", "21.5", "21.6", "22.1"] },
    { "id": 3, "tasks": ["3.2", "3.5", "4.1", "9.2", "9.3", "9.4", "10.1", "16.2", "16.3", "17.1", "22.2", "22.3", "22.4", "23.1"] },
    { "id": 4, "tasks": ["3.3", "3.4", "4.2", "4.3", "5.1", "10.2", "10.3", "11.1", "11.2", "17.2", "17.3", "18.1", "23.2", "23.3", "24.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "11.3", "11.4", "11.5", "12.1", "18.2", "24.2", "24.3", "24.4"] },
    { "id": 6, "tasks": ["12.2", "26.1", "26.2", "26.3", "26.4"] },
    { "id": 7, "tasks": ["27.1", "27.2", "27.3", "27.4"] }
  ]
}
```
