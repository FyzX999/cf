"""
Database operations for Discord bot
SQLite database for Discord user mappings and button cache
"""
import aiosqlite
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict

logger = logging.getLogger('discord_bot.database')

DB_PATH = 'bot.db'

async def init_db():
    """Initialize database with required tables"""
    async with aiosqlite.connect(DB_PATH) as db:
        # discord_links table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS discord_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                discord_id TEXT NOT NULL UNIQUE,
                discord_username TEXT NOT NULL,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                vip_assigned_at TIMESTAMP NULL
            )
        ''')
        
        await db.execute('CREATE INDEX IF NOT EXISTS idx_discord_id ON discord_links(discord_id)')
        await db.execute('CREATE INDEX IF NOT EXISTS idx_user_id ON discord_links(user_id)')
        
        # button_cache table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS button_cache (
                message_id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        await db.execute('CREATE INDEX IF NOT EXISTS idx_expires_at ON button_cache(expires_at)')
        
        await db.commit()
        logger.info('Database initialized')

async def link_user(user_id: str, discord_id: str, discord_username: str):
    """Link a Discord account to a user"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT OR REPLACE INTO discord_links (user_id, discord_id, discord_username, linked_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (user_id, discord_id, discord_username))
        await db.commit()
        logger.info(f'Linked user {user_id} to Discord {discord_username}')

async def get_user_by_discord_id(discord_id: str) -> Optional[Dict]:
    """Get user info by Discord ID"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            'SELECT * FROM discord_links WHERE discord_id = ?',
            (discord_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def set_vip_assigned(discord_id: str):
    """Mark VIP role as assigned"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            UPDATE discord_links SET vip_assigned_at = CURRENT_TIMESTAMP
            WHERE discord_id = ?
        ''', (discord_id,))
        await db.commit()
        logger.info(f'VIP assigned for Discord ID {discord_id}')

async def cache_button(message_id: str, order_id: str, ttl_minutes: int = 15):
    """Cache button message for order"""
    expires_at = datetime.now() + timedelta(minutes=ttl_minutes)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT OR REPLACE INTO button_cache (message_id, order_id, expires_at)
            VALUES (?, ?, ?)
        ''', (message_id, order_id, expires_at.isoformat()))
        await db.commit()

async def get_cached_button(message_id: str) -> Optional[str]:
    """Get cached order ID for message"""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            'SELECT order_id FROM button_cache WHERE message_id = ? AND expires_at > CURRENT_TIMESTAMP',
            (message_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else None

async def cleanup_expired_buttons():
    """Remove expired button cache entries"""
    async with aiosqlite.connect(DB_PATH) as db:
        result = await db.execute(
            'DELETE FROM button_cache WHERE expires_at < CURRENT_TIMESTAMP'
        )
        await db.commit()
        logger.info(f'Cleaned up {result.rowcount} expired button cache entries')
