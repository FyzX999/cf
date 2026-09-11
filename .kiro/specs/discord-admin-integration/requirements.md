# Requirements Document

## Introduction

This document specifies requirements for integrating a Discord bot with the CheapFollower.shop platform. The bot will provide complete administrative control over the website through Discord commands and interactive buttons, automate customer role assignment based on spending, and log all orders to a Discord channel for real-time management.

**Problem Statement:**
Currently, site administration requires logging into the web admin panel. This creates friction for quick order management, customer support, and monitoring sales activity. Customers also lack social proof and community features.

**Proposed Solution:**
Build a Discord bot that mirrors all admin panel functionality, posts live order feeds with interactive management buttons, automatically assigns customer roles (Verified, VIP for $20+ spenders), and allows full site control via Discord commands. The bot will be hosted on cheap VPS hosting ($1-5/month) with automated deployment.

**Business Value:**
- Faster order management (click buttons vs navigating admin panel)
- Real-time sales visibility for team/partners
- Community building through customer Discord server
- Reduced support burden (customers can self-verify via Discord linking)
- Professional appearance with live purchase feed

**Stakeholders:**
- Site owner/admin (primary user of bot commands)
- Customers (benefit from Discord roles and community access)
- Future team members (can use Discord for collaborative admin work)

## Requirements

### Functional Requirements

#### FR-1: Server Auto-Builder
The bot SHALL provide a `!build_server` command that automatically creates the following Discord server structure:

**FR-1.1 Roles:**
- `Admin` - Full bot command access
- `Verified Customer` - Granted upon Discord account linking
- `VIP Customer` - Granted when customer total spending reaches $20+

**FR-1.2 Channels:**
- `#welcome` - Public channel, visible to @everyone
- `#live-orders` - Read-only channel (admin-view only) showing order feed with interactive buttons
- `#customer-lounge` - Hidden channel visible only to Verified Customer and VIP Customer roles
- `#admin-commands` - Hidden channel for admin bot commands

**FR-1.3 Permissions:**
- Bot SHALL set appropriate read/write permissions for each role on each channel
- Bot SHALL confirm successful setup with a summary message listing created roles and channels

#### FR-2: Live Order Feed
The bot SHALL post a message to `#live-orders` for every new order created on the website.

**FR-2.1 Order Embed Format:**
Each order message SHALL be a Discord embed containing:
- Order ID (format: CF-XXXXX)
- Customer email (masked: us***@example.com)
- Service name
- Quantity
- Total amount (USD)
- Status indicator: 🟡 Pending | 🔵 Processing | 🟢 Completed | 🔴 Cancelled
- Timestamp (relative, e.g., "2 minutes ago")

**FR-2.2 Interactive Buttons:**
Each order embed SHALL include 5 buttons:
- ✅ **Complete** - Marks order as completed, updates embed status to 🟢
- ❌ **Cancel** - Prompts for cancellation reason via modal, marks order cancelled
- 🔄 **Refund** - Prompts for refund amount (partial/full), processes refund
- 📝 **Edit** - Prompts for new quantity or service via modal, updates order
- 📊 **Details** - Replies with ephemeral message showing: link URL, start count, current count, provider order ID

**FR-2.3 Real-Time Updates:**
- Button interactions SHALL update the embed immediately (status, timestamp)
- All changes SHALL sync with the Vercel backend API
- If API call fails, button interaction SHALL show error message and NOT update embed

#### FR-3: Customer Role Automation

**FR-3.1 Discord Account Linking:**
- Website dashboard SHALL have a "Link Discord Account" button
- Clicking SHALL initiate Discord OAuth2 flow
- Upon authorization, webhook SHALL be sent to bot
- Bot SHALL:
  - Assign `Verified Customer` role to the user's Discord account
  - Send a welcome DM: "✅ Your Discord account is now linked! You have access to the customer lounge."
  - Log the linking event to audit log

