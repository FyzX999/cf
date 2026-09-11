# Design Document

## Overview

The Discord Admin Integration consists of three main components:
1. **Discord Bot** (Python/discord.py) - Hosted on VPS, handles Discord interactions
2. **Vercel API** (Next.js) - Extends existing backend with Discord-specific endpoints
3. **Communication Layer** - Webhooks and REST API calls between bot and Vercel

## Architecture

```
┌─────────────────┐         Webhooks          ┌──────────────────┐
│   Vercel API    │ ────────────────────────> │   Discord Bot    │
│  (Next.js/TS)   │                           │  (Python/discord.py)│
│                 │ <──────────────────────── │                  │
│ - Order webhooks│     REST API Calls        │ - Commands       │
│ - User webhooks │                           │ - Button handlers│
│ - Data endpoints│                           │ - Role automation│
└─────────────────┘                           └──────────────────┘
        │                                              │
        │                                              │
        v                                              v
┌─────────────────┐                           ┌──────────────────┐
│  Supabase DB    │                           │   Discord API    │
│                 │                           │                  │
│ - Orders        │                           │ - Guilds/Roles   │
│ - Users         │                           │ - Messages       │
│ - Tickets       │                           │ - Interactions   │
└─────────────────┘                           └──────────────────┘
```

### Component Architecture

#### Discord Bot (VPS-Hosted)
**Technology Stack:**
- Python 3.11
- discord.py 2.3.2
- aiohttp 3.9.1 (async HTTP client)
- python-dotenv 1.0.0
- aiosqlite 0.19.0 (async SQLite)

**Architecture Pattern:** Cogs (modular command groups)

**File Structure:**
```
discord-bot/
├── bot.py                      # Main entry point, bot initialization
├── config.py                   # Configuration loader (env vars)
├── database.py                 # SQLite operations (discord_id mappings)
├── requirements.txt            # Python dependencies
├── deploy.sh                   # Automated deployment script
├── .env.example                # Environment variable template
├── cogs/
│   ├── setup.py               # Server builder (!build_server)
│   ├── orders.py              # Order management commands
│   ├── users.py               # User management commands
│   ├── tickets.py             # Ticket management commands
│   ├── services.py            # Service management commands
│   ├── flash.py               # Flash sale commands
│   ├── stats.py               # Analytics commands
│   └── webhooks.py            # Webhook listener (internal HTTP server)
├── utils/
│   ├── api_client.py          # Vercel API wrapper with retry logic
│   ├── embeds.py              # Embed builders for consistent formatting
│   ├── validators.py          # Input validation helpers
│   ├── permissions.py         # Role/permission checking
│   └── pagination.py          # Paginated list views with reactions
└── systemd/
    └── discord-bot.service    # Systemd service file for auto-restart
```

#### Vercel API Extensions (Next.js)
**New Routes:**
```
src/app/api/discord/
├── webhook/
│   ├── order/route.ts         # POST - Receive order notifications
│   ├── user-linked/route.ts   # POST - Discord account linked
│   └── vip-upgrade/route.ts   # POST - VIP eligibility reached
├── orders/
│   ├── [id]/route.ts          # GET, PATCH - Fetch/update order
│   └── route.ts               # GET - List orders (paginated)
├── users/
│   ├── [id]/route.ts          # GET, PATCH - Fetch/update user
│   └── route.ts               # GET - List users (paginated)
├── tickets/
│   ├── [id]/route.ts          # GET, PATCH - Fetch/update ticket
│   └── route.ts               # GET - List tickets
├── services/
│   ├── [id]/route.ts          # GET, PATCH - Fetch/update service
│   └── route.ts               # GET - List services
├── stats/route.ts             # GET - Analytics data
└── auth/route.ts              # POST - Validate bot API key
```

**Middleware:** `src/middleware/discord-auth.ts` - Bearer token validation

#### Communication Patterns

**Pattern 1: Order Creation (Website → Discord)**
```
User places order
  ↓
Order created in DB (Supabase)
  ↓
Vercel calls: POST /api/discord/webhook/order
  ↓
Discord bot receives webhook
  ↓
Bot posts embed to #live-orders with buttons
```

**Pattern 2: Button Interaction (Discord → Website)**
```
Admin clicks ✅ Complete button
  ↓
Bot calls: PATCH /api/discord/orders/CF-12345
  Payload: { action: "complete" }
  ↓
Vercel updates order in DB
  ↓
Vercel returns updated order data
  ↓
Bot updates embed with 🟢 Completed status
```

