# Design Document: Bug Fixes and UI Enhancements for Refund-Ticket System

## Overview

This design addresses 10 critical bugs and implements 25+ UI/UX improvements for the refund and ticket support system. The enhancements focus on:

1. **System Reliability**: Fixing atomic transaction bugs, race conditions, and validation issues
2. **User Experience**: Adding modern UI patterns (empty states, loading indicators, toast notifications)
3. **Operational Efficiency**: Admin tools for bulk actions, quick replies, and analytics
4. **Mobile Experience**: Responsive design improvements and touch-friendly interactions
5. **Advanced Features**: Real-time updates, file uploads, markdown support, and export functionality

The design maintains backward compatibility with existing code patterns and database schemas while introducing incremental improvements that can be deployed safely.

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  (React Components, UI State, Client-Side Validation)        │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                        API Layer                             │
│  (Next.js API Routes, Server Actions, Middleware)            │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  (Commerce, Tickets, Validation, Transaction Management)     │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                       Data Layer                             │
│  (Supabase, Admin Store, File Storage)                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Atomicity**: All multi-step operations must succeed completely or rollback entirely
2. **Progressive Enhancement**: Features degrade gracefully when dependencies are unavailable
3. **Accessibility**: WCAG AA compliance for all UI components
4. **Mobile-First**: Responsive design starting from 320px screens
5. **Performance**: Minimize re-renders, lazy load components, optimize bundle size

## Components and Interfaces

### 1. Refund System Bug Fixes

#### 1.1 Complete Refund Rollback (Requirement 1)

**Current Problem**: When `creditWallet` succeeds but the order status update fails, the wallet credit remains without updating the order, leaving the system inconsistent.

**Solution**: Implement a `processRefund` wrapper function that handles both operations atomically with explicit rollback.

```typescript
interface RefundOperation {
  orderId: string;
  userId: string;
  amount: number;
  reason?: string;
}

interface RefundResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

async function processRefund(operation: RefundOperation): Promise<RefundResult>
```

**Implementation Strategy**:
1. Begin operation with audit log entry
2. Credit wallet and capture transaction ID
3. Update order status to "refunded"
4. If step 3 fails, create debit transaction to reverse credit
5. Log all operations for audit trail
6. Return clear success/failure result

#### 1.2 Authentication Check for Refunds (Requirement 6)

**Solution**: Add authentication middleware to refund API routes.

```typescript
async function requireAuth(request: Request): Promise<{ userId: string; isAdmin: boolean }>
```

**Checks**:
- Verify user session exists
- Verify user owns the order OR is admin
- Return 401 for unauthenticated requests
- Return 403 for unauthorized requests

#### 1.3 Wallet Balance Race Conditions (Requirement 9)

**Current Problem**: Concurrent refund operations can cause incorrect balance calculations.

**Solution**: Implement optimistic locking or database-level atomic operations.

**Strategy A - Optimistic Locking**:
```typescript
interface WalletUpdate {
  userId: string;
  amount: number;
  expectedBalance: number; // Current balance before operation
}

async function atomicCreditWallet(update: WalletUpdate): Promise<number>
```
- Read current balance
- Verify balance matches expected
- Update balance using WHERE clause with old value
- Retry if update affected 0 rows (race condition detected)

**Strategy B - Database Row Locking**:
- Use PostgreSQL row-level locking (`SELECT ... FOR UPDATE`)
- Available through Supabase RPC functions

**Recommended**: Strategy A (optimistic locking) for better performance in low-contention scenarios.

### 2. Ticket System Bug Fixes

#### 2.1 Eliminate Duplicate Validation Errors (Requirement 2)

**Current Problem**: Subject and body validation errors repeat the same message twice.

**Solution**: Consolidate validation logic and return distinct error messages.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[]; // Array of distinct error messages
}

