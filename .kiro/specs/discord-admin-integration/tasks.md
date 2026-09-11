# Implementation Plan: Discord Admin Integration

## Overview

This implementation plan covers the development of a Discord bot for admin management and the integration with the existing Vercel Next.js application. The bot will provide real-time order notifications, interactive order management, user management, ticket handling, and automated role assignments based on spending thresholds.

## Tasks

- [x] 1. Create Discord Bot Project Structure

**Description:** Set up the Discord bot project directory with all necessary files and folder structure.

**Details:**
- Create `discord-bot/` directory in project root
- Create subdirectories: `cogs/`, `utils/`, `systemd/`
- Create main files: `bot.py`, `config.py`, `database.py`
- Create `requirements.txt` with dependencies
- Create `.env.example` template
- Create `.gitignore` for Python project

**Files to create:**
- `discord-bot/bot.py`
- `discord-bot/config.py`
- `discord-bot/database.py`
- `discord-bot/requirements.txt`
- `discord-bot/.env.example`
- `discord-bot/.gitignore`
- `discord-bot/cogs/` (directory)
- `discord-bot/utils/` (directory)
- `discord-bot/systemd/` (directory)

**Acceptance Criteria:**
- All directories and files created
- requirements.txt includes: discord.py==2.3.2, aiohttp==3.9.1, python-dotenv==1.0.0, aiosqlite==0.19.0
- .env.example has all required environment variables with descriptions
- .gitignore excludes .env, venv/, __pycache__/, *.pyc, *.db, *.log

- [~] 2. Implement Bot Configuration and Initialization
**Description:** Create the configuration system and bot initialization code.

**Details:**
- Implement `Config` class in `config.py` that loads environment variables
- Add validation method to check required env vars
- Implement bot initialization in `bot.py` with proper intents
- Set up cog loading system
- Add error handling for missing configuration

**Files to modify:**
- `discord-bot/config.py`
- `discord-bot/bot.py`

**Acceptance Criteria:**
- Config.validate() raises ValueError if required env vars missing
- Bot initializes with message_content and members intents
- Bot loads all cogs on startup
- Bot logs successful login with username
- Bot sets custom activity status ("!help")

- [~] 3. Implement Database Layer (SQLite)
**Description:** Create SQLite database with tables for Discord user mappings and button cache.

**Details:**
- Implement `database.py` with async SQLite operations
- Create `discord_links` table schema
- Create `button_cache` table schema
- Add indexes for performance
- Implement CRUD operations for both tables
- Add cleanup function for expired button cache entries

**Files to modify:**
- `discord-bot/database.py`

**Acceptance Criteria:**
- Tables created with correct schema (id, user_id, discord_id, discord_username, linked_at, vip_assigned_at for discord_links)
- Indexes created on discord_id, user_id, expires_at
- Functions: link_user(), get_user_by_discord_id(), set_vip_assigned(), cache_button(), get_cached_button(), cleanup_expired_buttons()
- All database operations are async
- Database file created at `discord-bot/bot.db`

- [~] 4. Implement API Client with Retry Logic
**Description:** Create the Vercel API client wrapper with authentication and retry logic.

**Details:**
- Implement `utils/api_client.py` with APIClient class
- Add get(), post(), patch() methods with retry logic
- Implement exponential backoff for rate limiting
- Add proper error handling and custom APIError exception
- Add timeout configuration (5 seconds)
- Include Authorization header with Bearer token

**Files to create:**
- `discord-bot/utils/api_client.py`

**Acceptance Criteria:**
- APIClient methods retry up to 3 times on failure
- Exponential backoff (2^attempt seconds) for 429 rate limit errors
- 5-second timeout per request
- Authorization header set with API_SECRET_KEY
- APIError raised with descriptive message on final failure
- All methods are async

- [~] 5. Implement Server Builder Cog (!build_server)
**Description:** Create the setup cog that auto-builds Discord server structure.

**Details:**
- Implement `cogs/setup.py` with Setup cog
- Add !build_server command
- Create roles: Admin, Verified Customer, VIP Customer
- Create channels: #welcome, #live-orders, #customer-lounge, #admin-commands
- Set proper permissions for each role on each channel
- Save channel IDs to environment/.env for future use
- Send confirmation embed with created roles and channels

**Files to create:**
- `discord-bot/cogs/setup.py`