**Pattern 3: Command Execution (Discord → Website → Discord)**
```
Admin types: !users info user@example.com
  ↓
Bot calls: GET /api/discord/users?email=user@example.com
  ↓
Vercel fetches user data from DB
  ↓
Vercel returns JSON response
  ↓
Bot formats and sends embed reply
```

## Components and Interfaces

### Data Models

#### Discord Bot Database (SQLite)

**Table: discord_links**
```sql
CREATE TABLE discord_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,           -- Supabase user UUID
    discord_id TEXT NOT NULL UNIQUE, -- Discord snowflake ID
    discord_username TEXT NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vip_assigned_at TIMESTAMP NULL
);

CREATE INDEX idx_discord_id ON discord_links(discord_id);
CREATE INDEX idx_user_id ON discord_links(user_id);
```

**Table: button_cache**
```sql
CREATE TABLE button_cache (
    message_id TEXT PRIMARY KEY,     -- Discord message ID
    order_id TEXT NOT NULL,          -- CF-12345
    expires_at TIMESTAMP NOT NULL,   -- 15 minutes from creation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expires_at ON button_cache(expires_at);
```

#### Vercel API Additions (Supabase)

**Table: discord_audit_log**
```sql
CREATE TABLE discord_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_discord_id TEXT NOT NULL,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,              -- "complete_order", "cancel_order", etc.
    target_type TEXT NOT NULL,         -- "order", "user", "ticket", etc.
    target_id TEXT NOT NULL,
    details JSONB,                     -- { reason: "...", amount: 10.50, etc. }
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON discord_audit_log(admin_discord_id);
CREATE INDEX idx_audit_created ON discord_audit_log(created_at DESC);
```

**Update existing users table:**
```sql
ALTER TABLE users ADD COLUMN discord_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN discord_username TEXT;
ALTER TABLE users ADD COLUMN discord_linked_at TIMESTAMP;
```

### API Specifications

#### Authentication

**Method:** Bearer Token
```http
Authorization: Bearer <API_SECRET_KEY>
```

**Implementation:**
```typescript
// src/middleware/discord-auth.ts
export function validateDiscordAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  const token = authHeader.substring(7);
  const validToken = process.env.DISCORD_API_SECRET;
  
  return token === validToken;
}
```

**Rate Limiting:** 100 requests/minute per IP (using Vercel Edge Config)

#### Webhook Endpoints

##### POST /api/discord/webhook/order
**Purpose:** Notify bot of new order creation

**Request:**
```json
{
  "order_id": "CF-12345",
  "user_id": "uuid-here",
  "user_email": "customer@example.com",
  "service_name": "Instagram Followers",
  "service_id": "service-uuid",
  "quantity": 1000,
  "amount": 5.99,
  "status": "pending",
  "link": "https://instagram.com/username",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "1234567890123456789"  // Discord message ID
}
```

**Error Responses:**
- 401: Invalid or missing Authorization header
- 429: Rate limit exceeded
- 500: Discord API error

##### POST /api/discord/webhook/user-linked
**Purpose:** Notify bot of Discord account linking

**Request:**
```json
{
  "user_id": "uuid-here",
  "discord_id": "123456789012345678",
  "discord_username": "username#1234",
  "linked_at": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "role_assigned": true,
  "dm_sent": true
}
```

##### POST /api/discord/webhook/vip-upgrade
**Purpose:** Notify bot of VIP eligibility

**Request:**
```json
{
  "user_id": "uuid-here",
  "discord_id": "123456789012345678",
  "total_spent": 25.50,
  "order_count": 5
}
```

**Response:**
```json
{
  "success": true,
  "vip_assigned": true,
  "dm_sent": true
}
```

#### Data Endpoints

##### GET /api/discord/orders
**Purpose:** List orders with filtering and pagination

**Query Parameters:**
- `status` (optional): "pending" | "processing" | "completed" | "cancelled" | "all"
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