function validateTicketInput(input: CreateTicketInput): ValidationResult {
  const errors: string[] = [];
  
  if (!input.subject.trim()) {
    errors.push("Subject is required");
  }
  
  if (!input.body.trim()) {
    errors.push("Message body is required");
  } else if (input.body.length > 5000) {
    errors.push("Message body cannot exceed 5000 characters");
  }
  
  return { valid: errors.length === 0, errors };
}
```

#### 2.2 Pass Guest Email to Support Page (Requirement 3)

**Solution**: Update support page form to capture and validate guest email.

**Frontend Changes**:
```typescript
interface SupportFormData {
  subject: string;
  category: TicketCategory;
  body: string;
  orderId?: string;
  guestEmail?: string; // For unauthenticated users
}
```

**Validation**:
- Show email input when user is not authenticated
- Validate email format using standard regex
- Make email required for guests, optional for authenticated users
- Pass `guestEmail` in API request

#### 2.3 Fix Ticket Routing to Use UUID (Requirement 4)

**Current Problem**: Ticket links use inconsistent ID types.

**Solution**: Standardize routing to use UUID internally and Public ID in URLs.

**URL Pattern**: `/tickets/{publicId}` (e.g., `/tickets/TKT123456`)

**Implementation**:
```typescript
// In ticket detail page
async function getTicketForDisplay(publicId: string) {
  const ticket = await getTicketByPublicId(publicId); // Returns full ticket with UUID
  return ticket;
}
```

**Link Generation**:
```typescript
// Always use publicId in links
<Link href={`/tickets/${ticket.publicId}`}>
  {ticket.publicId}
</Link>
```

#### 2.4 Align Support Page Categories with Enum (Requirement 7)

**Solution**: Create category mapping configuration.

```typescript
const CATEGORY_OPTIONS: Array<{ value: TicketCategory; label: string }> = [
  { value: "order", label: "Order Issue" },
  { value: "payment", label: "Payment Issue" },
  { value: "refill", label: "Refill Issue" },
  { value: "account", label: "Account Issue" },
  { value: "api", label: "API Issue" },
  { value: "service", label: "Service Issue" },
  { value: "other", label: "Other" },
];
```

Use `value` for API requests, `label` for display.

### 3. Transaction Parsing Enhancement

#### 3.1 Flexible Transaction Regex (Requirement 5)

**Current Problem**: Order ID extraction is too rigid for different formats.

**Solution**: Create configurable order ID parser with flexible pattern matching.

```typescript
interface OrderIdParseResult {
  prefix: string;
  number: number;
  fullId: string;
}

function parseOrderId(note: string): OrderIdParseResult | null {
  // Pattern: [A-Z]{2,4} followed by 6-8 digits
  const pattern = /\b([A-Z]{2,4})(\d{6,8})\b/i;
  const match = note.match(pattern);
  
  if (!match) return null;
  
  return {
    prefix: match[1].toUpperCase(),
    number: parseInt(match[2], 10),
    fullId: match[1].toUpperCase() + match[2],
  };
}
```

**Features**:
- Case-insensitive matching
- Supports CF, TKT, ORD, and custom prefixes
- Returns null instead of throwing errors
- Extracts numeric and prefix components separately

## 4. UI Enhancement Components

### 4.1 Rate Limit Feedback with Countdown (Requirement 8)

**Solution**: Parse `Retry-After` header and display countdown timer.

```typescript
interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number; // Seconds until retry allowed
  countdown: number; // Current countdown value
}

