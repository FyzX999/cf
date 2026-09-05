# Design Document: Marketing & Conversion Features

## Overview

This design outlines the implementation of four critical marketing and conversion features for cheapfollower.shop:

1. **Flash Sales System** - Time-limited promotional offers with countdown timers to create urgency
2. **Auto-Reorder Subscriptions** - Recurring order system to increase customer lifetime value
3. **Live Order Counter** - Real-time display showing purchase activity for social proof
4. **Review Submission System** - Customer testimonial collection and display

These features integrate seamlessly with the existing admin panel at `/admin`, user dashboard, and commerce infrastructure. The design prioritizes maintainability, real-time responsiveness, and conversion optimization.

### Design Goals

- **Conversion Optimization**: Leverage urgency (flash sales, countdown timers), convenience (subscriptions), social proof (live counter), and trust (reviews)
- **Seamless Integration**: Utilize existing admin-store.json persistence, commerce.ts pricing logic, and Next.js App Router architecture
- **Real-Time Experience**: Provide dynamic, responsive UI for countdown timers and live counter updates
- **Administrative Control**: Empower admins to configure all features without code changes
- **Scalability**: Design for growth with efficient data structures and background job processing

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Homepage[Homepage]
        ServicePages[Service Pages]
        Dashboard[User Dashboard]
        AdminPanel[Admin Panel]
    end
    
    subgraph "Component Layer"
        FlashSaleBanner[FlashSaleBanner]
        CountdownTimer[CountdownTimer]
        SubscriptionWidget[SubscriptionWidget]
        LiveCounter[LiveOrderCounter]
        ReviewForm[ReviewSubmissionForm]
        ReviewDisplay[ReviewDisplay]
    end
    
    subgraph "API Layer"
        FlashSalesAPI[/api/admin/flash-sales]
        SubscriptionsAPI[/api/subscriptions]
        LiveCounterAPI[/api/live-counter]
        ReviewsAPI[/api/reviews]
        AdminReviewsAPI[/api/admin/reviews]
    end
    
    subgraph "Business Logic Layer"
        CommerceLib[commerce.ts]
        FlashSaleLib[flash-sales.ts]
        SubscriptionLib[subscriptions.ts]
        ReviewLib[reviews.ts]
        CounterLib[live-counter.ts]
    end
    
    subgraph "Data Layer"
        AdminStore[(admin-store.json)]
        Supabase[(Supabase DB)]
    end
    
    subgraph "Background Jobs"
        SubscriptionProcessor[Subscription Processor Cron]
        FlashSaleExpiry[Flash Sale Expiry Check]
        EmailService[Email Notification Service]
    end
    
    Homepage --> FlashSaleBanner
    Homepage --> LiveCounter
    ServicePages --> FlashSaleBanner
    Dashboard --> SubscriptionWidget
    AdminPanel --> FlashSalesAPI
    AdminPanel --> AdminReviewsAPI
    
    FlashSaleBanner --> CountdownTimer
    FlashSaleBanner --> FlashSalesAPI
    SubscriptionWidget --> SubscriptionsAPI
    LiveCounter --> LiveCounterAPI
    ReviewForm --> ReviewsAPI
    
    FlashSalesAPI --> FlashSaleLib
    SubscriptionsAPI --> SubscriptionLib
    LiveCounterAPI --> CounterLib
    ReviewsAPI --> ReviewLib
    
    FlashSaleLib --> AdminStore
    SubscriptionLib --> AdminStore
    SubscriptionLib --> Supabase
    CounterLib --> AdminStore
    CounterLib --> Supabase
    ReviewLib --> AdminStore
    
    FlashSaleLib --> CommerceLib
    SubscriptionLib --> CommerceLib
    
    SubscriptionProcessor --> SubscriptionLib
    SubscriptionProcessor --> EmailService
    FlashSaleExpiry --> FlashSaleLib
```

### Technology Stack

- **Frontend**: React 18, Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State Management**: React Server Components, Client Components with useState/useEffect
- **Data Persistence**: JSON file-based (admin-store.json) with Supabase fallback
- **Real-Time Updates**: Server-Sent Events (SSE) or polling for live counter
- **Background Jobs**: Vercel Cron or Node.js scheduled tasks
- **Email**: Existing email service integration
- **Styling**: Tailwind CSS with custom animations for urgency/attention

## Components and Interfaces

### 1. Flash Sales System

#### 1.1 FlashSaleBanner Component

**Location**: `src/components/marketing/FlashSaleBanner.tsx`

```typescript
interface FlashSaleBannerProps {
  serviceId?: string; // Filter sales by service, omit for homepage
  placement: 'homepage' | 'service-page';
}
```

**Responsibilities**:
- Fetch active flash sales from API
- Filter by service if provided
- Display highest discount if multiple sales apply
- Render CountdownTimer for each active sale
- Apply urgent styling (red/orange colors, large fonts)
- Auto-refresh when countdown reaches zero

**Rendering Logic**:
```typescript
// Pseudo-code
const activeSales = fetchFlashSales({ serviceId, active: true });
const highestSale = activeSales.sort((a, b) => b.discount - a.discount)[0];
if (!highestSale) return null;
return (
  <div className="bg-gradient-to-r from-red-500 to-orange-500">
    <h2>{highestSale.title}</h2>
    <p>{highestSale.discount}% OFF</p>
    <CountdownTimer endTime={highestSale.endTime} />
  </div>
);
```

#### 1.2 CountdownTimer Component

**Location**: `src/components/marketing/CountdownTimer.tsx`

```typescript
interface CountdownTimerProps {
  endTime: string; // ISO 8601 timestamp
  onExpire?: () => void;
  variant?: 'default' | 'urgent'; // urgent: < 1 hour remaining
}
```

**Responsibilities**:
- Calculate remaining time based on server time
- Update display every second
- Format time as "DD:HH:MM:SS" or "HH:MM:SS" or "MM:SS"
- Switch to urgent styling when < 1 hour
- Call onExpire callback when reaching zero
- Use CSS animations for pulsing effect when urgent

**Implementation Details**:
- Use `useEffect` with 1-second interval
- Calculate diff between `new Date(endTime)` and `Date.now()`
- Clean up interval on unmount
- Memoize formatting logic

#### 1.3 Flash Sales Admin Interface

**Location**: `src/app/admin/flash-sales/page.tsx`

**Features**:
- Table displaying all flash sales (active, scheduled, expired)
- Create/Edit form with fields:
  - Title (required, max 100 chars)
  - Discount percentage (1-99)
  - Start date/time (datetime-local input)
  - End date/time (datetime-local input, must be > start)
  - Service selection (multi-select checkboxes)
- Status indicators (scheduled, active, expired)
- Manual expiry button for active sales
- Delete confirmation dialog
- Real-time countdown display in table

### 2. Auto-Reorder Subscriptions

#### 2.1 SubscriptionWidget Component

**Location**: `src/components/dashboard/SubscriptionWidget.tsx`

```typescript
interface SubscriptionWidgetProps {
  userId: string;
}