**FR-3.2 VIP Auto-Upgrade:**
- When a customer's cumulative order total reaches $20.00 USD or more, the system SHALL:
  - Send VIP upgrade webhook to bot
  - Bot assigns `VIP Customer` role
  - Bot sends DM: "🎉 Congratulations! You've reached VIP status ($20+ spent). Enjoy exclusive perks!"
  - Bot removes `Verified Customer` role (VIP role grants same access plus more)

#### FR-4: Admin Commands

All commands SHALL require the user to have the `Admin` role. Commands without required parameters SHALL show usage help.

**FR-4.1 Order Management:**
- `!orders list [status]` - Lists orders (default: pending). Status options: pending, processing, completed, cancelled, all. Shows 10 per page with reaction navigation.
- `!orders view <order_id>` - Shows full order details (service, link, quantity, amount, status, timestamps, provider order ID).
- `!orders complete <order_id>` - Marks order completed. Confirms with reaction ✅.
- `!orders cancel <order_id> <reason>` - Cancels order with reason. Prompts for refund confirmation.
- `!orders refund <order_id> [amount]` - Processes refund. If amount omitted, prompts for full/partial selection.

**FR-4.2 User Management:**
- `!users list [role]` - Lists users (default: all). Role filter: verified, vip, banned. Shows 10 per page.
- `!users info <user_id>` - Shows user details: email, total spent, order count, wallet balance, join date, order history (last 5).
- `!users ban <user_id> <reason>` - Bans user, prevents login. Logs to audit log.
- `!users unban <user_id>` - Unbans user.
- `!users balance <user_id> [amount]` - Shows wallet balance. If amount provided (e.g., `+10`, `-5`, `20`), sets or adjusts balance.

**FR-4.3 Ticket Management:**
- `!tickets list [status]` - Lists support tickets (default: open). Status: open, closed, all.
- `!tickets view <ticket_id>` - Shows ticket details and message history.
- `!tickets close <ticket_id> [response]` - Closes ticket. If response provided, sends to customer first.
- `!tickets assign <ticket_id> <admin_mention>` - Assigns ticket to mentioned admin.

**FR-4.4 Service Management:**
- `!services list [platform]` - Lists services (default: all). Platform filter: instagram, tiktok, youtube, etc.
- `!services enable <service_id>` - Enables service (makes visible on storefront).
- `!services disable <service_id>` - Disables service (hides from storefront).
- `!services price <service_id> <new_price>` - Updates service price per 1000 units.

**FR-4.5 Flash Sales:**
- `!flash create <service> <discount%> <duration>` - Creates flash sale. Service can be ID or name. Duration format: 1h, 30m, 2d.
- `!flash list` - Lists active flash sales with end times.
- `!flash end <sale_id>` - Ends flash sale immediately.

**FR-4.6 Stats & Analytics:**
- `!stats today` - Shows today's revenue, order count, new user count, top service.
- `!stats week` - Shows 7-day summary.
- `!stats month` - Shows 30-day summary.

#### FR-5: Vercel API Integration

**FR-5.1 New API Endpoints:**
The Vercel backend SHALL implement the following endpoints:

- `POST /api/discord/webhook/order` - Receives order notification payloads from the website. Triggers bot to post to #live-orders.
  - Authentication: Bearer token (API_SECRET_KEY)
  - Payload: `{ order_id, customer_email, service_name, quantity, amount, status, created_at }`
  - Response: `200 OK` or `401 Unauthorized`

- `POST /api/discord/webhook/user-linked` - Receives Discord account linking events.
  - Payload: `{ user_id, discord_id, discord_username }`
  
- `POST /api/discord/webhook/vip-upgrade` - Receives VIP upgrade events.
  - Payload: `{ user_id, discord_id, total_spent }`

- `GET /api/discord/orders/<order_id>` - Fetches order details for bot commands.
  - Response: `{ id, user_id, service, link, quantity, amount, status, created_at, updated_at, provider_order_id, start_count, current_count }`

- `PATCH /api/discord/orders/<order_id>` - Updates order (complete, cancel, refund, edit).
  - Payload: `{ action: "complete" | "cancel" | "refund" | "edit", reason?, refund_amount?, new_quantity? }`

