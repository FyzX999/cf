"""
CheapFollower Discord Bot
Main entry point for the Discord bot
"""
import discord
from discord.ext import commands
import os
import logging
from config import Config

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('discord_bot')

# Bot intents
intents = discord.Intents.default()
intents.message_content = True
intents.members = True  # Required for role assignment

# Initialize bot
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    """Called when bot successfully connects to Discord"""
    logger.info(f'Logged in as {bot.user.name} (ID: {bot.user.id})')
    await bot.change_presence(activity=discord.Game(name="!help"))
    
    # Load cogs
    cogs = [
        'cogs.setup',
        'cogs.orders',
        'cogs.users',
        'cogs.tickets',
        'cogs.services',
        'cogs.flash',
        'cogs.stats',
        'cogs.webhooks'
    ]
    
    for cog in cogs:
        try:
            await bot.load_extension(cog)
            logger.info(f'Loaded cog: {cog}')
        except Exception as e:
            logger.error(f'Failed to load cog {cog}: {e}')

@bot.event
async def on_command_error(ctx, error):
    """Global error handler"""
    if isinstance(error, commands.CommandNotFound):
        return
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(f'❌ Missing required argument: {error.param.name}')
    elif isinstance(error, commands.BadArgument):
        await ctx.send(f'❌ Invalid argument provided')
    else:
        logger.error(f'Command error: {error}')
        await ctx.send(f'❌ An error occurred: {str(error)}')

if __name__ == '__main__':
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        logger.error(f'Configuration error: {e}')
        exit(1)
    
    # Run bot
    bot.run(Config.DISCORD_BOT_TOKEN)
