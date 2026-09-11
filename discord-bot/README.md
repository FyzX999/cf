# CheapFollower.shop Discord Bot

Discord bot for complete administrative control of CheapFollower.shop through Discord commands, live order feeds, and automated customer role management.

## Project Structure

```
discord-bot/
├── bot.py                      # Main entry point, bot initialization
├── config.py                   # Configuration loader (env vars)
├── database.py                 # SQLite operations (discord_id mappings)
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
├── cogs/                       # Command modules (to be implemented)
│   ├── __init__.py
│   ├── setup.py               # Server builder (!build_server)
│   ├── orders.py              # Order management commands
│   ├── users.py               # User management commands
│   ├── tickets.py             # Ticket management commands
│   ├── services.py            # Service management commands
│   ├── flash.py               # Flash sale commands
│   ├── stats.py               # Analytics commands
│   └── webhooks.py            # Webhook listener
├── utils/                      # Utility modules (to be implemented)
│   ├── __init__.py
│   ├── api_client.py          # Vercel API wrapper with retry logic
│   ├── embeds.py              # Embed builders
│   ├── validators.py          # Input validation helpers
│   ├── permissions.py         # Role/permission checking
│   └── pagination.py          # Paginated list views
└── systemd/                    # Systemd service files
    └── discord-bot.service    # Service configuration for auto-restart
```

## Prerequisites

- Python 3.9 or higher
- Discord bot token (from Discord Developer Portal)
- Discord server (guild) ID
- API secret key for Vercel backend authentication

## Setup Instructions

### 1. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and fill in your values
nano .env
```

Required environment variables:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_GUILD_ID` - Your Discord server ID
- `API_SECRET_KEY` - Secret key for API authentication (must match Vercel)

### 3. Run the Bot

```bash
# Make sure virtual environment is activated
python bot.py
```

### 4. Set Up Discord Server

Once the bot is running, use the `!build_server` command in Discord to automatically create:
- Required roles (Admin, Verified Customer, VIP Customer)
- Required channels (#welcome, #live-orders, #customer-lounge, #admin-commands)
- Proper permissions for each role

## Development Status

### ✅ Phase 1: Project Structure (Current Task)
- [x] Directory structure created
- [x] Main bot.py with initialization
- [x] Configuration loader (config.py)
- [x] Database operations (database.py)
- [x] Requirements.txt with dependencies
- [x] Environment variable template
- [x] Gitignore for Python project

### 🔄 Phase 2: Core Modules (Upcoming)
- [ ] API client with retry logic (utils/api_client.py)
- [ ] Embed builders (utils/embeds.py)
- [ ] Permission validators (utils/permissions.py)
- [ ] Input validators (utils/validators.py)
- [ ] Pagination helper (utils/pagination.py)

### 🔄 Phase 3: Command Cogs (Upcoming)
- [ ] Server setup cog (cogs/setup.py)
- [ ] Order management cog (cogs/orders.py)
- [ ] User management cog (cogs/users.py)
- [ ] Ticket management cog (cogs/tickets.py)
- [ ] Service management cog (cogs/services.py)
- [ ] Flash sale cog (cogs/flash.py)
- [ ] Stats/analytics cog (cogs/stats.py)
- [ ] Webhook listener cog (cogs/webhooks.py)

### 🔄 Phase 4: Deployment (Upcoming)
- [ ] Deployment script (deploy.sh)
- [ ] Systemd service file
- [ ] Production testing

## Features

### Live Order Feed
- Real-time order notifications in Discord
- Interactive buttons for order management (Complete, Cancel, Refund, Edit, Details)
- Automatic status updates with color-coded embeds

### Admin Commands
- Order management: `!orders list/view/complete/cancel/refund`
- User management: `!users list/info/ban/unban/balance`
- Ticket management: `!tickets list/view/close/assign`
- Service management: `!services list/enable/disable/price`
- Flash sales: `!flash create/list/end`
- Analytics: `!stats today/week/month`

### Role Automation
- Automatic "Verified Customer" role on Discord account linking
- Automatic "VIP Customer" role when spending reaches $20+
- Welcome DMs for role assignments

## Architecture

The bot communicates with the Vercel backend via:
- **Webhooks** (Vercel → Bot): Order notifications, user events
- **REST API** (Bot → Vercel): Command data fetching, updates

All API calls use Bearer token authentication for security.

## Security

- Bot token stored in environment variables only
- API secret key required for all backend communication
- Admin role required for all management commands
- Audit logging for all admin actions
- HTTPS for all API communications

## Support

For issues or questions, refer to the main project documentation or contact the development team.