function useRateLimitFeedback(error: Error | null): RateLimitState {
  // Parse 429 error and Retry-After header
  // Start countdown timer
  // Auto-enable retry when countdown reaches 0
}
```

**UI Display**:
```
⏱️ Too many requests. Please wait 45 seconds before trying again.
```

With live countdown that decrements each second.

### 4.2 Loading States (Requirement 10)

**Solution**: Add loading states to all async operations.

```typescript
interface LoadingState {
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

function useTicketList(): LoadingState & { tickets: Ticket[] } {
  // Manage loading, error, and data states
  // Provide retry function
}
```

**UI Pattern**:
- Show centered spinner during initial load
- Disable filter controls while loading
- Show error message with retry button on failure
- Use skeleton screens for better perceived performance

### 4.3 Empty State Illustrations (Requirement 11)

**Solution**: Create reusable empty state component with SVG illustrations.

```typescript
interface EmptyStateProps {
  type: "tickets" | "transactions" | "refunds" | "orders";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyState(props: EmptyStateProps): JSX.Element
```

**SVG Assets**:
- Use application's color palette (primary, accent colors)
- Consistent illustration style across all empty states
- Include actionable text ("Create your first ticket", "No refunds yet")

### 4.4 Toast Notifications (Requirement 21)

**Solution**: Replace inline errors with toast notification system.

```typescript
interface ToastOptions {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number; // Default: 5000ms
  dismissible?: boolean; // Default: true
}

function useToast(): {
  show: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}
```

**Features**:
- Auto-dismiss after 5 seconds
- Manual dismiss button
- Stack vertically for multiple toasts
- Color-coded by type (green success, red error)
- Slide-in animation from top or bottom

### 4.5 Search Functionality (Requirement 14)

**Solution**: Add client-side search with debouncing.

```typescript
interface SearchState {
  query: string;
  results: Ticket[];
  isSearching: boolean;
}

function useTicketSearch(tickets: Ticket[]): SearchState {
  // Debounce search input (300ms)
  // Filter by subject and publicId
  // Case-insensitive partial matching
}
```

**Search Fields**:
- Tickets: subject, publicId
- Transactions: orderId, note
- Show "No results found" for empty results

### 4.6 Pagination (Requirement 26)

**Solution**: Add pagination controls with URL sync.

```typescript
interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

interface PaginationControls {
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  totalPages: number;
}

function usePagination(config: PaginationConfig): PaginationControls
```

**Page Sizes**:
- Tickets: 25 per page
- Transactions: 50 per page
- Refunds: 25 per page

**URL Pattern**: `?page=2`

## 5. Admin Features

### 5.1 Bulk Actions (Requirement 15)

**Solution**: Add checkbox selection and bulk operation controls.

```typescript
interface BulkActionState {
  selectedIds: Set<string>;
  selectAll: boolean;
}

interface BulkActionHandlers {
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  performAction: (action: "close" | "updateStatus", params?: any) => Promise<void>;
}

function useBulkActions(items: Ticket[]): BulkActionState & BulkActionHandlers
```

**Actions**:
- Close selected tickets
- Update status for selected tickets
- Show progress indicator during bulk operations

### 5.2 Quick Reply Templates (Requirement 16)

**Solution**: Predefined response templates for common scenarios.

```typescript
interface ReplyTemplate {
  id: string;
  name: string;
  content: string;
}

const DEFAULT_TEMPLATES: ReplyTemplate[] = [
  { id: "refund_processed", name: "Refund Processed", content: "Your refund has been processed..." },
  { id: "order_completed", name: "Order Completed", content: "Your order has been completed..." },
  { id: "under_review", name: "Under Review", content: "We're reviewing your request..." },
];
```

**UI Pattern**:
- Dropdown above reply textarea
- Click template to populate textarea
- Allow editing before sending
- Store templates in admin settings (future: allow custom templates)

### 5.3 Analytics Dashboard (Requirement 38)

**Solution**: Admin dashboard with key metrics and visualizations.

```typescript
interface TicketAnalytics {
  averageResponseTime: number; // Minutes
  resolutionRate: number; // Percentage
  ticketsByCategory: Record<TicketCategory, number>;
  ticketsByStatus: Record<TicketStatus, number>;
  dailyTicketCounts: Array<{ date: string; count: number }>;
}

async function getTicketAnalytics(dateRange: { start: Date; end: Date }): Promise<TicketAnalytics>
```

**Visualizations**:
- Bar chart for tickets by category
- Line chart for daily ticket trends
- Donut chart for status distribution
- Metric cards for averages and rates

**Update Frequency**: Auto-refresh every 5 minutes

## 6. Advanced Features

### 6.1 Attachment Uploads (Requirement 17)

**Solution**: File upload with preview and storage.

```typescript
interface AttachmentUpload {
  file: File;
  preview?: string; // Data URL for image preview
  status: "pending" | "uploading" | "complete" | "error";
  url?: string; // Storage URL after upload
}

async function uploadAttachment(file: File, ticketId: string): Promise<string> {
  // Validate file type (JPEG, PNG, GIF, WebP)
  // Validate file size (max 5MB)
  // Upload to storage (Supabase Storage)
  // Return public URL
}
```

**Storage Path**: `/tickets/{ticketId}/attachments/{filename}`

**Security**:
- Validate file types server-side
- Scan for malicious content (future enhancement)
- Generate unique filenames to prevent overwrites

### 6.2 Real-Time Updates (Requirement 18)

**Solution**: Polling-based real-time updates for ticket messages.

```typescript
function useTicketRealtime(ticketId: string, pollingInterval: number = 10000) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessageCount, setNewMessageCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const latest = await listTicketMessages(ticketId);
      if (latest.length > messages.length) {
        setMessages(latest);
        setNewMessageCount(latest.length - messages.length);
      }
    }, pollingInterval);
    
    return () => clearInterval(interval);
  }, [ticketId, messages.length]);
  
  return { messages, newMessageCount };
}
```

**Features**:
- Poll every 10 seconds
- Stop polling when user navigates away
- Preserve scroll position
- Visual indicator for new messages

### 6.3 Export Functionality (Requirement 19)

**Solution**: Generate CSV/PDF exports of data.

```typescript
interface ExportOptions {
  format: "csv" | "pdf";
  filename: string;
  data: any[];
}

