"""
Configuration loader for Discord bot
Loads environment variables and validates required settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Bot configuration from environment variables"""
    
    # Discord
    DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
    GUILD_ID = int(os.getenv('DISCORD_GUILD_ID', 0)) if os.getenv('DISCORD_GUILD_ID') else None
    
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
    VIP_THRESHOLD = float(os.getenv('VIP_THRESHOLD', '20.00'))
    
    @classmethod
    def validate(cls):
        """Validate required environment variables"""
        required = {
            'DISCORD_BOT_TOKEN': cls.DISCORD_BOT_TOKEN,
            'DISCORD_GUILD_ID': cls.GUILD_ID,
            'API_SECRET_KEY': cls.API_SECRET_KEY
        }
        
        missing = [var for var, value in required.items() if not value]
        if missing:
            raise ValueError(f"Missing environment variables: {', '.join(missing)}")
        
        return True