**Response:**
```json
{
  "orders": [
    {
      "id": "CF-12345",
      "user_id": "uuid",
      "user_email": "customer@example.com",
      "service_name": "Instagram Followers",
      "quantity": 1000,
      "amount": 5.99,
      "status": "pending",
      "link": "https://instagram.com/username",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

##### GET /api/discord/orders/[id]
**Purpose:** Fetch single order details

**Response:**
```json
{
  "id": "CF-12345",
  "user_id": "uuid",
  "user_email": "customer@example.com",
  "service_id": "service-uuid",
  "service_name": "Instagram Followers",
  "quantity": 1000,
  "amount": 5.99,
  "status": "processing",
  "link": "https://instagram.com/username",
  "provider_order_id": "12345",
  "start_count": 1500,
  "current_count": 2300,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:45:00Z"
}
```

##### PATCH /api/discord/orders/[id]
**Purpose:** Update order status or details

**Request:**
```json
{
  "action": "complete" | "cancel" | "refund" | "edit",
  "reason": "string (required for cancel)",
  "refund_amount": "number (optional for refund, defaults to full)",
  "new_quantity": "number (required for edit)"
}
```

**Response:**
```json
{
  "success": true,
  "order": { /* updated order object */ }
}
```

**Business Logic:**
- `complete`: Sets status to "completed", records completion timestamp
- `cancel`: Sets status to "cancelled", logs reason, prompts refund if paid
- `refund`: Adds to user wallet balance, logs transaction
- `edit`: Updates quantity, recalculates amount if needed

##### GET /api/discord/users/[id]
**Purpose:** Fetch user details by user_id or discord_id

**Query Parameters:**
- `type` (optional): "user_id" | "discord_id" | "email" (default: user_id)

**Response:**
```json
{
  "id": "uuid",
  "email": "customer@example.com",
  "discord_id": "123456789012345678",
  "discord_username": "username#1234",
  "discord_linked_at": "2024-01-10T08:00:00Z",
  "wallet_balance": 15.50,
  "total_spent": 42.99,
  "order_count": 8,
  "created_at": "2024-01-01T12:00:00Z",
  "recent_orders": [
    { "id": "CF-12345", "amount": 5.99, "status": "completed", "created_at": "..." }
  ]
}
```

##### PATCH /api/discord/users/[id]
**Purpose:** Update user (ban, wallet balance)

**Request:**
```json
{
  "action": "ban" | "unban" | "set_balance" | "adjust_balance",
  "reason": "string (required for ban)",
  "balance": "number (required for set_balance)",
  "adjustment": "number (required for adjust_balance, can be negative)"
}
```

##### GET /api/discord/stats
**Purpose:** Fetch analytics data

**Query Parameters:**
- `period`: "today" | "week" | "month"

**Response:**
```json
{
  "period": "today",
  "revenue": 156.78,
  "order_count": 34,
  "new_users": 5,
  "completed_orders": 28,
  "pending_orders": 6,
  "top_service": {
    "name": "Instagram Followers",
    "orders": 12,
    "revenue": 71.88
  }
}
```

### Bot Implementation Details

#### Bot Initialization (bot.py)

```python
import discord
from discord.ext import commands
import os
from config import Config

intents = discord.Intents.default()
intents.message_content = True
intents.members = True  # Required for role assignment

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name}')
    await bot.change_presence(activity=discord.Game(name="!help"))
    
    # Load cogs
    await bot.load_extension('cogs.setup')
    await bot.load_extension('cogs.orders')
    await bot.load_extension('cogs.users')
    await bot.load_extension('cogs.tickets')
    await bot.load_extension('cogs.services')
    await bot.load_extension('cogs.flash')
    await bot.load_extension('cogs.stats')
    await bot.load_extension('cogs.webhooks')

if __name__ == '__main__':
    bot.run(Config.DISCORD_BOT_TOKEN)
```

#### Configuration (config.py)

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Discord
    DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
    GUILD_ID = int(os.getenv('DISCORD_GUILD_ID'))
    
    # API
    API_BASE_URL = os.getenv('API_BASE_URL', 'https://cheapfollower.shop')
    API_SECRET_KEY = os.getenv('API_SECRET_KEY')
    
    # Roles (will be set by !build_server)
    ADMIN_ROLE_NAME = 'Admin'
    VERIFIED_ROLE_NAME = 'Verified Customer'
    VIP_ROLE_NAME = 'VIP Customer'
    
    # Channels (will be set by !build_server)
    LIVE_ORDERS_CHANNEL = os.getenv('LIVE_ORDERS_CHANNEL_ID')
    ADMIN_COMMANDS_CHANNEL = os.getenv('ADMIN_COMMANDS_CHANNEL_ID')
    
    # Thresholds
    VIP_THRESHOLD = 20.00  # USD
    
    @classmethod
    def validate(cls):
        """Validate required environment variables"""
        required = ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'API_SECRET_KEY']
        missing = [var for var in required if not os.getenv(var)]
        if missing:
            raise ValueError(f"Missing environment variables: {', '.join(missing)}")
```