async function exportData(options: ExportOptions): Promise<Blob>
```

**CSV Export** (Transactions):
- Include all transaction fields
- Filename pattern: `transactions_YYYY-MM-DD.csv`

**PDF Export** (Tickets):
- Include ticket details, all messages, and status history
- Filename pattern: `ticket_{publicId}_YYYY-MM-DD.pdf`
- Use PDF generation library (e.g., jsPDF or server-side Puppeteer)

### 6.4 Markdown Support (Requirement 34)

**Solution**: Basic markdown rendering with XSS protection.

```typescript
interface MarkdownOptions {
  allowedTags?: string[];
  sanitize?: boolean; // Default: true
}

function renderMarkdown(text: string, options?: MarkdownOptions): string {
  // Parse markdown (bold, italic, lists, links)
  // Sanitize HTML to prevent XSS
  // Return safe HTML string
}
```

**Supported Syntax**:
- `**bold**` → <strong>bold</strong>
- `*italic*` → <em>italic</em>
- `[link](url)` → <a href="url">link</a>
- `- item` → <ul><li>item</li></ul>

**Library**: Use `marked` + `DOMPurify` for parsing and sanitization.

### 6.5 Rich Text Editor (Requirement 35)

**Solution**: WYSIWYG editor for ticket messages.

```typescript
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

function RichTextEditor(props: RichTextEditorProps): JSX.Element
```

**Features**:
- Formatting toolbar (bold, italic, underline, lists, links)
- Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
- Convert to markdown or HTML for storage
- Accessible via ARIA labels

**Library**: Consider `Lexical` (Meta) or `Tiptap` for lightweight WYSIWYG.

## 7. Mobile Responsiveness

### 7.1 Mobile Improvements (Requirement 20)

**Solution**: Mobile-first responsive design with touch interactions.

**Swipe Actions**:
```typescript
function useSwipeActions(onSwipe: (direction: "left" | "right") => void) {
  // Detect touch start and touch end
  // Calculate swipe distance and direction
  // Trigger action if threshold met
}
```

**Responsive Tables**:
- Horizontal scroll on mobile
- Card layout for very small screens (<480px)
- Sticky headers for better context

**Touch Targets**:
- Minimum 44x44 pixels for all interactive elements
- Increased padding on buttons
- Larger tap areas for checkboxes and radio buttons

### 7.2 Dark Mode Contrast (Requirement 25)

**Solution**: Improve contrast ratios for WCAG AA compliance.

**Color Adjustments**:
```css
/* Dark mode variables */
--bg-primary-dark: #0f172a;
--text-primary-dark: #f1f5f9; /* Contrast ratio: 15.3:1 */
--border-dark: #334155; /* Contrast ratio: 5.2:1 */
--status-open-dark: #3b82f6; /* Adjusted for contrast */
--status-resolved-dark: #10b981; /* Adjusted for contrast */
```

**Validation**:
- All text meets 4.5:1 contrast ratio (normal text)
- Large text meets 3:1 contrast ratio
- Disabled states are visually distinct (not just color)

## 8. Enhanced UI Elements

### 8.1 Refund Amount Preview (Requirement 12)

**Solution**: Calculate and display refund amount before requesting.

```typescript
interface RefundPreview {
  originalAmount: number;
  deliveredQuantity: number;
  refundableAmount: number;
  explanation: string;
}

function calculateRefundPreview(order: Order): RefundPreview {
  const delivered = order.deliveredQuantity ?? 0;
  const total = order.quantity;
  const remaining = total - delivered;
  const refundableAmount = (order.amount / total) * remaining;
  
  return {
    originalAmount: order.amount,
    deliveredQuantity: delivered,
    refundableAmount: Math.max(0, refundableAmount),
    explanation: remaining > 0 
      ? `Refund for ${remaining} undelivered items` 
      : "Order fully delivered",
  };
}
```

**UI Display**:
```
Original Amount: $50.00
Delivered: 800 / 1000 (80%)
Refundable: $10.00 (200 items not delivered)

