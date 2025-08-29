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
                "Ovaj bot je toliko aktivan da ni kava ne može da ga stigne! ☕",
                "/active: Aktiviran kao Windows bez licence!",
                "Ako ovo vidiš, bot je budan. Za sada... 😴",
                "Bot je aktivan! (Bar se tako pravi)",
                "Aktivniji od prosječnog studenta pred ispit!",
                "/active: Bot je tu, ali gdje je tvoja motivacija?",
                "Bot je online! Sad čekamo da i server bude..."
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