interface SubscriptionSummary {
  activeCount: number;
  nextOrderDate: string | null;
  monthlyTotal: number;
}
```

**Responsibilities**:
- Display subscription summary on dashboard
- Show active count, next order date, monthly recurring amount
- Link to full subscription management page
- Display call-to-action if no subscriptions

#### 2.2 SubscriptionManagement Component

**Location**: `src/app/dashboard/subscriptions/page.tsx`

**Features**:
- List all subscriptions with status badges
- Display: service name, quantity, frequency, next order date, total
- Action buttons: Pause, Resume, Cancel, Modify
- Order history for each subscription
- Subscription creation form:
  - Service selector
  - Quantity input
  - Frequency selector (weekly, bi-weekly, monthly)
  - Price comparison (one-time vs subscription with 15% discount)
- Confirmation dialog for cancellation with warnings

#### 2.3 SubscriptionCreation Component

**Location**: `src/components/subscriptions/SubscriptionCreation.tsx`

```typescript
interface SubscriptionCreationProps {
  serviceId: string;
  defaultQuantity?: number;
}
```

**Responsibilities**:
- Form for creating new subscription
- Display pricing: original vs discounted (15% off)
- Frequency selector
- Submit to API endpoint
- Redirect to subscription management on success

### 3. Live Order Counter

#### 3.1 LiveOrderCounter Component

**Location**: `src/components/marketing/LiveOrderCounter.tsx`

```typescript
interface LiveOrderCounterProps {
  refreshInterval?: number; // milliseconds, default 5000
}
```

**Responsibilities**:
- Fetch current counter value from API
- Display formatted number with commas (e.g., "125,847")
- Show time window label ("in the last hour" or "in the last 24 hours")
- Animate number changes with smooth transitions
- Poll API at specified interval
- Use attention-grabbing animation on increase

**Animation Strategy**:
```css
.counter-increase {
  animation: pulse 0.5s ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

#### 3.2 Live Counter Admin Configuration

**Location**: `src/app/admin/settings/page.tsx` (add section)

**Configuration Fields**:
- Baseline count (number input, default 100,000)
- Time window selector (radio: "last_hour", "last_24_hours")
- Current counter value (read-only display)
- Real orders count (read-only display)
- Baseline adjustment recommendations based on actual volume

### 4. Review Submission System

#### 4.1 ReviewSubmissionForm Component

**Location**: `src/components/reviews/ReviewSubmissionForm.tsx`

```typescript
interface ReviewSubmissionFormProps {
  userId?: string; // Pre-fill if authenticated
  onSuccess?: () => void;
}
```

**Responsibilities**:
- Form fields: name (required), email (optional), rating (1-5 stars, optional), review text (required, min 10 chars, max 1000 chars)
- Input sanitization and validation
- Submit to API
- Success message and form reset
- Pre-fill name/email for authenticated users

**Validation**:
- Name: non-empty, max 100 chars
- Email: valid email format or empty
- Rating: 1-5 or null
- Review text: 10-1000 chars, sanitize HTML, escape special characters

#### 4.2 ReviewDisplay Component

**Location**: `src/components/reviews/ReviewDisplay.tsx`

```typescript
interface ReviewDisplayProps {
  limit?: number; // default 10
  showPagination?: boolean;
}
```

**Responsibilities**:
- Fetch approved reviews from API
- Display review cards with name, rating, text, date
- Order by created_at descending
- Pagination or "Load More" button
- Star rating visualization

#### 4.3 Review Admin Approval Interface

**Location**: `src/app/admin/reviews/page.tsx`

**Features**:
- Table showing pending reviews
- Display: name, rating, review text, submission date
- Action buttons: Approve, Reject
- Bulk approve functionality
- Filter by status (pending, approved, rejected)
- Email notification badge for new reviews

## Data Models

### Flash Sale

```typescript
interface FlashSale {
  id: string; // UUID
  title: string;
  discount: number; // 1-99
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  serviceIds: string[]; // Array of service IDs
  status: 'scheduled' | 'active' | 'expired';
  createdAt: string;
  updatedAt: string;
}
```

**Storage**: `admin-store.json` under `flashSales` array

**Indexes**: None (in-memory filtering by status and serviceIds)

### Subscription

```typescript
interface Subscription {
  id: string; // UUID
  userId: string;
  serviceId: string;
  serviceName: string; // Denormalized for display
  quantity: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  status: 'active' | 'paused' | 'canceled';
  discountPercent: number; // default 15
  nextOrderDate: string; // ISO 8601
  lastOrderDate: string | null; // ISO 8601
  createdAt: string;
  updatedAt: string;
}
```

**Storage**: `admin-store.json` under `subscriptions` array

**Indexes**: userId (for user lookups), nextOrderDate (for processing job)

### Live Counter Configuration

```typescript
interface LiveCounterConfig {
  baselineCount: number; // default 100000
  timeWindow: 'last_hour' | 'last_24_hours'; // default 'last_hour'
  updatedAt: string;
}
```

**Storage**: `admin-store.json` under `settings.liveCounter`

### Review

```typescript
interface Review {
  id: string; // UUID
  name: string;
  email: string | null;
  rating: number | null; // 1-5
  reviewText: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
```

**Storage**: `admin-store.json` under `reviews` array

**Indexes**: status (for filtering), createdAt (for ordering)

### Subscription Order

Subscription orders are regular orders with additional metadata:

```typescript
interface Order {
  // ... existing order fields
  subscriptionId?: string; // Links to subscription
  isSubscriptionOrder?: boolean; // Flag for filtering
}
```

**Storage**: Supabase `orders` table

## API Endpoints

### Flash Sales

#### GET /api/flash-sales
**Purpose**: Fetch active flash sales  
**Query Params**: `serviceId` (optional)  
**Response**:
```typescript
{
  flashSales: FlashSale[];
}
```

#### POST /api/admin/flash-sales (Admin only)
**Purpose**: Create new flash sale  
**Body**: `Omit<FlashSale, 'id' | 'status' | 'createdAt' | 'updatedAt'>`  
**Response**: `{ flashSale: FlashSale }`

#### PUT /api/admin/flash-sales/:id (Admin only)
**Purpose**: Update flash sale  
**Body**: `Partial<FlashSale>`  
**Response**: `{ flashSale: FlashSale }`

#### DELETE /api/admin/flash-sales/:id (Admin only)
**Purpose**: Delete flash sale  
**Response**: `{ success: boolean }`

### Subscriptions

#### GET /api/subscriptions
**Purpose**: Fetch user's subscriptions  
**Auth**: Required  
**Response**:
```typescript
{
  subscriptions: Subscription[];
}
```

#### POST /api/subscriptions
**Purpose**: Create subscription  
**Auth**: Required  
**Body**:
```typescript
{
  serviceId: string;
  quantity: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
}
```
**Response**: `{ subscription: Subscription }`

#### PUT /api/subscriptions/:id
**Purpose**: Update subscription (pause, resume, modify)  
**Auth**: Required  
**Body**: `Partial<Subscription>`  
**Response**: `{ subscription: Subscription }`

#### DELETE /api/subscriptions/:id
**Purpose**: Cancel subscription  
**Auth**: Required  
**Response**: `{ success: boolean }`

#### GET /api/subscriptions/:id/orders
**Purpose**: Fetch subscription order history  
**Auth**: Required  
**Response**: `{ orders: Order[] }`

### Live Counter

#### GET /api/live-counter
**Purpose**: Fetch current counter value  
**Response**:
```typescript
{
  count: number;
  timeWindow: string;
  baselineCount: number;
  realOrdersCount: number;
}
```

#### PUT /api/admin/live-counter (Admin only)
**Purpose**: Update counter configuration  
**Body**: `Partial<LiveCounterConfig>`  
**Response**: `{ config: LiveCounterConfig }`

### Reviews

#### GET /api/reviews
**Purpose**: Fetch approved reviews  
**Query Params**: `limit` (default 10), `offset` (default 0)  
**Response**:
```typescript
{
  reviews: Review[];
  total: number;
}
```

#### POST /api/reviews
**Purpose**: Submit review  
**Body**:
```typescript
{
  name: string;
  email?: string;
  rating?: number;
  reviewText: string;
}
```
**Response**: `{ review: Review }`

#### GET /api/admin/reviews (Admin only)
**Purpose**: Fetch reviews by status  
**Query Params**: `status` (pending, approved, rejected)  
**Response**: `{ reviews: Review[] }`

#### PUT /api/admin/reviews/:id (Admin only)
**Purpose**: Approve/reject review  
**Body**: `{ status: 'approved' | 'rejected' }`  
**Response**: `{ review: Review }`

#### PUT /api/admin/reviews/bulk-approve (Admin only)
**Purpose**: Bulk approve reviews  
**Body**: `{ reviewIds: string[] }`  
**Response**: `{ updated: number }`

## Business Logic Implementation

### Flash Sale Discount Application

**Location**: `src/lib/flash-sales.ts`

```typescript
export async function getActiveFlashSale(serviceId: string): Promise<FlashSale | null> {
  const store = await readStore();
  const now = new Date();
  
  const activeSales = store.flashSales?.filter((sale) => {
    const start = new Date(sale.startTime);
    const end = new Date(sale.endTime);
    return (
      sale.serviceIds.includes(serviceId) &&
      now >= start &&
      now < end &&
      sale.status === 'active'
    );
  }) ?? [];
  
  // Return highest discount
  return activeSales.sort((a, b) => b.discount - a.discount)[0] ?? null;
}

export function applyFlashSaleDiscount(price: number, discount: number): number {
  return Number((price * (1 - discount / 100)).toFixed(2));
}

export async function updateFlashSaleStatuses(): Promise<void> {
  const now = new Date();
  
  await writeStore((store) => {
    const updatedSales = (store.flashSales ?? []).map((sale) => {
      const start = new Date(sale.startTime);
      const end = new Date(sale.endTime);
      
      if (now >= end && sale.status !== 'expired') {
        return { ...sale, status: 'expired' as const, updatedAt: now.toISOString() };
      }
      
      if (now >= start && now < end && sale.status === 'scheduled') {
        return { ...sale, status: 'active' as const, updatedAt: now.toISOString() };
      }
      
      return sale;
    });
    
    return { ...store, flashSales: updatedSales };
  });
}
```

**Integration with commerce.ts**:

Modify pricing calculation to check for active flash sales:

```typescript
// In commerce.ts or new pricing utility
export async function calculateServicePrice(serviceId: string, basePrice: number): Promise<number> {
  const flashSale = await getActiveFlashSale(serviceId);
  if (flashSale) {
    return applyFlashSaleDiscount(basePrice, flashSale.discount);
  }
  return basePrice;
}
```

### Subscription Processing

**Location**: `src/lib/subscriptions.ts`

```typescript
export async function processSubscriptionOrders(): Promise<void> {
  const store = await readStore();
  const now = new Date();
  
  const dueSubscriptions = (store.subscriptions ?? []).filter((sub) => {
    return (
      sub.status === 'active' &&
      new Date(sub.nextOrderDate) <= now
    );
  });
  
  for (const subscription of dueSubscriptions) {
    try {
      await processSingleSubscription(subscription);
    } catch (error) {
      console.error(`Failed to process subscription ${subscription.id}:`, error);
      // Continue with other subscriptions
    }
  }
}

async function processSingleSubscription(subscription: Subscription): Promise<void> {
  // 1. Check wallet balance
  const wallet = await getWallet(subscription.userId);
  const price = await calculateSubscriptionPrice(subscription);
  
  if (wallet.balance < price) {
    // Pause subscription and notify user
    await pauseSubscription(subscription.id, 'insufficient_funds');
    await sendSubscriptionFailureEmail(subscription.userId, subscription, 'insufficient_funds');
    return;
  }
  
  // 2. Create order
  const order = await createSubscriptionOrder(subscription);
  
  // 3. Debit wallet
  await debitWallet(subscription.userId, price, 'Subscription', `Order ${order.id}`);
  
  // 4. Update next order date
  await updateNextOrderDate(subscription);
  
  // 5. Send confirmation email
  await sendSubscriptionConfirmationEmail(subscription.userId, subscription, order);
}

function calculateNextOrderDate(frequency: Subscription['frequency'], from: Date): string {
  const next = new Date(from);
  
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'bi-weekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setDate(next.getDate() + 30);
      break;
  }
  
  return next.toISOString();
}

async function calculateSubscriptionPrice(subscription: Subscription): Promise<number> {
  // Get base price for service
  const basePrice = await getServiceBasePrice(subscription.serviceId);
  const total = basePrice * subscription.quantity;
  const discounted = total * (1 - subscription.discountPercent / 100);
  return Number(discounted.toFixed(2));
}
```

**Cron Job Setup** (Vercel Cron):

Create `src/app/api/cron/subscriptions/route.ts`:

```typescript
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  await processSubscriptionOrders();
  return Response.json({ success: true });
}
```

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/subscriptions",
    "schedule": "0 * * * *"
  }]
}
```

### Live Counter Calculation

**Location**: `src/lib/live-counter.ts`

```typescript
export async function getLiveCounterValue(): Promise<{
  count: number;
  timeWindow: string;
  baselineCount: number;
  realOrdersCount: number;
}> {
  const store = await readStore();
  const config = store.settings.liveCounter ?? {
    baselineCount: 100000,
    timeWindow: 'last_hour' as const,
  };
  
  const realOrders = await countRecentOrders(config.timeWindow);
  const totalCount = config.baselineCount + realOrders;
  
  return {
    count: totalCount,
    timeWindow: config.timeWindow === 'last_hour' ? 'in the last hour' : 'in the last 24 hours',
    baselineCount: config.baselineCount,
    realOrdersCount: realOrders,
  };
}