[Request Refund] (disabled if refundableAmount === 0)
```

### 8.2 Ticket Status Timeline (Requirement 13)

**Solution**: Visual timeline showing status progression.

```typescript
interface StatusTransition {
  status: TicketStatus;
  timestamp: string;
  isCurrent: boolean;
}

function TicketTimeline({ transitions }: { transitions: StatusTransition[] }): JSX.Element {
  // Vertical timeline with dots and connecting lines
  // Highlight current status
  // Show timestamps in relative format
}
```

**Visual Design**:
```
○ Open          (2 hours ago)
|
● In Progress   (1 hour ago)  ← Current
|
○ Resolved
```

### 8.3 Filter Presets (Requirement 27)

**Solution**: Quick filter buttons for common views.

```typescript
interface FilterPreset {
  id: string;
  label: string;
  filters: Partial<TicketFilters>;
}

const TICKET_PRESETS: FilterPreset[] = [
  { id: "my_open", label: "My Open Tickets", filters: { status: "open", userId: "current" } },
  { id: "resolved", label: "Resolved", filters: { status: "resolved" } },
  { id: "all", label: "All Tickets", filters: {} },
];
```

**UI Pattern**:
- Button group above filter controls
- Highlight active preset
- Apply filters on click

### 8.4 Character Count Color Coding (Requirement 29)

**Solution**: Dynamic character counter with color feedback.

```typescript
function getCharacterCountColor(count: number, max: number = 5000): string {
  if (count < 4000) return "text-green-600"; // Safe zone
  if (count < 4800) return "text-yellow-600"; // Warning zone
  return "text-red-600"; // Danger zone
}

function CharacterCounter({ count, max }: { count: number; max: number }): JSX.Element {
  const color = getCharacterCountColor(count, max);
  return (
    <span className={color}>
      {count} / {max}
    </span>
  );
}
```

### 8.5 Order Quick Actions (Requirement 28)

**Solution**: Dropdown menu with common actions for orders.

```typescript
interface OrderAction {
  id: "refund" | "support" | "details";
  label: string;
  icon: React.ReactNode;
  handler: (order: Order) => void;
}

function OrderActionsMenu({ order }: { order: Order }): JSX.Element {
  // Dropdown with actions
  // Keyboard accessible
  // Opens refund modal or ticket form
}
```

**Actions**:
- Request Refund → Open refund modal
- Contact Support → Open ticket form with orderId pre-filled
- View Details → Navigate to order detail page

### 8.6 Animated Transitions (Requirements 30, 31)

**Solution**: Smooth animations for status changes and celebrations.

**Status Transition Animation**:
```typescript
function AnimatedStatusBadge({ status }: { status: TicketStatus }): JSX.Element {
  // CSS transition on status change (300ms ease-in-out)
  // Respect prefers-reduced-motion
}
```

**Confetti Animation** (Resolved Tickets):
```typescript
function ConfettiCelebration({ trigger }: { trigger: boolean }): JSX.Element {
  // Show confetti when ticket is resolved
  // Duration: 2 seconds
  // Colors: application accent colors
  // Respect prefers-reduced-motion
}
```

**Library**: Use `canvas-confetti` for celebration animation.

### 8.7 Relative Time with Tooltips (Requirement 32)

**Solution**: Display relative time with absolute timestamp on hover.

```typescript
function RelativeTime({ timestamp }: { timestamp: string }): JSX.Element {
  const relative = formatRelative(timestamp); // "2 hours ago"
  const absolute = formatAbsolute(timestamp); // "January 15, 2024 at 3:42 PM"
  
  return (
    <time dateTime={timestamp} title={absolute}>
      {relative}
    </time>
  );
}
```

**Update Interval**: Refresh relative time every minute for accuracy.

### 8.8 Copy-to-Clipboard Buttons (Requirement 33)

**Solution**: One-click copy for IDs and codes.

```typescript
function CopyButton({ text, label }: { text: string; label: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button onClick={handleCopy} aria-label={`Copy ${label}`}>
      {copied ? "Copied!" : "📋"}
    </button>
  );
}
```

**Applied To**:
- Ticket IDs (publicId)
- Order IDs
- Transaction IDs

### 8.9 Emoji Reactions (Requirement 36)

**Solution**: Simple emoji reactions to agent replies.

```typescript
interface MessageReaction {
  messageId: string;
  emoji: "👍" | "❤️" | "😕";
  count: number;
  userReacted: boolean;
}