#### API Client (utils/api_client.py)

```python
import aiohttp
from typing import Optional, Dict, Any
from config import Config

class APIClient:
    def __init__(self):
        self.base_url = Config.API_BASE_URL
        self.headers = {
            'Authorization': f'Bearer {Config.API_SECRET_KEY}',
            'Content-Type': 'application/json'
        }
    
    async def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict[Any, Any]:
        """GET request with retry logic"""
        async with aiohttp.ClientSession() as session:
            for attempt in range(3):
                try:
                    async with session.get(
                        f'{self.base_url}{endpoint}',
                        headers=self.headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=5)
                    ) as response:
                        if response.status == 200:
                            return await response.json()
                        elif response.status == 429:  # Rate limited
                            await asyncio.sleep(2 ** attempt)  # Exponential backoff
                            continue
                        else:
                            raise APIError(f'API returned {response.status}')
                except aiohttp.ClientError as e:
                    if attempt == 2:  # Last attempt
                        raise APIError(f'API request failed: {str(e)}')
                    await asyncio.sleep(1)
    
    async def patch(self, endpoint: str, data: Dict) -> Dict[Any, Any]:
        """PATCH request"""
        # Similar implementation with retry logic
        pass
    
    async def post(self, endpoint: str, data: Dict) -> Dict[Any, Any]:
        """POST request"""
        # Similar implementation
        pass

class APIError(Exception):
    pass
```

#### Order Management Cog (cogs/orders.py)

```python
import discord
from discord.ext import commands
from discord import app_commands
from utils.api_client import APIClient, APIError
from utils.embeds import create_order_embed
from utils.permissions import is_admin

class Orders(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.api = APIClient()
    
    @commands.command(name='orders')
    @is_admin()
    async def orders(self, ctx, subcommand: str = 'list', *args):
        """Order management commands"""
        if subcommand == 'list':
            await self.list_orders(ctx, args)
        elif subcommand == 'view':
            await self.view_order(ctx, args)
        elif subcommand == 'complete':
            await self.complete_order(ctx, args)
        elif subcommand == 'cancel':
            await self.cancel_order(ctx, args)
        elif subcommand == 'refund':
            await self.refund_order(ctx, args)
        else:
            await ctx.send('❌ Unknown subcommand. Use: list, view, complete, cancel, refund')
    
    async def list_orders(self, ctx, args):
        """List orders with pagination"""
        status = args[0] if args else 'pending'
        page = int(args[1]) if len(args) > 1 else 1
        
        try:
            data = await self.api.get('/api/discord/orders', {
                'status': status,
                'page': page,
                'limit': 10
            })
            
            embed = discord.Embed(
                title=f'📦 {status.capitalize()} Orders',
                color=discord.Color.blue()
            )
            
            for order in data['orders']:
                embed.add_field(
                    name=f"{order['id']} - ${order['amount']}",
                    value=f"{order['service_name']} x{order['quantity']}\n{order['user_email']}",
                    inline=False
                )
            
            embed.set_footer(text=f"Page {page}/{data['pagination']['pages']}")
            await ctx.send(embed=embed)
            
        except APIError as e:
            await ctx.send(f'❌ Error fetching orders: {str(e)}')
    
    async def complete_order(self, ctx, args):
        """Mark order as completed"""
        if not args:
            await ctx.send('❌ Usage: !orders complete <order_id>')
            return
        
        order_id = args[0]
        
        try:
            result = await self.api.patch(f'/api/discord/orders/{order_id}', {
                'action': 'complete'
            })
            
            await ctx.send(f'✅ Order {order_id} marked as completed!')
            
        except APIError as e:
            await ctx.send(f'❌ Error: {str(e)}')

async def setup(bot):
    await bot.add_cog(Orders(bot))
```

#### Interactive Buttons (cogs/webhooks.py)

