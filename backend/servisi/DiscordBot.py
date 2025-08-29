import os
import discord
from discord import app_commands, Embed
import requests
import random
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"

class MyClient(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        GUILD_IDS = [899379078086426675, 373131243224694785]  
        
        async def active_command(interaction: discord.Interaction):
            funny_messages = [
                "This bot is so active, even coffee can't keep up! ☕",
                "/active: Activated like Windows without a license!",
                "If you see this, the bot is awake. For now... 😴",
                "Bot is active! (Or at least pretending to be)",
                "More active than a student the night before an exam!",
                "/active: The bot is here, but where's your motivation?",
                "Bot is online! Now waiting for the server to catch up...",
                "I'm not saying I'm Batman, but have you ever seen us together?",
                "Running on 1% battery and 99% hope!",
                "I put the 'pro' in procrastination.",
                "If I had a dollar for every time I was active, I'd have... one dollar.",
                "Active like a cat at 3AM! 🐱",
                "I would tell you a joke about UDP, but you might not get it.",
                "I'm not lazy, I'm just on energy-saving mode.",
                "404: Motivation not found.",
                "I run on coffee, code, and questionable decisions.",
                "Active? I thought you said 'attractive'!",
                "I'm not a bot, I'm a highly advanced potato.",
                "I do all my own stunts... but most of them are accidental.",
                "If you need me, I'll be napping in RAM.",
                "I tried to be normal once. Worst two minutes ever.",
                "I'm not arguing, I'm just explaining why I'm right.",
                "I have a joke on concurrency, but it might never finish.",
                "I’m not short, I’m just concentrated awesome.",
                "I’m not late, I’m just running in debug mode.",
                "I’m not ignoring you, I’m just buffering..."
            ]
            msg = random.choice(funny_messages)
            await interaction.response.send_message(msg, ephemeral=False)

        for guild_id in GUILD_IDS:
            self.tree.command(
                name="active",
                description="Smijeh za poludit",
                guild=discord.Object(id=guild_id)
            )(active_command)

        for guild_id in GUILD_IDS:
            await self.tree.sync(guild=discord.Object(id=guild_id)) 

def start_discord_bot():
    """Pokreće Discord bota (koristi se za integraciju s backendom)"""
    client = MyClient()
    client.run(TOKEN)

