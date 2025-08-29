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

        async def play_command(interaction: discord.Interaction, video_id: str):
            if not interaction.user.voice or not interaction.user.voice.channel:
                await interaction.response.send_message("You must be in a voice channel to use this command!", ephemeral=True)
                return
            channel = interaction.user.voice.channel
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client and voice_client.is_playing():
                voice_client.stop()
            if not voice_client or not voice_client.is_connected():
                voice_client = await channel.connect()
            elif voice_client.channel != channel:
                await voice_client.move_to(channel)
            url = f"https://www.youtube.com/watch?v={video_id}"
            await interaction.response.send_message(f"Playing: {url}", ephemeral=False)
            import yt_dlp
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'default_search': 'auto',
                'extract_flat': 'in_playlist',
                'outtmpl': 'song.%(ext)s',
            }
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    audio_url = info['url']
                source = discord.FFmpegPCMAudio(audio_url)
                voice_client.play(source)
            except Exception as e:
                await interaction.followup.send(f"Cannot play this video. It may be protected or require login.\nError: {str(e)}", ephemeral=True)

        async def dis_command(interaction: discord.Interaction):
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client:
                if voice_client.is_playing():
                    voice_client.stop()
                await voice_client.disconnect()
                await interaction.response.send_message("Disconnected from voice channel!", ephemeral=False)
            else:
                await interaction.response.send_message("I'm not in a voice channel!", ephemeral=True)

        for guild_id in GUILD_IDS:
            self.tree.command(
                name="active",
                description="Smijeh za poludit",
                guild=discord.Object(id=guild_id)
            )(active_command)
            self.tree.command(
                name="play",
                description="Play a YouTube video in your voice channel",
                guild=discord.Object(id=guild_id)
            )(app_commands.describe(video_id="YouTube video ID")(play_command))
            self.tree.command(
                name="dis",
                description="Disconnect the bot from the voice channel",
                guild=discord.Object(id=guild_id)
            )(dis_command)

        for guild_id in GUILD_IDS:
            await self.tree.sync(guild=discord.Object(id=guild_id)) 

def start_discord_bot():
    """Pokreće Discord bota (koristi se za integraciju s backendom)"""
    client = MyClient()
    client.run(TOKEN)