```python
import discord
from discord.ext import commands
from discord.ui import Button, View
from utils.api_client import APIClient

class OrderView(View):
    def __init__(self, order_id: str, api_client: APIClient):
        super().__init__(timeout=900)  # 15 minutes
        self.order_id = order_id
        self.api = api_client
    
    @discord.ui.button(label='Complete', style=discord.ButtonStyle.success, emoji='✅')
    async def complete(self, interaction: discord.Interaction, button: Button):
        await interaction.response.defer(ephemeral=True)
        
        try:
            result = await self.api.patch(f'/api/discord/orders/{self.order_id}', {
                'action': 'complete'
            })
            
            # Update embed
            embed = interaction.message.embeds[0]
            embed.description = embed.description.replace('🟡 Pending', '🟢 Completed')
            embed.color = discord.Color.green()
            await interaction.message.edit(embed=embed)
            
            await interaction.followup.send('✅ Order marked as completed!', ephemeral=True)
            
        except Exception as e:
            await interaction.followup.send(f'❌ Error: {str(e)}', ephemeral=True)
    
    @discord.ui.button(label='Cancel', style=discord.ButtonStyle.danger, emoji='❌')
    async def cancel(self, interaction: discord.Interaction, button: Button):
        # Show modal to get cancellation reason
        modal = CancelModal(self.order_id, self.api)
        await interaction.response.send_modal(modal)
    
    # ... other buttons (refund, edit, details)

class CancelModal(discord.ui.Modal, title='Cancel Order'):
    reason = discord.ui.TextInput(
        label='Cancellation Reason',
        placeholder='Enter reason for cancellation...',
        required=True,
        max_length=200
    )
    
    def __init__(self, order_id: str, api_client: APIClient):
        super().__init__()
        self.order_id = order_id
        self.api = api_client
    
    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        try:
            result = await self.api.patch(f'/api/discord/orders/{self.order_id}', {
                'action': 'cancel',
                'reason': self.reason.value
            })
            
            # Update embed
            embed = interaction.message.embeds[0]
            embed.description = embed.description.replace('🟡 Pending', '🔴 Cancelled')
            embed.color = discord.Color.red()
            embed.add_field(name='Reason', value=self.reason.value, inline=False)
            await interaction.message.edit(embed=embed)
            
            await interaction.followup.send('✅ Order cancelled!', ephemeral=True)
            
        except Exception as e:
            await interaction.followup.send(f'❌ Error: {str(e)}', ephemeral=True)
```

## Deployment

### Automated Deploy Script (deploy.sh)

```bash
#!/bin/bash

set -e  # Exit on error

echo "🚀 Discord Bot Deployment Script"
echo "================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Do not run this script as root"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -qq

# Install Python 3.11
echo "🐍 Installing Python 3.11..."
sudo apt-get install -y python3.11 python3.11-venv python3-pip

# Create virtual environment
echo "📁 Creating virtual environment..."
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo ""
    echo "❗ IMPORTANT: Edit .env and add your configuration:"
    echo "   nano .env"
    echo ""
    read -p "Press Enter after you've configured .env..."
fi

# Validate configuration
echo "✅ Validating configuration..."
python3 -c "from config import Config; Config.validate()" || {
    echo "❌ Configuration validation failed. Check your .env file."
    exit 1
}

# Create systemd service
echo "⚙️  Creating systemd service..."
cat > discord-bot.service <<EOF
[Unit]
Description=CheapFollower Discord Bot
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/venv/bin/python bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable discord-bot

# Start bot
echo "🚀 Starting bot..."
sudo systemctl start discord-bot

# Wait for startup
sleep 3

# Check status
if sudo systemctl is-active --quiet discord-bot; then
    echo ""
    echo "✅ Bot is running!"
    echo ""
    echo "📝 Useful commands:"
    echo "   View logs:    sudo journalctl -u discord-bot -f"
    echo "   Restart bot:  sudo systemctl restart discord-bot"
    echo "   Stop bot:     sudo systemctl stop discord-bot"
    echo "   Bot status:   sudo systemctl status discord-bot"
    echo ""
    echo "🎉 Deployment complete! Run !build_server in Discord to set up your server."
else
    echo ""
    echo "❌ Bot failed to start. Check logs:"
    echo "   sudo journalctl -u discord-bot -n 50"
    exit 1
fi
```

### Environment Variables (.env.example)

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here

# API Configuration
API_BASE_URL=https://cheapfollower.shop
API_SECRET_KEY=generate_32_char_random_string_here

# Channel IDs (will be set by !build_server)
LIVE_ORDERS_CHANNEL_ID=
ADMIN_COMMANDS_CHANNEL_ID=

# VIP Configuration
VIP_THRESHOLD=20.00
```

## Security Considerations

### API Secret Generation
```bash
# Generate secure 32-character secret
openssl rand -base64 32
```

### Bot Token Security
- Never commit .env to version control
- Use environment variables in production
- Rotate token if compromised

### Rate Limiting (Vercel Edge Config)
```typescript
// src/middleware/rate-limit.ts
import { get } from '@vercel/edge-config';

