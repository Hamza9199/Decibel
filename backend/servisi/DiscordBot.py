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
        self.song_queues = {}  

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
                "I'm not short, I'm just concentrated awesome.",
                "I'm not late, I'm just running in debug mode.",
                "I'm not ignoring you, I'm just buffering..."
            ]
            msg = random.choice(funny_messages)
            await interaction.response.send_message(msg, ephemeral=False)

        async def search_pjesme_autocomplete(interaction: discord.Interaction, current: str):
            import aiohttp
            BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}/api/pjesme/pjesma/search?q={current}") as resp:
                    if resp.status == 200:
                        pjesme = await resp.json()
                        return [discord.app_commands.Choice(name=p['naziv'], value=p['naziv']) for p in pjesme[:20]]
            return []

        async def play_next(guild_id, voice_client):
            queue = self.song_queues.get(guild_id, [])
            if queue:
                naziv, url = queue[0]
                def after_playing(error=None):
                    if error:
                        print(f"Error playing: {error}")
                    queue.pop(0)
                    if queue:
                        next_naziv, next_url = queue[0]
                        source = discord.FFmpegPCMAudio(next_url)
                        voice_client.play(source, after=lambda e: self.loop.call_soon_threadsafe(after_playing, e))
                source = discord.FFmpegPCMAudio(url)
                voice_client.play(source, after=lambda e: self.loop.call_soon_threadsafe(after_playing, e))

        async def play_command(interaction: discord.Interaction, naziv: str):
            guild_id = interaction.guild.id
            if not interaction.user.voice or not interaction.user.voice.channel:
                await interaction.response.send_message("You must be in a voice channel to use this command!", ephemeral=True)
                return
            channel = interaction.user.voice.channel
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client:
                if voice_client.channel != channel:
                    await voice_client.move_to(channel)
            else:
                voice_client = await channel.connect()
            import aiohttp
            BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}/api/pjesme/pjesma/search?q={naziv}") as resp:
                    if resp.status == 200:
                        pjesme = await resp.json()
                        pjesma = next((p for p in pjesme if p['naziv'].lower() == naziv.lower()), None)
                        if pjesma and pjesma.get('putanjaAudio'):
                            url = pjesma['putanjaAudio']
                            queue = self.song_queues.setdefault(guild_id, [])
                            if len(queue) >= 10:
                                await interaction.response.send_message("Queue is full (max 10 songs)!", ephemeral=True)
                                return
                            queue.append((pjesma['naziv'], url))
                            if not voice_client.is_playing():
                                await interaction.response.send_message(f"Playing: {pjesma['naziv']}", ephemeral=False)
                                await play_next(guild_id, voice_client)
                            else:
                                await interaction.response.send_message(f"Added to queue: {pjesma['naziv']}", ephemeral=False)
                            return
            await interaction.response.send_message("Song not found!", ephemeral=True)

        async def skip_command(interaction: discord.Interaction):
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client and voice_client.is_playing():
                voice_client.stop()
                await interaction.response.send_message("Skipped!", ephemeral=False)
            else:
                await interaction.response.send_message("There is no song to skip!", ephemeral=True)

        async def pause_command(interaction: discord.Interaction):
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client and voice_client.is_playing():
                voice_client.pause()
                await interaction.response.send_message("Paused!", ephemeral=False)
            else:
                await interaction.response.send_message("There is no song to pause!", ephemeral=True)

        async def unpause_command(interaction: discord.Interaction):
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client and voice_client.is_paused():
                voice_client.resume()
                await interaction.response.send_message("Unpaused!", ephemeral=False)
            else:
                await interaction.response.send_message("There is no paused song!", ephemeral=True)

        async def dis_command(interaction: discord.Interaction):
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client:
                if voice_client.is_playing():
                    voice_client.stop()
                await voice_client.disconnect()
                self.song_queues[interaction.guild.id] = []  
                await interaction.response.send_message("Disconnected from voice channel!", ephemeral=False)
            else:
                await interaction.response.send_message("I'm not in a voice channel!", ephemeral=True)

        for guild_id in GUILD_IDS:
            self.tree.command(
                name="active",
                description="I am funny!",
                guild=discord.Object(id=guild_id)
            )(active_command)
            play_cmd = self.tree.command(
                name="play",
                description="Play some songs broski!",
                guild=discord.Object(id=guild_id)
            )(app_commands.describe(naziv="Ime pjesme")(play_command))
            play_cmd.autocomplete('naziv')(search_pjesme_autocomplete)
            self.tree.command(
                name="skip",
                description="Skip current song!",
                guild=discord.Object(id=guild_id)
            )(skip_command)
            self.tree.command(
                name="pause",
                description="Pause current song!",
                guild=discord.Object(id=guild_id)
            )(pause_command)
            self.tree.command(
                name="unpause",
                description="Unpause current song!",
                guild=discord.Object(id=guild_id)
            )(unpause_command)
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