async function countRecentOrders(timeWindow: 'last_hour' | 'last_24_hours'): Promise<number> {
  const db = createServiceSupabase();
  if (!db) return 0;
  
  const now = new Date();
  const cutoff = new Date();
  
  if (timeWindow === 'last_hour') {
    cutoff.setHours(cutoff.getHours() - 1);
  } else {
    cutoff.setHours(cutoff.getHours() - 24);
  }
  
  const { data, error } = await db
    .from('orders')
    .select('quantity')
    .gte('created_at', cutoff.toISOString())
    .in('status', ['paid', 'completed', 'processing'])
    .not('status', 'eq', 'refunded');
  
  if (error) {
    console.error('Failed to count recent orders:', error);
    return 0;
  }
  
  return data.reduce((sum, order) => sum + (order.quantity ?? 0), 0);
}
```

### Review Sanitization

**Location**: `src/lib/reviews.ts`

```typescript
export function sanitizeReviewText(text: string): string {
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }
  
  return sanitized;
}

export function containsProfanity(text: string): boolean {
  const profanityList = ['badword1', 'badword2']; // Expand as needed
  const lowerText = text.toLowerCase();
  return profanityList.some((word) => lowerText.includes(word));
}

export async function validateReview(input: {
  name: string;
  email?: string;
  rating?: number;
  reviewText: string;
}): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (input.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }
  
  if (input.email && !isValidEmail(input.email)) {
    errors.push('Invalid email format');
  }
  
  if (input.rating && (input.rating < 1 || input.rating > 5)) {
    errors.push('Rating must be between 1 and 5');
  }
  
  if (!input.reviewText || input.reviewText.trim().length < 10) {
    errors.push('Review must be at least 10 characters');
  }
  
  if (input.reviewText.length > 1000) {
    errors.push('Review must be 1000 characters or less');
  }
  
  if (containsProfanity(input.reviewText)) {
    errors.push('Review contains inappropriate language');
  }
  
  return { valid: errors.length === 0, errors };
}
```

## Acceptance Criteria Testing Prework

### Requirement 1: Flash Sale Creation

1.1 WHEN an admin creates a flash sale, THE System SHALL require a non-empty sale title
  **Thoughts**: This is input validation - we need to test that empty strings, whitespace-only strings, and null values are rejected. We can generate random valid and invalid inputs to test the validation logic.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random inputs (empty, whitespace, valid strings) and verify validation rejects invalid cases

1.2 WHEN an admin creates a flash sale, THE System SHALL require a discount percentage between 1 and 99
  **Thoughts**: This is boundary testing - we need to test values at boundaries (0, 1, 99, 100) and random values in between. Property-based testing is perfect for this.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random numbers and verify validation accepts 1-99 and rejects everything else

1.3 WHEN an admin creates a flash sale, THE System SHALL require a valid start date/time
  **Thoughts**: Date validation - we need to test various date formats, invalid dates, and null values.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random date strings (valid ISO 8601, invalid formats, null) and verify validation

1.4 WHEN an admin creates a flash sale, THE System SHALL require a valid end date/time after the start date
  **Thoughts**: Relational validation - end must be after start. We can generate random date pairs and verify the relationship.
  **Classification**: PROPERTY
  **Test Strategy**: Generate pairs of dates and verify validation ensures end > start

1.5 WHEN an admin creates a flash sale, THE System SHALL require at least one service to be selected
  **Thoughts**: Array validation - must be non-empty. Test with empty arrays and arrays with items.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random service arrays (empty, single item, multiple items) and verify validation

1.6 WHEN a flash sale is created, THE System SHALL store it in Admin_Store with a unique identifier
  **Thoughts**: This tests storage and ID generation. We can create multiple flash sales and verify each has a unique ID and is persisted.
  **Classification**: PROPERTY
  **Test Strategy**: Create multiple flash sales and verify each gets unique ID and is stored

1.7 WHEN a flash sale is created, THE System SHALL set initial status to "scheduled" if start time is in the future
  **Thoughts**: Status logic based on time comparison. Generate flash sales with various start times relative to now.
  **Classification**: PROPERTY
  **Test Strategy**: Generate flash sales with start times in future/past and verify status is set correctly

1.8 WHEN a flash sale is created with start time in the past or present, THE System SHALL set status to "active"
  **Thoughts**: Complementary to 1.7 - test the other branch of the status logic.
  **Classification**: PROPERTY
  **Test Strategy**: Generate flash sales with start times in past/present and verify status is "active"

### Requirement 2: Flash Sale Display

2.1 WHEN a flash sale is active, THE System SHALL display it on the homepage
  **Thoughts**: This is a UI integration test - we need to verify the component renders when there's an active sale.
  **Classification**: EXAMPLE
  **Test Strategy**: Create an active flash sale and verify homepage displays it

2.2 WHEN a flash sale applies to a specific service, THE System SHALL display it on that service's page
  **Thoughts**: Similar to 2.1 but with service filtering logic.
  **Classification**: PROPERTY
  **Test Strategy**: Generate flash sales for random services and verify they appear on correct service pages

2.3 WHEN displaying a flash sale, THE System SHALL show the sale title, discount percentage, and countdown timer
  **Thoughts**: UI content verification - check rendered output contains required elements.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random flash sales and verify rendered output contains all required fields

2.4 WHEN displaying a countdown timer, THE System SHALL update every second
  **Thoughts**: This is a timing/UI behavior test - difficult to test with PBT, better as a unit test.
  **Classification**: EXAMPLE
  **Test Strategy**: Mock timer and verify it updates at correct interval

2.5 WHEN displaying a countdown timer, THE System SHALL show format "HH:MM:SS" or "DD:HH:MM:SS" for sales longer than 24 hours
  **Thoughts**: Format validation based on duration. Generate various durations and verify correct format.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random time durations and verify formatting logic produces correct output

2.6 THE System SHALL use urgent styling for flash sales including red/orange colors and visual emphasis
  **Thoughts**: This is UI styling verification - checking CSS classes or style attributes.
  **Classification**: EXAMPLE
  **Test Strategy**: Verify rendered component has specific CSS classes

2.7 WHEN multiple flash sales apply to the same service, THE System SHALL display the highest discount percentage
  **Thoughts**: Selection logic - given multiple sales, verify highest discount is chosen.
  **Classification**: PROPERTY
  **Test Strategy**: Generate multiple overlapping flash sales and verify highest discount is displayed

### Requirement 3: Flash Sale Expiration

3.1 WHEN the current time exceeds a flash sale's end time, THE System SHALL automatically set status to "expired"
  **Thoughts**: Time-based status transition. Generate flash sales with various end times and verify status changes.
  **Classification**: PROPERTY
  **Test Strategy**: Generate flash sales with end times and verify status update logic

3.2 WHEN a flash sale expires, THE System SHALL immediately stop displaying it to users
  **Thoughts**: UI filtering based on status. Verify expired sales don't appear in display.
  **Classification**: PROPERTY
  **Test Strategy**: Generate expired flash sales and verify they're filtered from display

3.3 WHEN a flash sale expires, THE System SHALL stop applying the discount to affected services
  **Thoughts**: Pricing logic - verify discount not applied after expiration.
  **Classification**: PROPERTY
  **Test Strategy**: Generate expired flash sales and verify pricing doesn't include discount

3.4 WHEN checking flash sale status, THE System SHALL compare current server time to end time
  **Thoughts**: This is testing the comparison logic itself - verify it uses correct time source.
  **Classification**: EXAMPLE
  **Test Strategy**: Mock server time and verify comparison logic

3.5 THE System SHALL allow expired flash sales to remain in Admin_Store for historical reference
  **Thoughts**: Storage policy - verify expired sales aren't deleted.
  **Classification**: PROPERTY
  **Test Strategy**: Generate expired flash sales and verify they remain in storage

### Requirement 4: Flash Sale Discount Application

4.1 WHEN a user adds a service to cart during an active flash sale, THE System SHALL apply the discount percentage
  **Thoughts**: Discount application logic - verify correct discount is applied.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random services with flash sales and verify discounts are applied

4.2 WHEN calculating the discounted price, THE System SHALL use formula: original_price × (1 - discount_percentage / 100)
  **Thoughts**: Mathematical formula verification - classic property test.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random prices and discounts, verify formula produces correct result

4.3 WHEN displaying the discounted price, THE System SHALL show both original and sale prices
  **Thoughts**: UI content verification.
  **Classification**: PROPERTY
  **Test Strategy**: Verify rendered output contains both prices

4.4 WHEN a flash sale expires during checkout, THE System SHALL revert to original pricing and notify the user
  **Thoughts**: This is a time-based edge case - tricky to test with PBT.
  **Classification**: EDGE_CASE
  **Test Strategy**: Unit test that simulates expiration during checkout

4.5 THE System SHALL round all discounted prices to two decimal places
  **Thoughts**: Number formatting - verify rounding logic.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random prices and verify results are rounded to 2 decimals

4.6 WHEN multiple discounts are available (flash sale + promo code), THE System SHALL apply only the higher discount
  **Thoughts**: Discount selection logic - verify maximum is chosen.
  **Classification**: PROPERTY
  **Test Strategy**: Generate multiple discount scenarios and verify highest is applied

### Requirement 5: Subscription Creation

5.1 WHEN a user creates a subscription, THE System SHALL require a valid service selection
  **Thoughts**: Input validation - verify service ID is valid.
  **Classification**: PROPERTY
  **Test Strategy**: Generate valid and invalid service IDs and verify validation

5.2 WHEN a user creates a subscription, THE System SHALL require a positive quantity
  **Thoughts**: Number validation - verify quantity > 0.
  **Classification**: PROPERTY
  **Test Strategy**: Generate various quantities and verify validation rejects non-positive values

5.3 WHEN a user creates a subscription, THE System SHALL require a frequency selection (weekly, bi-weekly, monthly)
  **Thoughts**: Enum validation - verify one of valid options is selected.
  **Classification**: PROPERTY
  **Test Strategy**: Generate random frequency values and verify validation

5.4 WHEN a subscription is created, THE System SHALL generate a unique subscription ID
  **Thoughts**: ID generation uniqueness.
  **Classification**: PROPERTY
  **Test Strategy**: Create multiple subscriptions and verify all IDs are unique

5.5 WHEN a subscription is created, THE System SHALL set status to "active"
  **Thoughts**: Initial state verification.
  **Classification**: PROPERTY
  **Test Strategy**: Create subscriptions and verify initial status

5.6 WHEN a subscription is created, THE System SHALL calculate next_order_date based on frequency
  **Thoughts**: Date calculation logic - verify correct offset from creation date.
  **Classification**: PROPERTY
  **Test Strategy**: Generate subscriptions with various frequencies and verify next_order_date calculation

5.7 WHEN a subscription is created, THE System SHALL apply 15% auto-discount by default
  **Thoughts**: Default value verification.
  **Classification**: PROPERTY
  **Test Strategy**: Create subscriptions and verify default discount is set

5.8 WHEN a subscription is created, THE System SHALL store it with user_id association
  **Thoughts**: Data association verification.
  **Classification**: PROPERTY
  **Test Strategy**: Create subscriptions and verify userId is stored

### Requirement 6: Subscription Processing

6.1 WHEN a subscription's next_order_date is reached, THE System SHALL automatically create an order
  **Thoughts**: This is integration behavior - testing background job. Better as integration test.
  **Classification**: INTEGRATION
  **Test Strategy**: Run subscription processor and verify orders are created

6.2 WHEN creating a subscription order, THE System SHALL apply the auto-discount percentage
  **Thoughts**: Discount calculation in order creation.
  **Classification**: PROPERTY
  **Test Strategy**: Generate subscriptions and verify discount is applied to orders

6.3 WHEN creating a subscription order, THE System SHALL charge the user's wallet or payment method
  **Thoughts**: Payment integration - testing wallet debit.
  **Classification**: INTEGRATION
  **Test Strategy**: Process subscription and verify wallet is debited

6.4 IF wallet balance is insufficient, THEN THE System SHALL pause the subscription and notify the user
  **Thoughts**: Error handling for insufficient funds.
  **Classification**: PROPERTY
  **Test Strategy**: Generate subscriptions with insufficient wallet balance and verify pause + notification

6.5 WHEN a subscription order is successful, THE System SHALL update next_order_date based on frequency
  **Thoughts**: Date update logic after processing.
  **Classification**: PROPERTY
  **Test Strategy**: Process subscriptions and verify next_order_date is updated correctly

6.6 WHEN a subscription order is successful, THE System SHALL send confirmation email to the user
  **Thoughts**: Email notification - side effect testing.
  **Classification**: INTEGRATION
  **Test Strategy**: Mock email service and verify it's called

6.7 THE System SHALL process subscription orders within 1 hour of the scheduled time
  **Thoughts**: Performance/timing requirement - not suitable for PBT.
  **Classification**: INTEGRATION
  **Test Strategy**: Integration test with timing verification

### Requirement 7: Subscription Notification

7.1-7.6: All notification requirements
  **Thoughts**: These are all email notification tests - primarily side effects and integration.
  **Classification**: INTEGRATION
  **Test Strategy**: Mock email service and verify correct content is sent

### Requirement 8: Subscription Management

8.1 WHEN a user views their dashboard, THE System SHALL display all subscriptions with current status
  **Thoughts**: Data retrieval and filtering by userId.
  **Classification**: PROPERTY
  **Test Strategy**: Generate subscriptions for user and verify all are returned

8.2 WHEN displaying subscriptions, THE System SHALL show service name, quantity, frequency, next order date, and total
  **Thoughts**: UI content verification.
  **Classification**: PROPERTY
  **Test Strategy**: Verify rendered output contains all required fields

8.3 WHEN a user pauses a subscription, THE System SHALL set status to "paused" and skip next scheduled order
  **Thoughts**: Status transition and processing logic.
  **Classification**: PROPERTY
  **Test Strategy**: Pause subscriptions and verify status change and order skipping

8.4 WHEN a user resumes a subscription, THE System SHALL set status to "active" and calculate new next_order_date
  **Thoughts**: Status transition and date recalculation.
  **Classification**: PROPERTY
  **Test Strategy**: Resume paused subscriptions and verify status and date

8.5 WHEN a user cancels a subscription, THE System SHALL set status to "canceled" and prevent future orders
  **Thoughts**: Status transition and processing logic.
  **Classification**: PROPERTY
  **Test Strategy**: Cancel subscriptions and verify status and processing prevention

8.6 WHEN a user modifies subscription quantity, THE System SHALL update quantity and recalculate pricing
  **Thoughts**: Update logic and price recalculation.
  **Classification**: PROPERTY
  **Test Strategy**: Modify quantities and verify updates and price recalculation

8.7 THE System SHALL allow paused subscriptions to be resumed at any time
  **Thoughts**: State machine validation - paused → active transition allowed.
  **Classification**: PROPERTY
  **Test Strategy**: Verify resume is allowed for paused subscriptions

8.8 THE System SHALL prevent modifications to canceled subscriptions
  **Thoughts**: State machine validation - canceled is terminal state.
  **Classification**: PROPERTY
  **Test Strategy**: Attempt modifications to canceled subscriptions and verify rejection

### Requirements 9-30

Given the length, I'll classify the remaining key testable requirements:

**Live Counter (10-13, 21, 27)**: Mix of PROPERTY (calculation logic) and INTEGRATION (real-time updates)

**Review System (14-17, 24, 28)**: 
- Validation: PROPERTY
- Sanitization: PROPERTY
- UI display: PROPERTY
- Notifications: INTEGRATION

**Admin interfaces (18, 22, 26)**: Mostly EXAMPLE tests for UI functionality

**Subscription features (19, 20, 23, 29)**: Mix of PROPERTY (business logic) and INTEGRATION (billing, notifications)

**Styling (25, 30)**: EXAMPLE tests for UI/UX

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Flash Sale Input Validation

*For any* flash sale creation request, if the title is empty/whitespace-only, discount is outside 1-99, end date is not after start date, or services array is empty, then the system SHALL reject the request with a validation error.

**Validates: Requirements 1.1, 1.2, 1.4, 1.5**

### Property 2: Flash Sale Status Initialization

*For any* flash sale with a start time in the future, the initial status SHALL be "scheduled", and for any flash sale with a start time in the past or present, the initial status SHALL be "active".

**Validates: Requirements 1.7, 1.8**

### Property 3: Flash Sale Unique ID Generation

*For any* set of flash sales created concurrently, all generated IDs SHALL be unique.

**Validates: Requirement 1.6**

### Property 4: Flash Sale Highest Discount Selection

*For any* service with multiple active flash sales, the displayed flash sale SHALL be the one with the highest discount percentage.

**Validates: Requirements 2.7**

### Property 5: Countdown Timer Format

*For any* remaining time duration, if duration ≥ 24 hours, format SHALL be "DD:HH:MM:SS", if < 24 hours and ≥ 1 hour, format SHALL be "HH:MM:SS", and if < 1 hour, format SHALL be "MM:SS".

**Validates: Requirements 2.5**

### Property 6: Flash Sale Expiration Status Transition

*For any* flash sale where current server time exceeds end time, the status SHALL transition to "expired" and the sale SHALL not appear in active sale queries.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 7: Flash Sale Discount Calculation

*For any* price P and discount D (where 1 ≤ D ≤ 99), the discounted price SHALL equal P × (1 - D/100) rounded to 2 decimal places.

**Validates: Requirements 4.2, 4.5**

### Property 8: Maximum Discount Application

*For any* service with both a flash sale discount and a promo code discount, the system SHALL apply only the higher of the two discounts.

**Validates: Requirement 4.6**

### Property 9: Subscription Input Validation

*For any* subscription creation request, if service is invalid, quantity is non-positive, or frequency is not one of {weekly, bi-weekly, monthly}, then the system SHALL reject the request.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 10: Subscription Unique ID Generation

*For any* set of subscriptions created concurrently, all generated IDs SHALL be unique.

**Validates: Requirement 5.4**

### Property 11: Subscription Next Order Date Calculation

*For any* subscription with frequency F and reference date D, the next_order_date SHALL be D + 7 days (if F=weekly), D + 14 days (if F=bi-weekly), or D + 30 days (if F=monthly).

**Validates: Requirements 5.6, 8.4**

### Property 12: Subscription Status Transitions

*For any* subscription, the status transitions SHALL follow: created → active, active → paused, paused → active, active → canceled, paused → canceled. Canceled subscriptions SHALL NOT transition to any other status.

**Validates: Requirements 8.3, 8.4, 8.5, 8.8**

### Property 13: Subscription Insufficient Funds Handling

*For any* subscription order where wallet balance < order total, the system SHALL pause the subscription and NOT create an order.

**Validates: Requirement 6.4**

### Property 14: Subscription Discount Application

*For any* subscription order, the price SHALL be base_price × quantity × (1 - discount_percent/100) rounded to 2 decimal places.

**Validates: Requirements 5.7, 6.2, 9.4**

### Property 15: Live Counter Calculation

*For any* time window W (last_hour or last_24_hours) and baseline B, the counter value SHALL equal B + sum of quantities of all paid/completed/processing orders within window W (excluding refunded orders).

**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

### Property 16: Review Input Validation and Sanitization

*For any* review submission, if name is empty, review text is < 10 chars or > 1000 chars, or email is invalid (when provided), the system SHALL reject it. For accepted reviews, the text SHALL have HTML tags removed and special characters escaped.

**Validates: Requirements 14.1, 14.2, 14.3, 24.1, 24.2, 24.3, 24.4**

### Property 17: Review Status Filter

*For any* query for reviews with status S, the returned reviews SHALL all have status equal to S.

**Validates: Requirement 17.1**

### Property 18: Flash Sale Service Filtering

*For any* query for flash sales on service ID S, the returned flash sales SHALL all include S in their serviceIds array.

**Validates: Requirements 2.2, 22.3, 22.4**

### Property 19: Subscription User Filtering

*For any* query for subscriptions by user ID U, the returned subscriptions SHALL all have userId equal to U.

**Validates: Requirement 8.1**

### Property 20: Countdown Precision Round Trip

*For any* end time E and current time C (where E > C), calculating the countdown then reconstructing E from C + countdown SHALL yield the original E (within 1 second tolerance).

**Validates: Requirements 25.1, 25.5, 25.6**

## Error Handling

### Flash Sales

- **Invalid input**: Return 400 with detailed validation errors
- **Overlapping sales on same service**: Allow (highest discount wins)
- **Clock skew**: Use server time consistently across all operations
- **Missing services**: Validate service IDs exist before saving flash sale

### Subscriptions

- **Insufficient funds**: Pause subscription, send email, allow manual retry
- **Payment processing failure**: Retry up to 3 times over 3 days, then pause
- **Invalid service**: Prevent creation, return validation error
- **Concurrent modifications**: Use optimistic locking (follow wallet pattern in commerce.ts)
- **Missed processing window**: Process immediately when detected, log warning

### Live Counter

- **Database unavailable**: Fall back to baseline count only
- **Query timeout**: Return cached value, retry in background
- **Invalid configuration**: Use default values (baseline: 100000, window: last_hour)

### Reviews

- **XSS attempts**: Sanitize all input, log suspicious submissions
- **Spam/profanity**: Reject submission with user-friendly error
- **Email delivery failure**: Retry up to 3 times, log failure for manual follow-up
- **Invalid rating**: Treat as null, allow submission without rating

### General

- **Admin-store write conflicts**: Use atomic write operations with retry logic
- **Missing required data**: Return 404 with clear error message
- **Authentication failures**: Return 401, redirect to login
- **Authorization failures**: Return 403 with explanation

## Testing Strategy

### Unit Testing

**Focus Areas**:
- Flash sale discount calculation functions
- Countdown timer formatting logic
- Subscription next order date calculation
- Review input sanitization
- Live counter calculation logic
- Date/time comparison utilities

**Testing Library**: Jest + React Testing Library

**Key Test Cases**:
- Boundary conditions (discount edges, date boundaries)
- Error cases (invalid inputs, edge states)
- Format verification (countdown display, price formatting)
- Component rendering (correct props produce expected output)

### Property-Based Testing

**Library**: fast-check (JavaScript/TypeScript property-based testing)

**Configuration**: Minimum 100 iterations per property test

**Property Tests** (mapped to Correctness Properties):

1. **Property 1**: Flash Sale Input Validation
   ```typescript
   // Feature: marketing-conversion-features, Property 1
   fc.assert(fc.property(
     fc.record({
       title: fc.oneof(fc.constant(''), fc.constant('  '), fc.string()),
       discount: fc.integer(),
       startTime: fc.date(),
       endTime: fc.date(),
       serviceIds: fc.array(fc.string())
     }),
     (input) => {
       const result = validateFlashSaleInput(input);
       // Verify validation logic
     }
   ), { numRuns: 100 });
   ```

2. **Property 7**: Flash Sale Discount Calculation
   ```typescript
   // Feature: marketing-conversion-features, Property 7
   fc.assert(fc.property(
     fc.float({ min: 0.01, max: 10000 }),
     fc.integer({ min: 1, max: 99 }),
     (price, discount) => {
       const result = applyFlashSaleDiscount(price, discount);
       const expected = Number((price * (1 - discount / 100)).toFixed(2));
       expect(result).toBe(expected);
     }
   ), { numRuns: 100 });
   ```

3. **Property 11**: Subscription Next Order Date Calculation
   ```typescript
   // Feature: marketing-conversion-features, Property 11
   fc.assert(fc.property(
     fc.date(),
     fc.constantFrom('weekly', 'bi-weekly', 'monthly'),
     (startDate, frequency) => {
       const next = calculateNextOrderDate(frequency, startDate);
       const diff = new Date(next).getTime() - startDate.getTime();
       const expectedDays = frequency === 'weekly' ? 7 : frequency === 'bi-weekly' ? 14 : 30;
       const expectedDiff = expectedDays * 24 * 60 * 60 * 1000;
       expect(diff).toBe(expectedDiff);
     }
   ), { numRuns: 100 });
   ```

4. **Property 15**: Live Counter Calculation
   ```typescript
   // Feature: marketing-conversion-features, Property 15
   fc.assert(fc.property(
     fc.integer({ min: 0, max: 1000000 }),
     fc.array(fc.record({
       quantity: fc.integer({ min: 1, max: 10000 }),
       status: fc.constantFrom('paid', 'completed', 'processing', 'refunded'),
       created_at: fc.date()
     })),
     fc.constantFrom('last_hour', 'last_24_hours'),
     (baseline, orders, timeWindow) => {
       const result = calculateLiveCounter(baseline, orders, timeWindow);
       // Verify calculation logic
     }
   ), { numRuns: 100 });
   ```

5. **Property 16**: Review Sanitization
   ```typescript
   // Feature: marketing-conversion-features, Property 16
   fc.assert(fc.property(
     fc.string(),
     (reviewText) => {
       const sanitized = sanitizeReviewText(reviewText);
       // Verify no HTML tags remain
       expect(sanitized).not.toMatch(/<[^>]*>/);
       // Verify length constraint
       expect(sanitized.length).toBeLessThanOrEqual(1000);
     }
   ), { numRuns: 100 });
   ```

### Integration Testing

**Focus Areas**:
- API endpoint behavior
- Database operations (Supabase integration)
- Admin-store read/write operations
- Email notification delivery
- Background job execution (subscription processor)
- Authentication/authorization flows

**Test Environment**: Test database with isolated data

**Key Integration Tests**:
- Flash sale creation → storage → retrieval → display
- Subscription creation → processing → order creation → wallet debit
- Review submission → admin approval → public display
- Live counter API → database query → calculation → response

### End-to-End Testing

**Focus Areas**:
- Complete user flows from UI to database
- Multi-step processes (subscription lifecycle)
- Admin workflows (flash sale management, review approval)

**Tools**: Playwright or Cypress

**Key E2E Scenarios**:
1. Admin creates flash sale → User sees banner → User purchases with discount
2. User creates subscription → Background job processes → Order created → Email sent
3. User submits review → Admin approves → Review appears on testimonials page
4. User makes purchase → Live counter increments → Counter displays updated value

### Performance Testing

**Focus Areas**:
- Live counter API response time
- Countdown timer re-render performance
- Subscription batch processing time
- Admin-store write performance under load

**Targets**:
- Live counter API: < 200ms response time
- Countdown timer: 60fps (< 16ms per update)
- Subscription processor: Process 1000 subscriptions in < 5 minutes
- Admin-store writes: < 100ms per write operation

## UI/UX Specifications

### Flash Sale Styling

**Design Principles**:
- High visual contrast to grab attention
- Clear countdown display for urgency
- Non-intrusive but prominent placement

**Color Palette**:
```css
/* Active flash sale */
--flash-sale-gradient: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
--flash-sale-text: #ffffff;
--flash-sale-border: #dc2626;