export async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `discord_ratelimit:${ip}`;
  const current = await get(key) || 0;
  
  if (current >= 100) return false;  // 100 req/minute
  
  // Increment counter (expires in 60 seconds)
  await set(key, current + 1, { ex: 60 });
  return true;
}
```

## Testing Plan

### Unit Tests
- API client retry logic
- Embed builders
- Permission validators
- Input sanitization

### Integration Tests
- Webhook delivery (Vercel → Bot)
- API calls (Bot → Vercel)
- Discord role assignment
- Button interactions

### Manual Testing Checklist
- [ ] !build_server creates all roles and channels
- [ ] New order triggers webhook and posts to #live-orders
- [ ] Complete button marks order completed in DB
- [ ] Cancel button prompts for reason and updates order
- [ ] !users info shows correct data
- [ ] VIP upgrade triggers role assignment
- [ ] Discord linking assigns Verified Customer role
- [ ] All commands validate admin role
- [ ] Rate limiting blocks excessive requests
- [ ] Bot auto-restarts on crash

## Performance Optimization

### Caching Strategy
- Discord role IDs cached in memory (refreshed on !build_server)
- Button interactions cached in SQLite (15 min TTL)
- API responses not cached (always fresh data)

### Database Optimization
```sql
-- Indexes for fast lookups
CREATE INDEX idx_discord_id ON discord_links(discord_id);
CREATE INDEX idx_user_id ON discord_links(user_id);
CREATE INDEX idx_expires_at ON button_cache(expires_at);

-- Cleanup job (run daily)
DELETE FROM button_cache WHERE expires_at < datetime('now');
```

### Discord API Best Practices
- Batch role assignments when possible
- Use ephemeral messages for errors (reduces clutter)
- Defer interactions immediately (avoid timeout)
- Use embeds over multiple messages (reduces API calls)

## Monitoring & Logging

### Logging Levels
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('discord_bot')
```

### Key Metrics to Monitor
- Command execution time
- API call success rate
- Webhook delivery latency
- Button interaction response time
- Memory usage
- Discord connection uptime

### Systemd Logs
```bash
# View real-time logs
sudo journalctl -u discord-bot -f

# View last 100 lines
sudo journalctl -u discord-bot -n 100

# View logs from today
sudo journalctl -u discord-bot --since today
```

## Rollout Plan

### Phase 1: Infrastructure Setup (Day 1)
1. Provision VPS (ADVANCED+ plan)
2. Run deploy.sh script
3. Verify bot comes online
4. Run !build_server command
5. Test basic connectivity

### Phase 2: Vercel API Development (Days 2-3)
1. Implement Discord API endpoints
2. Add authentication middleware
3. Deploy to Vercel staging
4. Test with Postman/curl
5. Deploy to production

### Phase 3: Bot Core Features (Days 4-5)
1. Implement order webhook listener
2. Build interactive buttons
3. Test order feed end-to-end
4. Implement basic commands (!orders list, !orders view)

### Phase 4: Admin Commands (Days 6-7)
1. Implement remaining order commands
2. Implement user management
3. Implement ticket/service/stats commands
4. Test all commands

### Phase 5: Role Automation (Day 8)
1. Implement Discord linking flow
2. Implement VIP upgrade logic
3. Test role assignment
4. Test DM delivery

### Phase 6: Production Launch (Day 9)
1. Final end-to-end testing
2. Load testing (simulate 100 orders)
3. Documentation finalization
4. Go live

## Success Metrics

### Technical Metrics
- 99.5% bot uptime
- <2s webhook-to-Discord latency
- <3s command response time
- Zero data loss incidents

### Business Metrics
- 100% of orders logged to Discord
- Admin adoption rate (commands used vs web panel)
- Customer Discord linking rate
- VIP role assignment accuracy

## Future Enhancements

### Phase 2 Features (Post-Launch)
- Scheduled daily/weekly reports
- Customer self-service commands (!myorders, !balance)
- Ticket system in Discord (create/reply)
- Multi-language support
- Slash commands (modernize from ! prefix)

### Phase 3 Features (Long-term)
- Discord Nitro booster perks
- Referral tracking via Discord
- Voice channel features (support calls)
- Integration with other platforms (Telegram, WhatsApp)
