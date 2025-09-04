import os
import discord
from discord import app_commands, Embed
import requests
import random
from dotenv import load_dotenv
import datetime
from discord.ui import View, Button

load_dotenv()
TOKEN = os.getenv("TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"

class MyClient(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        GUILD_IDS = [899379078086426675, 373131243224694785]  
        
        async def keep_alive_task():
            await self.wait_until_ready()
            while not self.is_closed():
                try:
                    await self.application_info()
                except Exception:
                    pass
                await discord.utils.sleep_until(discord.utils.utcnow() + datetime.timedelta(hours=1))
        self.loop.create_task(keep_alive_task())

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

        async def play_command(interaction: discord.Interaction, naziv: str):
            if not interaction.user.voice or not interaction.user.voice.channel:
                try:
                    await interaction.response.send_message("You must be in a voice channel to use this command!", ephemeral=True)
                except Exception:
                    pass
                return
            channel = interaction.user.voice.channel
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client:
                if voice_client.is_playing():
                    voice_client.stop()
                if voice_client.channel != channel:
                    await voice_client.move_to(channel)
            else:
                voice_client = await channel.connect()
            import aiohttp
            import asyncio
            BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}/api/pjesme/pjesma/search?q={naziv}") as resp:
                    if resp.status == 200:
                        pjesme = await resp.json()
                        pjesma = next((p for p in pjesme if p['naziv'].lower() == naziv.lower()), None)
                        if pjesma and pjesma.get('putanjaAudio'):
                            url = pjesma['putanjaAudio']
                            trajanje = pjesma.get('trajanjeSekunde', 0)
                            izvodjac_ime = None
                            korisnik_id = pjesma.get('korisnikID')
                            if korisnik_id:
                                async with session.get(f"{BACKEND_URL}/api/korisnici/{korisnik_id}") as korisnik_resp:
                                    if korisnik_resp.status == 200:
                                        korisnik = await korisnik_resp.json()
                                        izvodjac_ime = korisnik.get('korisnicko_ime')
                            if not izvodjac_ime:
                                izvodjac_ime = "Nepoznati izvođač"
                            def make_embed(current_sec):
                                bar_length = 19
                                if trajanje > 0:
                                    progress = min(max(int((current_sec / trajanje) * bar_length), 0), bar_length)
                                else:
                                    progress = 0
                                bar = f"`{chr(9608)*progress}{chr(9472)*(bar_length-progress)}`"
                                t1 = f"{int(current_sec//60):02}:{int(current_sec%60):02}"
                                t2 = f"{int(trajanje//60):02}:{int(trajanje%60):02}" if trajanje else "?"
                                desc = f"Requested by <@{interaction.user.id}>\n\n{t1}  {bar}  {t2}"
                                embed = Embed(
                                    title=f"{pjesma['naziv']} — *{izvodjac_ime}*",
                                    description=desc,
                                    color=0xb91d95
                                )
                                if pjesma.get('putanjaSlika'):
                                    embed.set_thumbnail(url=pjesma['putanjaSlika'])
                                elif pjesma.get('putanjaGif'):
                                    embed.set_thumbnail(url=pjesma['putanjaGif'])
                                embed.set_footer(text="Decibel")
                                return embed
                            class PlayerView(View):
                                def __init__(self, timeout=None):
                                    super().__init__(timeout=timeout)
                                    self.paused = False
                                @discord.ui.button(label="⏸️", style=discord.ButtonStyle.secondary, custom_id="pause_btn")
                                async def pause_btn(self, button: Button, interaction2: discord.Interaction):
                                    voice_client = discord.utils.get(self.voice_clients, guild=interaction2.guild)
                                    if voice_client and voice_client.is_playing():
                                        voice_client.pause()
                                        self.paused = True
                                        button.label = "▶️"
                                        await interaction2.response.edit_message(view=self)
                                    elif voice_client and voice_client.is_paused():
                                        voice_client.resume()
                                        self.paused = False
                                        button.label = "⏸️"
                                        await interaction2.response.edit_message(view=self)
                                @discord.ui.button(label="⏭️", style=discord.ButtonStyle.secondary, custom_id="skip_btn")
                                async def skip_btn(self, button: Button, interaction2: discord.Interaction):
                                    voice_client = discord.utils.get(self.voice_clients, guild=interaction2.guild)
                                    if voice_client and (voice_client.is_playing() or voice_client.is_paused()):
                                        voice_client.stop()
                                    await interaction2.response.edit_message(view=self)
                                @discord.ui.button(label="⏹️", style=discord.ButtonStyle.danger, custom_id="stop_btn")
                                async def stop_btn(self, button: Button, interaction2: discord.Interaction):
                                    voice_client = discord.utils.get(self.voice_clients, guild=interaction2.guild)
                                    if voice_client:
                                        if voice_client.is_playing() or voice_client.is_paused():
                                            voice_client.stop()
                                        await voice_client.disconnect()
                                    await interaction2.response.edit_message(view=self)
                            try:
                                voice_client.play(discord.FFmpegPCMAudio(url))
                                start_time = datetime.datetime.utcnow()
                                view = PlayerView(timeout=trajanje+30)
                                msg = await interaction.response.send_message(embed=make_embed(0), view=view)
                                if hasattr(msg, 'original_response'):
                                    message = await msg.original_response()
                                else:
                                    message = await interaction.original_response()
                                elapsed = 0
                                while voice_client.is_playing() and elapsed < trajanje:
                                    await asyncio.sleep(5)
                                    elapsed = (datetime.datetime.utcnow() - start_time).total_seconds()
                                    await message.edit(embed=make_embed(elapsed), view=view)
                            except Exception:
                                await interaction.response.send_message("Error playing song!", ephemeral=True)
                            return
            try:
                await interaction.response.send_message("Song not found!", ephemeral=True)
            except Exception:
                pass

        async def skip_command(interaction: discord.Interaction):
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            try:
                if voice_client and voice_client.is_playing():
                    voice_client.stop()
                    await interaction.response.send_message("Skipped!", ephemeral=False)
                else:
                    await interaction.response.send_message("There is no song to skip!", ephemeral=True)
            except Exception:
                pass

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