**Acceptance Criteria:**
- Command creates all 3 roles with distinct colors
- Command creates all 4 channels in correct order
- #live-orders is read-only for non-admins
- #customer-lounge only visible to Verified/VIP customers
- #admin-commands only visible to Admins
- Confirmation message lists all created roles and channels
- Channel IDs saved to config for webhook use
- Command is idempotent (doesn't duplicate if run again)

- [~] 6. Implement Permission Validators and Embed Builders
**Description:** Create utility functions for role checking and consistent embed formatting.

**Details:**
- Implement `utils/permissions.py` with @is_admin() decorator
- Implement `utils/validators.py` for input validation (email, order ID, amounts)
- Implement `utils/embeds.py` with embed builders for orders, users, tickets, stats
- Add color constants (pending=yellow, processing=blue, completed=green, cancelled=red)
- Add error embed builder for consistent error messages

**Files to create:**
- `discord-bot/utils/permissions.py`
- `discord-bot/utils/validators.py`
- `discord-bot/utils/embeds.py`

**Acceptance Criteria:**
- @is_admin() decorator checks for Admin role, sends error if missing
- validate_order_id() checks CF-##### format
- validate_email() uses regex for email format
- validate_amount() ensures positive numbers with max 2 decimals
- create_order_embed() returns formatted order embed with status indicator
- create_error_embed() returns red embed with error message
- All color constants defined (Color.yellow(), Color.blue(), Color.green(), Color.red())

- [~] 7. Implement Order Management Cog (!orders commands)
**Description:** Create the orders cog with all order management commands.

**Details:**
- Implement `cogs/orders.py` with Orders cog
- Add commands: !orders list, !orders view, !orders complete, !orders cancel, !orders refund
- Implement pagination for !orders list (10 per page with reactions)
- Add CancelModal for cancellation reason input
- Add RefundModal for refund amount input
- Call appropriate API endpoints for each action
- Display results with embeds

**Files to create:**
- `discord-bot/cogs/orders.py`

**Acceptance Criteria:**
- !orders list shows 10 orders per page with status filter
- !orders view <id> displays full order details
- !orders complete <id> marks order completed via API
- !orders cancel <id> shows modal for reason, calls cancel API
- !orders refund <id> shows modal for amount, calls refund API
- All commands show error if API call fails
- Usage help shown if required parameters missing

- [~] 8. Implement Interactive Order Buttons and Webhook Listener
**Description:** Create the webhook listener that posts orders to Discord with interactive buttons.

**Details:**
- Implement `cogs/webhooks.py` with internal HTTP server
- Create OrderView class with 5 buttons (Complete, Cancel, Refund, Edit, Details)
- Implement button handlers that call API and update embeds
- Create CancelModal and RefundModal for button interactions
- Add webhook endpoint: POST /webhook/order
- Post order embed to #live-orders channel with buttons
- Cache message_id and order_id in database

**Files to create:**
- `discord-bot/cogs/webhooks.py`

**Sub-tasks:**
- 8.1: Implement internal HTTP server (aiohttp) on port 8080
- 8.2: Create OrderView with all 5 button handlers
- 8.3: Implement webhook endpoint handler
- 8.4: Add embed posting logic with button view

**Acceptance Criteria:**
- HTTP server starts on bot startup, listens on port 8080
- POST /webhook/order creates embed and posts to #live-orders
- Complete button updates embed to green with 🟢 status
- Cancel button shows modal, updates embed to red with 🔴 status and reason
- Refund button shows modal, calls refund API
- Edit button shows modal for quantity, calls edit API
- Details button shows ephemeral message with link, start count, current count
- Button interactions update the original embed in real-time
- All button actions call appropriate API endpoints

- [~] 9. Implement User Management Cog (!users commands)
**Description:** Create the users cog with user management commands.

**Details:**
- Implement `cogs/users.py` with Users cog
- Add commands: !users list, !users info, !users ban, !users unban, !users balance
- Implement user search by email or user_id
- Display user details with order history
- Implement ban/unban functionality via API
- Implement wallet balance viewing and adjustment

**Files to create:**
- `discord-bot/cogs/users.py`

**Acceptance Criteria:**
- !users list shows paginated user list with filters (verified, vip, banned)
- !users info <email|id> shows full user details and recent orders
- !users ban <id> <reason> bans user via API, logs to audit
- !users unban <id> unbans user via API
- !users balance <id> shows current wallet balance
- !users balance <id> <amount> sets or adjusts balance (+10, -5, or 20 for absolute)
- All commands validate admin role
- Error handling for user not found

- [~] 10. Implement Tickets, Services, Flash Sales, and Stats Cogs
**Description:** Create the remaining admin cogs for tickets, services, flash sales, and analytics.

**Details:**
- Implement `cogs/tickets.py` with ticket management commands
- Implement `cogs/services.py` with service management commands
- Implement `cogs/flash.py` with flash sale commands
- Implement `cogs/stats.py` with analytics commands
- All commands call appropriate API endpoints
- Display results with formatted embeds

**Files to create:**
- `discord-bot/cogs/tickets.py`
- `discord-bot/cogs/services.py`
- `discord-bot/cogs/flash.py`
- `discord-bot/cogs/stats.py`

**Sub-tasks:**
- 10.1: Implement tickets cog (!tickets list, view, close, assign)
- 10.2: Implement services cog (!services list, enable, disable, price)
- 10.3: Implement flash cog (!flash create, list, end)
- 10.4: Implement stats cog (!stats today, week, month)

**Acceptance Criteria:**
- All ticket commands work: list, view, close with response, assign to admin
- All service commands work: list with platform filter, enable/disable, update pricing
- All flash sale commands work: create with duration parsing (1h, 30m, 2d), list active, end sale
- All stats commands work: show revenue, order count, new users, top service for period
- Each cog properly registers commands
- Error handling for API failures
- Formatted embeds for all command outputs

- [~] 11. Create Vercel API - Discord Webhook Endpoints
**Description:** Implement the Discord webhook endpoints in the Vercel Next.js backend.

**Details:**
- Create API routes for Discord webhooks
- Implement Bearer token authentication middleware
- Add order notification webhook endpoint
- Add user-linked webhook endpoint
- Add VIP upgrade webhook endpoint
- Send HTTP POST requests to Discord bot's webhook URL

**Files to create:**
- `src/middleware/discord-auth.ts`
- `src/app/api/discord/webhook/order/route.ts`
- `src/app/api/discord/webhook/user-linked/route.ts`
- `src/app/api/discord/webhook/vip-upgrade/route.ts`

**Acceptance Criteria:**
- Middleware validates Authorization: Bearer <token> header
- Returns 401 if token missing or invalid
- POST /api/discord/webhook/order forwards order data to bot
- POST /api/discord/webhook/user-linked forwards linking data to bot
- POST /api/discord/webhook/vip-upgrade forwards VIP data to bot
- All endpoints return proper JSON responses
- Error handling for bot unavailable (log but don't fail order creation)

- [~] 12. Create Vercel API - Discord Data Endpoints (Orders)
**Description:** Implement the Discord data endpoints for order management.

**Details:**
- Create GET and PATCH endpoints for orders
- Implement pagination for list endpoint
- Add status filtering
- Implement order actions: complete, cancel, refund, edit
- Query Supabase database for order data
- Update order status and log to audit trail

**Files to create:**
- `src/app/api/discord/orders/route.ts`
- `src/app/api/discord/orders/[id]/route.ts`

**Acceptance Criteria:**
- GET /api/discord/orders returns paginated order list with status filter
- GET /api/discord/orders/[id] returns full order details including provider_order_id, counts
- PATCH /api/discord/orders/[id] handles action parameter: complete, cancel, refund, edit
- Complete action updates status to "completed" with timestamp
- Cancel action updates status to "cancelled", logs reason
- Refund action adds amount to wallet balance, creates transaction record
- Edit action updates quantity and recalculates amount
- All actions log to discord_audit_log table
- Returns 404 if order not found
- Returns 400 for invalid action or missing required fields

- [~] 13. Create Vercel API - Discord Data Endpoints (Users, Tickets, Services, Stats)
**Description:** Implement the remaining Discord data endpoints.

**Details:**
- Create user management endpoints (GET, PATCH)
- Create ticket management endpoints (GET, PATCH)
- Create service management endpoints (GET, PATCH)
- Create stats analytics endpoint (GET)
- All endpoints require Discord authentication
- Implement proper error handling and validation

**Files to create:**
- `src/app/api/discord/users/route.ts`
- `src/app/api/discord/users/[id]/route.ts`
- `src/app/api/discord/tickets/route.ts`
- `src/app/api/discord/tickets/[id]/route.ts`
- `src/app/api/discord/services/route.ts`
- `src/app/api/discord/services/[id]/route.ts`
- `src/app/api/discord/stats/route.ts`

**Sub-tasks:**
- 13.1: Implement user endpoints (list, get by id/email/discord_id, ban/unban, balance)
- 13.2: Implement ticket endpoints (list, get, close, assign)
- 13.3: Implement service endpoints (list, get, enable/disable, update price)
- 13.4: Implement stats endpoint (period-based analytics)

**Acceptance Criteria:**
- User endpoints support type query param (user_id, discord_id, email)
- User PATCH supports actions: ban, unban, set_balance, adjust_balance
- Ticket endpoints support status filter (open, closed, all)
- Ticket PATCH supports close action with optional response message
- Service endpoints support platform filter
- Service PATCH supports enable, disable, update_price actions
- Stats endpoint calculates revenue, orders, new users for today/week/month
- All endpoints return proper pagination where applicable
- All endpoints log admin actions to discord_audit_log

- [~] 14. Create Discord Audit Log Database Table
**Description:** Add the Discord audit log table to Supabase and update users table.

**Details:**
- Create migration for discord_audit_log table
- Add discord_id, discord_username, discord_linked_at columns to users table
- Create indexes for performance
- Test migration on local Supabase instance

**Files to create:**
- `supabase/migrations/[timestamp]_add_discord_audit_log.sql`

**Acceptance Criteria:**
- discord_audit_log table created with all columns (id, admin_discord_id, admin_username, action, target_type, target_id, details, created_at)
- Indexes created on admin_discord_id and created_at
- users table updated with discord_id (unique), discord_username, discord_linked_at columns
- Migration runs successfully without errors
- Rollback script provided

- [~] 15. Integrate Discord Webhooks into Order Creation Flow
**Description:** Modify the order creation code to send webhooks to Discord bot.

**Details:**
- Update order creation in `src/lib/orders.ts` (or wherever orders are created)
- Call Discord webhook after successful order insertion
- Include all order details in webhook payload
- Handle webhook failures gracefully (log error but don't fail order)
- Add environment variable for Discord bot webhook URL

**Files to modify:**
- `src/lib/orders.ts` (or relevant order creation file)
- `.env.example` (add DISCORD_BOT_WEBHOOK_URL)

**Acceptance Criteria:**
- After order created in DB, POST request sent to Discord bot webhook
- Webhook payload includes: order_id, user_id, user_email, service_name, service_id, quantity, amount, status, link, created_at
- Webhook call does not block order creation (fire and forget or async)
- If webhook fails, error logged but order creation still succeeds
- DISCORD_BOT_WEBHOOK_URL environment variable documented in .env.example

- [~] 16. Implement Discord OAuth2 Linking Flow
**Description:** Create the Discord account linking functionality for customers.

**Details:**
- Add "Link Discord" button to user dashboard
- Implement Discord OAuth2 authorization flow
- Create callback endpoint that exchanges code for user info
- Store discord_id and discord_username in users table
- Send webhook to bot to assign Verified Customer role
- Show success message and linked status in dashboard

**Files to create:**
- `src/app/api/auth/discord/route.ts` (OAuth initiation)
- `src/app/api/auth/discord/callback/route.ts` (OAuth callback)
- `src/app/dashboard/settings/page.tsx` (add Link Discord button)

**Acceptance Criteria:**
- Dashboard shows "Link Discord Account" button if not linked
- Dashboard shows linked Discord username if already linked
- Clicking button redirects to Discord OAuth authorization
- Callback receives code, exchanges for access_token
- User info fetched from Discord API (id, username)
- discord_id and discord_username saved to users table with timestamp
- Webhook sent to bot: POST /webhook/user-linked with user_id, discord_id, discord_username
- Success message shown: "Discord account linked! Check Discord for your Verified Customer role."
- Error handling for OAuth failures (invalid state, code exchange failure)

- [~] 17. Implement VIP Auto-Upgrade Logic
**Description:** Add logic to automatically upgrade users to VIP when they reach $20+ total spent.

**Details:**
- Create function to calculate user's total spent
- Add check after order completion
- When total >= $20 and user not already VIP, send webhook to bot
- Bot assigns VIP Customer role and sends DM
- Track VIP assignment in database

**Files to modify:**
- `src/lib/orders.ts` (or wherever order completion happens)
- Create helper function in `src/lib/discord.ts`

**Acceptance Criteria:**
- After order marked completed, check user's total_spent
- If total_spent >= $20.00 and user has discord_id and not already VIP, send webhook
- Webhook payload: { user_id, discord_id, total_spent, order_count }
- POST to Discord bot: /webhook/vip-upgrade
- Function does not fail if webhook fails (log error only)
- VIP status tracked (can query if user is VIP from bot's vip_assigned_at field)

- [~] 18. Create Deployment Script (deploy.sh)
**Description:** Create the automated deployment script for VPS hosting.

**Details:**
- Write bash script that automates full bot deployment
- Install Python 3.11 and dependencies
- Create systemd service for auto-restart
- Validate configuration before starting
- Provide helpful output and error messages

**Files to create:**
- `discord-bot/deploy.sh`
- `discord-bot/systemd/discord-bot.service.template`

**Acceptance Criteria:**
- Script checks if running as root (exits if true)
- Updates system packages (apt-get update)
- Installs Python 3.11, pip, venv
- Creates virtual environment
- Installs requirements.txt dependencies
- Prompts to edit .env if not exists
- Validates config with Config.validate()
- Creates systemd service from template
- Enables and starts service
- Checks if service is running
- Outputs useful commands (view logs, restart, stop)
- Script is executable (chmod +x deploy.sh)
- Entire deployment completes in under 5 minutes on fresh Ubuntu/Debian VPS

- [~] 19. Create Documentation and README
**Description:** Create comprehensive documentation for the Discord bot.

**Details:**
- Write README for discord-bot/ directory
- Document all commands with usage examples
- Create setup guide for VPS hosting
- Document environment variables
- Add troubleshooting section
- Create user guide for server setup (!build_server)

**Files to create:**
- `discord-bot/README.md`
- `discord-bot/SETUP_GUIDE.md`
- `discord-bot/COMMANDS.md`

**Acceptance Criteria:**
- README includes overview, features, requirements, quick start
- SETUP_GUIDE has step-by-step VPS setup instructions
- SETUP_GUIDE includes Discord bot token creation steps
- SETUP_GUIDE includes generating API secret key (openssl command)
- COMMANDS.md lists all commands with usage examples and descriptions
- Troubleshooting section covers: bot not starting, API connection failed, webhook not working
- Clear instructions for running !build_server as first step

- [~] 20. Testing and Bug Fixes
**Description:** Comprehensive testing of all features and fixing any bugs found.

**Details:**
- Test bot deployment on clean VPS
- Test !build_server command
- Test all order commands
- Test all user/ticket/service/stats commands
- Test interactive buttons
- Test webhook delivery (order creation → Discord)
- Test Discord OAuth linking
- Test VIP auto-upgrade
- Fix any bugs discovered
- Verify performance requirements (<2s webhook latency, <3s command response)

  **Manual Testing Checklist:**
  • Bot deploys successfully with deploy.sh
  • !build_server creates all roles and channels correctly
  • New order on website appears in #live-orders within 2 seconds
  • Complete button marks order completed in database
  • Cancel button prompts for reason and updates order
  • Refund button processes refund correctly
  • Edit button updates order quantity
  • Details button shows full order info
  • !orders list shows orders with pagination
  • !orders view shows full details
  • !users info shows correct user data and order history
  • !users ban prevents login
  • !users balance adjusts wallet correctly
  • !tickets, !services, !flash, !stats commands work
  • Discord linking assigns Verified Customer role
  • User reaching $20 gets VIP Customer role
  • Bot auto-restarts after crash (systemd)
  • All API endpoints require valid Bearer token
  • Rate limiting works (blocks after 100 req/min)

**Acceptance Criteria:**
- All manual tests pass
- No critical bugs remaining
- Webhook-to-Discord latency < 2 seconds
- Command response time < 3 seconds
- Bot handles 100+ orders/day without issues
- Documentation is accurate and complete
- Deploy script works on fresh Ubuntu 20.04/22.04 and Debian 11/12

## Task Dependency Graph

```json
{
  "waves": [
    [1],
    [2, 3, 5],
    [4, 6],
    [7, 8, 9, 10, 11, 12, 13, 14],
    [15, 16, 17, 18],
    [19],
    [20]
  ]
}
```
