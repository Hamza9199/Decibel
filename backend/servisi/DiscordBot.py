import os
import discord
from discord import app_commands, Embed
import requests
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"

class MyClient(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        GUILD_ID = 899379078086426675 
        @self.tree.command(name="active", description="Get the Discord Active Developer Badge info", guild=discord.Object(id=GUILD_ID))
        async def active_command(interaction: discord.Interaction):
            try:
                r = requests.get(f"{BACKEND_URL}/discord/bot_invite")
                invite_url = "https://discord.com/developers/active-developer"
                if r.status_code == 200:
                    invite_url = r.json().get("invite_url", invite_url)
                embed = Embed(
                    title="Active Developer Badge",
                    description=f"Klikni [ovdje]({invite_url}) da claim-aš badge!\nMožeš claimati na: https://discord.com/developers/active-developer",
                    color=0x34DB98
                )
                embed.set_footer(text="Decibel Discord Bot")
                await interaction.response.send_message(embed=embed, ephemeral=True)
            except Exception as e:
                await interaction.response.send_message("Greška pri dohvaćanju badge linka.", ephemeral=True)

        await self.tree.sync(guild=discord.Object(id=GUILD_ID)) 

def start_discord_bot():
    """Pokreće Discord bota (koristi se za integraciju s backendom)"""
    client = MyClient()
    client.run(TOKEN)