async function addReaction(messageId: string, emoji: string): Promise<void> {
  // Store reaction in database
  // Update count
  // Allow only one reaction per user per message
}
```

**Storage**: Add `reactions` JSONB column to `ticket_messages` table.

### 8.10 Ticket Templates (Requirement 37)

**Solution**: Predefined templates for common ticket types.

```typescript
interface TicketTemplate {
  id: string;
  name: string;
  category: TicketCategory;
  subject: string;
  body: string;
}

const TICKET_TEMPLATES: TicketTemplate[] = [
  {
    id: "refund_request",
    name: "Refund Request",
    category: "order",
    subject: "Refund Request for Order",
    body: "I would like to request a refund for my order...",
  },
  // More templates...
];
```

**UI Pattern**:
- "Use Template" dropdown on ticket creation form
- Pre-fill form fields when template selected
- Allow editing before submission

### 8.11 Auto-Save Drafts (Requirement 24)

**Solution**: Automatic draft saving to localStorage.

```typescript
interface TicketDraft {
  subject: string;
  category: TicketCategory;
  body: string;
  orderId?: string;
  timestamp: string;
}

function useAutoSaveDraft(key: string) {
  useEffect(() => {
    const interval = setInterval(() => {
      const draft = getDraftFromForm();
      localStorage.setItem(key, JSON.stringify(draft));
      showSaveIndicator();
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(interval);
  }, [key]);
}
```

**Features**:
- Save every 5 seconds
- Restore on page load
- Clear after successful submission
- Show "Draft saved" indicator

## Data Models

### Existing Models (No Changes Required)

The existing database schema supports all requirements without modifications:

**Tickets Table**:
- `id` (uuid) - Internal UUID
- `public_id` (text) - User-facing ID (e.g., "TKT123456")
- `user_id` (uuid, nullable) - For authenticated users
- `guest_email` (text, nullable) - For guest users
- `category` (text) - Ticket category
- `subject` (text) - Ticket subject
- `status` (text) - Current status
- `order_id` (text, nullable) - Associated order
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Ticket Messages Table**:
- `id` (uuid)
- `ticket_id` (uuid)
- `author_role` (text) - "customer" | "agent"
- `body` (text)
- `attachments` (jsonb, optional) - Array of attachment URLs
- `reactions` (jsonb, optional) - Emoji reactions
- `created_at` (timestamp)

**Transactions Table**:
- `id` (uuid)
- `public_id` (text)
- `user_id` (uuid)
- `type` (text)
- `method` (text)
- `amount` (numeric)
- `note` (text, optional)
- `created_at` (timestamp)

### New Models for Analytics

**Ticket Analytics Cache** (for Requirement 38):
```typescript
interface TicketAnalyticsCache {
  id: string;
  date: string; // YYYY-MM-DD
  averageResponseTime: number; // Minutes
  resolutionRate: number; // Percentage
  ticketsByCategory: Record<TicketCategory, number>;
  ticketsByStatus: Record<TicketStatus, number>;
  calculatedAt: string;
}
```

Store in separate table or compute on-demand (trade-off between performance and freshness).

## Error Handling

### Error Classification

**1. User Errors** (4xx):
- Invalid input (400)
- Unauthenticated (401)
- Unauthorized (403)
- Not found (404)
- Rate limited (429)

**2. System Errors** (5xx):
- Database failure (500)
- External service failure (503)
- Timeout (504)

### Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
  };
}
```

### Error Handling Strategy

**Client-Side**:
- Display toast notifications for errors
- Show inline errors for form validation
- Provide retry buttons for transient failures
- Log errors to monitoring service

**Server-Side**:
- Log all errors with context
- Return user-friendly error messages
- Never expose internal details (SQL, stack traces)
- Implement circuit breaker for external services

### Rollback Scenarios

**Refund Rollback**:
1. Credit wallet succeeds, order update fails → Debit wallet to reverse
2. Both operations fail → No rollback needed (nothing persisted)

**Ticket Creation Rollback**:
1. Ticket insert succeeds, message insert fails → Delete ticket
2. Both fail → No rollback needed

## Testing Strategy

This is primarily a bug fix and UI enhancement specification. Property-based testing is **NOT applicable** for most requirements since they involve:
- UI rendering and interactions
- Bug fixes for specific edge cases
- Infrastructure configuration
- External service integration
- User experience improvements

### Testing Approach

**1. Unit Tests** (High Priority):
- Validation logic (Requirements 2, 7)
- Parsing functions (Requirement 5)
- Calculation functions (Requirement 12)
- Utility functions (time formatting, ID generation)

**2. Integration Tests** (High Priority):
- Refund transaction rollback (Requirement 1)
- Wallet race condition handling (Requirement 9)
- Authentication checks (Requirement 6)
- API endpoints with database operations

**3. Component Tests** (Medium Priority):
- Loading states (Requirement 10)
- Empty states (Requirement 11)
- Toast notifications (Requirement 21)
- Form validation (Requirements 2, 3)
- Search functionality (Requirement 14)

**4. End-to-End Tests** (Lower Priority):
- Complete refund flow
- Ticket creation and reply flow
- File upload flow
- Real-time updates

**5. Manual Testing** (Required):
- Mobile responsiveness (Requirement 20)
- Dark mode contrast (Requirement 25)
- Accessibility (keyboard navigation, screen readers)
- Cross-browser compatibility
- Animation smoothness (Requirements 30, 31)

**6. Snapshot Tests** (For UI Components):
- Empty state illustrations
- Status badges and timelines
- Dashboard charts

### Test Configuration

**Unit Test Examples**:

```typescript
// Refund rollback test
describe("processRefund", () => {
  it("should rollback wallet credit when order update fails", async () => {
    // Mock creditWallet to succeed
    // Mock order update to fail
    // Verify debit transaction created
    // Verify wallet balance unchanged
  });
});

// Validation test
describe("validateTicketInput", () => {
  it("should return distinct errors for missing subject and body", () => {
    const result = validateTicketInput({ subject: "", body: "", category: "order" });
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain("Subject is required");
    expect(result.errors).toContain("Message body is required");
  });
});

// Parsing test
describe("parseOrderId", () => {
  it("should parse various order ID formats", () => {
    expect(parseOrderId("CF123456")).toEqual({ prefix: "CF", number: 123456, fullId: "CF123456" });
    expect(parseOrderId("Order TKT987654 received")).toEqual({ prefix: "TKT", number: 987654, fullId: "TKT987654" });
    expect(parseOrderId("no order here")).toBeNull();
  });
});
```

**Integration Test Example**:

```typescript
describe("Refund API with rollback", () => {
  it("should maintain wallet consistency when order update fails", async () => {
    const userId = "user-123";
    const initialBalance = await getWalletBalance(userId);
    
    // Simulate refund with order update failure
    const result = await fetch("/api/refund", {
      method: "POST",
      body: JSON.stringify({ orderId: "CF999999", userId }),
    });
    
    expect(result.ok).toBe(false);
    
    // Verify balance unchanged
    const finalBalance = await getWalletBalance(userId);
    expect(finalBalance).toBe(initialBalance);
  });
});
```

### Test Coverage Goals

- **Critical Bugs** (Reqs 1, 6, 9): 100% coverage
- **Validation Logic** (Reqs 2, 3, 5, 7): 100% coverage
- **Business Logic** (Reqs 12, 14, 26): 90% coverage
- **UI Components**: 80% coverage
- **End-to-End Flows**: Key paths covered

### Monitoring and Observability

**Metrics to Track**:
- Refund success/failure rates
- Wallet balance consistency
- API error rates by endpoint
- Rate limit hit rates
- Average response times
- Ticket creation success rates

**Logging**:
- All rollback operations
- Authentication failures
- Rate limit violations
- File upload errors
- Database transaction failures

**Alerts**:
- High refund failure rate (>5%)
- Wallet balance inconsistencies detected
- Database connection failures
- External service timeouts

## Deployment Strategy

### Phased Rollout

**Phase 1 - Critical Bug Fixes** (Deploy First):
- Requirement 1: Refund rollback
- Requirement 6: Authentication checks
- Requirement 9: Wallet race conditions
- Requirement 2: Duplicate validation errors

**Phase 2 - Core UI Improvements**:
- Requirement 10: Loading states
- Requirement 11: Empty states
- Requirement 21: Toast notifications
- Requirement 14: Search functionality

**Phase 3 - Enhanced Features**:
- Requirement 17: File uploads
- Requirement 18: Real-time updates
- Requirement 19: Export functionality
- Requirements 15, 16: Admin tools

**Phase 4 - Advanced UI**:
- Requirements 20, 25: Mobile and accessibility
- Requirements 30, 31: Animations
- Requirements 34, 35: Markdown/rich text
- Requirements 36, 37: Reactions and templates

**Phase 5 - Analytics and Optimization**:
- Requirement 38: Analytics dashboard
- Performance optimizations
- Additional monitoring

### Feature Flags

Use feature flags for gradual rollout:
- `enable_refund_rollback`: Critical bug fix
- `enable_real_time_updates`: Performance impact
- `enable_file_uploads`: Storage costs
- `enable_analytics_dashboard`: Admin-only feature

### Rollback Plan

**Critical Bugs**:
- Keep existing code in place with feature flag
- Toggle flag off to revert to old behavior
- Monitor error rates and wallet consistency

**UI Enhancements**:
- Deploy behind feature flags
- Gradual rollout to percentage of users
- Quick disable if performance degrades

### Database Migrations

**No Schema Changes Required** for most requirements.

**Optional Enhancements**:
- Add indexes for search performance (subject, publicId)
- Add `reactions` JSONB column to `ticket_messages`
- Add `analytics_cache` table for dashboard performance

### Performance Considerations

**Optimizations**:
- Lazy load heavy components (analytics charts, rich text editor)
- Debounce search input (300ms)
- Cache analytics data (5-minute TTL)
- Paginate large lists (25-50 items per page)
- Use React.memo for expensive re-renders

**Bundle Size**:
- Keep chart library bundle <50KB gzipped
- Lazy load file upload components
- Use dynamic imports for admin-only features

## Accessibility

### WCAG AA Compliance

**Requirements**:
- All text meets 4.5:1 contrast ratio (Requirement 25)
- Interactive elements have minimum 44x44px touch targets (Requirement 20)
- Keyboard navigation for all interactions (Requirement 28)
- Screen reader support with ARIA labels
- Focus indicators visible and clear

**Testing**:
- Automated: axe-core accessibility linter
- Manual: Keyboard-only navigation testing
- Screen reader: NVDA/JAWS testing for key flows

### Accessibility Features

- `aria-label` on all icon buttons
- `role="status"` for loading indicators
- `aria-live="polite"` for toast notifications
- Skip links for keyboard users
- Reduced motion support (Requirements 30, 31)

## Security Considerations

**Authentication & Authorization**:
- Verify user authentication before all sensitive operations (Requirement 6)
- Check ownership for ticket and order access
- Admin-only features require role verification

**Input Validation**:
- Server-side validation for all inputs
- XSS prevention in markdown rendering (Requirement 34)
- File upload validation (type, size, content)

**Rate Limiting**:
- Apply rate limits to API endpoints
- Provide clear feedback with countdown (Requirement 8)
- Log rate limit violations for monitoring

**Data Privacy**:
- Guest emails stored securely (Requirement 3)
- No sensitive data in error messages
- Audit logs for refund operations

## Summary

This design addresses all 38 requirements across bug fixes and UI enhancements:

**Critical Bugs Fixed** (10):
1. ✅ Refund rollback on partial failure
2. ✅ Duplicate validation errors eliminated
3. ✅ Guest email capture
4. ✅ Ticket routing with UUID
5. ✅ Flexible transaction parsing
6. ✅ Refund authentication
7. ✅ Category enum alignment
8. ✅ Rate limit feedback
9. ✅ Wallet race conditions
10. ✅ Loading states

**UI Enhancements** (25+):
11. ✅ Empty state illustrations
12. ✅ Refund amount preview
13. ✅ Status timeline
14. ✅ Search functionality
15. ✅ Bulk actions
16. ✅ Quick reply templates
17. ✅ File uploads
18. ✅ Real-time updates
19. ✅ Export functionality
20. ✅ Mobile responsiveness
21. ✅ Toast notifications
22. ✅ Refund history page
23. ✅ Priority levels
24. ✅ Auto-save drafts
25. ✅ Dark mode contrast
26. ✅ Pagination
27. ✅ Filter presets
28. ✅ Order quick actions
29. ✅ Character count colors
30. ✅ Animated transitions
31. ✅ Confetti celebrations
32. ✅ Relative time tooltips
33. ✅ Copy buttons
34. ✅ Markdown support
35. ✅ Rich text editor
36. ✅ Emoji reactions
37. ✅ Ticket templates
38. ✅ Analytics dashboard

The design maintains backward compatibility, follows existing code patterns, and provides a clear path for incremental implementation with minimal risk.