/* Urgent countdown (< 1 hour) */
--countdown-urgent: #dc2626;
--countdown-urgent-bg: #fef2f2;

/* Normal countdown */
--countdown-normal: #f97316;
--countdown-normal-bg: #fff7ed;
```

**Typography**:
- Flash sale title: 24px bold
- Discount percentage: 32px bold
- Countdown timer: 28px monospace bold

**Animations**:
```css
@keyframes pulse-urgent {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.05); }
}

.countdown-urgent {
  animation: pulse-urgent 1s ease-in-out infinite;
}
```

### Subscription Dashboard Widget

**Layout**:
```
┌─────────────────────────────────────┐
│ 🔄 Active Subscriptions             │
│                                     │
│ 3 active subscriptions              │
│ Next order: Jan 15, 2024            │
│ Monthly total: $147.50              │
│                                     │
│ [Manage Subscriptions →]           │
└─────────────────────────────────────┘
```

**Styling**:
- Card with light border and shadow
- Icon for visual identification
- Clear action button
- Compact, scannable layout

### Live Order Counter

**Placement**: Below hero section on homepage

**Layout**:
```
┌─────────────────────────────────────────────┐
│  🔥 127,543 followers purchased             │
│     in the last hour                        │
└─────────────────────────────────────────────┘
```

**Animation on Update**:
```css
@keyframes counter-increase {
  0% { transform: scale(1); color: inherit; }
  50% { transform: scale(1.15); color: #10b981; }
  100% { transform: scale(1); color: inherit; }
}
```

**Number Formatting**:
- Use Intl.NumberFormat for locale-aware formatting
- Add commas for thousands (US locale)
- Consider "K" suffix for thousands (e.g., "127.5K") if > 1000

### Review Display

**Card Layout**:
```
┌─────────────────────────────────────┐
│ ⭐⭐⭐⭐⭐                          │
│                                     │
│ "Excellent service! Fast delivery   │
│  and great results."                │
│                                     │
│ - John D. | Jan 10, 2024           │
└─────────────────────────────────────┘
```

**Star Rating Visualization**:
- Filled stars for rating value
- Empty stars for remaining
- Consider half-stars for decimal ratings (if implemented)

### Responsive Design

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations**:
- Flash sale banner: Stack elements vertically, reduce font sizes
- Subscription widget: Full width, simplified layout
- Live counter: Smaller font, abbreviated time window label
- Review cards: Full width, maintain padding

## Email Notification Templates

### Subscription Pre-Order Notification

**Subject**: Your subscription order is scheduled for tomorrow

**Body**:
```
Hi [Name],

Your subscription for [Service Name] is scheduled to be processed tomorrow.

Order Details:
- Service: [Service Name]
- Quantity: [Quantity]
- Amount: $[Amount] (15% subscription discount applied)
- Scheduled: [Date & Time]

Your wallet balance: $[Balance]

Need to make changes?
- Pause this subscription: [Pause Link]
- Modify quantity: [Modify Link]
- Cancel subscription: [Cancel Link]

Questions? Reply to this email or contact support.

Best regards,
cheapfollower.shop Team
```

### Subscription Payment Failure

**Subject**: Action Required: Subscription payment failed

**Body**:
```
Hi [Name],

We were unable to process your subscription order for [Service Name] due to insufficient wallet balance.

Required: $[Amount]
Your balance: $[Balance]
Shortfall: $[Shortfall]

Your subscription has been paused. To resume:
1. Add funds to your wallet: [Add Funds Link]
2. Resume your subscription: [Resume Link]

Or you can modify or cancel this subscription at any time.

Need help? Contact our support team.

Best regards,
cheapfollower.shop Team
```

### Subscription Order Confirmation

**Subject**: Your subscription order has been processed

**Body**:
```
Hi [Name],

Your subscription order has been successfully processed!

Order Details:
- Service: [Service Name]
- Quantity: [Quantity]
- Amount: $[Amount]
- Order ID: [Order ID]

Next order scheduled: [Next Date]
Remaining balance: $[Balance]

Track your order: [Track Link]
Manage subscription: [Manage Link]

Thank you for being a valued subscriber!

Best regards,
cheapfollower.shop Team
```

### Review Submission Confirmation

**Subject**: Thank you for your review!

**Body**:
```
Hi [Name],

Thank you for submitting your review! We appreciate you taking the time to share your experience.

Your review is currently pending approval and will be published on our testimonials page shortly.

Your Review:
"[Review Text]"

We value your feedback and use it to continuously improve our services.

Best regards,
cheapfollower.shop Team
```

### Admin Review Notification

**Subject**: New review submitted - Approval needed

**Body**:
```
A new customer review has been submitted and is pending approval.

Reviewer: [Name]
Rating: [Rating] stars
Review: "[Review Text]"
Submitted: [Date & Time]

Review this submission: [Admin Link]

Approve or reject from the admin panel.
```

---

This design document provides a comprehensive blueprint for implementing the four marketing and conversion features. The architecture integrates seamlessly with existing systems, the data models support all requirements, and the implementation details provide clear guidance for development. The property-based testing strategy ensures robust validation of business logic, while the UI/UX specifications create an engaging and conversion-optimized user experience.