- `GET /api/discord/users/<user_id>` - Fetches user details.
  - Response: `{ id, email, discord_id, total_spent, wallet_balance, created_at, order_count, orders[] }`

- `GET /api/discord/tickets` - Lists tickets.
  - Query params: `?status=open|closed|all`

- `GET /api/discord/services` - Lists services.
  - Query params: `?platform=instagram|...`

- `GET /api/discord/stats` - Fetches analytics.
  - Query params: `?period=today|week|month`

**FR-5.2 Authentication:**
All Discord API endpoints SHALL:
- Require `Authorization: Bearer <API_SECRET_KEY>` header
- Return `401 Unauthorized` if missing or invalid
- Rate limit to 100 requests/minute per client (return `429 Too Many Requests`)

**FR-5.3 Webhook Triggers:**
The website SHALL send webhooks to the Discord bot URL for:
- New order creation
- Discord account linking completion
- VIP upgrade eligibility

### Non-Functional Requirements

#### NFR-1: Performance
- Order webhooks SHALL be processed and posted to Discord within 2 seconds
- Bot commands SHALL respond within 3 seconds (API latency + processing)
- Bot SHALL handle up to 100 orders per day without performance degradation

#### NFR-2: Reliability
- Bot SHALL auto-restart on crash (systemd service)
- Bot SHALL reconnect to Discord on connection loss within 5 seconds
- Bot SHALL retry failed API calls up to 3 times with exponential backoff
- Bot SHALL maintain 99.5% uptime over 30-day period

#### NFR-3: Security
- API secret key SHALL be 32+ character random alphanumeric string
- Bot token SHALL be stored in environment variables, never in code or version control
- All API calls SHALL use HTTPS
- Discord OAuth2 SHALL use state parameter to prevent CSRF
- Audit log SHALL record all admin actions (user, action, timestamp, details)

#### NFR-4: Usability
- All bot commands SHALL provide usage help when invoked incorrectly
- Error messages SHALL be clear and actionable (e.g., "Order CF-12345 not found. Check the order ID and try again.")
- Button interactions SHALL provide immediate visual feedback (e.g., "Processing..." ephemeral message)

#### NFR-5: Deployment
- Deployment script SHALL complete setup in under 5 minutes on a fresh VPS
- Script SHALL validate all environment variables before starting bot
- Script SHALL verify API connectivity before marking setup complete
- Bot SHALL log startup confirmation message to #admin-commands channel

### System Constraints

**SC-1: Discord API Limits:**
- Maximum 50 requests per second to Discord API
- Embeds limited to 6000 characters total
- Button components expire after 15 minutes (require refresh mechanism)
- Maximum 5 buttons per action row, 5 action rows per message

**SC-2: Hosting Requirements:**
- Python 3.9 or higher
- 512MB RAM minimum
- Ubuntu 20.04+ or Debian 11+ (for systemd)
- Persistent storage for SQLite database

**SC-3: External Dependencies:**
- Discord API availability (bot will not function during Discord outages)
- Vercel API availability (commands will fail gracefully with error messages)

## Glossary

- **Admin**: User with Discord `Admin` role, authorized to use bot commands
- **Verified Customer**: User who has linked their Discord account to their website account
- **VIP Customer**: User who has spent $20+ total on orders
- **Order Feed**: Real-time log of orders posted to #live-orders channel
- **Interactive Buttons**: Discord button components that trigger bot actions
- **Webhook**: HTTP POST request sent from website to bot to notify of events
- **OAuth2**: Discord's authorization protocol for account linking
- **Embed**: Rich message format in Discord with title, fields, colors, images
- **Ephemeral Message**: Discord message visible only to the user who triggered it
- **Systemd**: Linux service manager for auto-starting and monitoring the bot process
- **VPS**: Virtual Private Server (hosting environment for bot)
- **Bearer Token**: Authentication method where token is sent in Authorization header
