import os
import logging
import discord
from discord import app_commands, Embed
import requests
import random
from dotenv import load_dotenv
import datetime
from discord.ui import View, Button
import httpx

logging.basicConfig(level=logging.INFO)
load_dotenv()
TOKEN = os.getenv("TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"

class MyClient(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        intents.voice_states = True
        intents.message_content = True
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
        import threading
        import time
        def keep_alive():
            url = os.getenv("KEEP_ALIVE_URL") or "http://localhost:8000/"
            while True:
                try:
                    requests.get(url, timeout=10)
                    print(f"[DiscordBot] Keep-alive request sent to {url}")
                except Exception:
                    pass
                time.sleep(300)  
        threading.Thread(target=keep_alive, daemon=True).start()

    async def setup_hook(self):
        GUILD_IDS = [899379078086426675, 373131243224694785, 775693283007397899]  
        
        async def keep_alive_task():
            await self.wait_until_ready()
            import asyncio
            while not self.is_closed():
                try:
                    for vc in list(self.voice_clients):
                        try:
                            channel = vc.channel
                            members = channel.members if channel else []
                            only_bot = len([m for m in members if not m.bot]) == 0
                            idle = not vc.is_playing() and not vc.is_paused() and (datetime.datetime.utcnow() - getattr(vc, 'last_active', datetime.datetime.utcnow())).total_seconds() > 1800
                            if only_bot or idle:
                                try:
                                    await vc.disconnect()
                                except Exception as e:
                                    print(f"[DiscordBot] Greška pri disconnectu: {e}")
                        except Exception as e:
                            print(f"[DiscordBot] Greška u provjeri voice clienta: {e}")
                    await asyncio.sleep(300)
                except Exception as e:
                    print(f"[DiscordBot] Greška u keep_alive_task petlji: {e}")
                    await asyncio.sleep(10)
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
            if not current or not current.strip():
                return []
            try:
                import aiohttp
                BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{BACKEND_URL}/api/pjesme/pjesma/search?q={current}", timeout=10) as resp:
                        if resp.status == 200:
                            pjesme = await resp.json()
                            return [discord.app_commands.Choice(name=p['naziv'], value=p['naziv']) for p in pjesme[:20]]
            except Exception:
                logging.exception("[DiscordBot] Autocomplete failed")
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
            def is_vc_connected(vc):
                if not vc:
                    return False
                try:
                    fn = getattr(vc, "is_connected", None)
                    if callable(fn):
                        return fn()
                    return getattr(vc, "channel", None) is not None
                except Exception:
                    return False
            try:
                try:
                    await interaction.response.defer()
                except Exception:
                    logging.warning("[DiscordBot] Failed to defer interaction")

                if voice_client and is_vc_connected(voice_client):
                    if voice_client.is_playing():
                        voice_client.stop()
                    if voice_client.channel != channel:
                        await voice_client.move_to(channel)
                else:
                    voice_client = await channel.connect(timeout=30, reconnect=True)
            except Exception:
                logging.exception(f"[DiscordBot] Failed to connect to voice channel {getattr(channel,'id',None)}")
                try:
                    await interaction.followup.send("Ne mogu se povezati na voice kanal (handshake error). Pokušajte ponovo kasnije.", ephemeral=True)
                except Exception:
                    pass
                return
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
                                def __init__(self, client, timeout=None):
                                    super().__init__(timeout=timeout)
                                    self.client = client
                                    self.paused = False
                                @discord.ui.button(label="\u23F8", style=discord.ButtonStyle.secondary, custom_id="pause_btn")
                                async def pause_btn(self, button: Button, interaction2: discord.Interaction):
                                    voice_client = discord.utils.get(interaction2.client.voice_clients, guild=interaction2.guild)
                                    if voice_client and voice_client.is_playing():
                                        voice_client.pause()
                                        self.paused = True
                                        button.label = "\u23F8"
                                        await interaction2.response.edit_message(view=self)
                                    elif voice_client and voice_client.is_paused():
                                        voice_client.resume()
                                        self.paused = False
                                        button.label = "\u25B6"
                                        await interaction2.response.edit_message(view=self)
                                @discord.ui.button(label="\u23ED", style=discord.ButtonStyle.secondary, custom_id="skip_btn")
                                async def skip_btn(self, button: Button, interaction2: discord.Interaction):
                                    voice_client = discord.utils.get(interaction2.client.voice_clients, guild=interaction2.guild)
                                    if voice_client and (voice_client.is_playing() or voice_client.is_paused()):
                                        voice_client.stop()
                                    await interaction2.response.edit_message(view=self)
                                @discord.ui.button(label="\u23F9", style=discord.ButtonStyle.danger, custom_id="stop_btn")
                                async def stop_btn(self, button: Button, interaction2: discord.Interaction):
                                    voice_client = discord.utils.get(interaction2.client.voice_clients, guild=interaction2.guild)
                                    if voice_client:
                                        if voice_client.is_playing() or voice_client.is_paused():
                                            voice_client.stop()
                                        await voice_client.disconnect()
                                    await interaction2.response.edit_message(view=self)
                            try:
                                if not is_vc_connected(voice_client):
                                    try:
                                        voice_client = await channel.connect(timeout=15, reconnect=True)
                                    except Exception:
                                        logging.exception("[DiscordBot] Could not (re)connect before playback")
                                        try:
                                            await interaction.followup.send("Ne mogu započeti reprodukciju - problem s voice vezom.", ephemeral=True)
                                        except Exception:
                                            pass
                                        return
                                voice_client.play(discord.FFmpegPCMAudio(url))
                                start_time = datetime.datetime.utcnow()
                                view = PlayerView(self, timeout=trajanje+30)
                                try:
                                    msg = await interaction.followup.send(embed=make_embed(0), view=view)
                                except Exception:
                                    msg = None
                                if hasattr(msg, 'original_response'):
                                    message = await msg.original_response()
                                else:
                                    try:
                                        message = await interaction.original_response()
                                    except Exception:
                                        message = None
                                elapsed = 0
                                while voice_client.is_playing() and elapsed < trajanje:
                                    await asyncio.sleep(5)
                                    elapsed = (datetime.datetime.utcnow() - start_time).total_seconds()
                                    if message:
                                        try:
                                            await message.edit(embed=make_embed(elapsed), view=view)
                                        except Exception:
                                            pass
                            except discord.errors.ClientException:
                                logging.exception("[DiscordBot] ClientException during playback")
                                try:
                                    await interaction.followup.send("Ne mogu reproducirati pjesmu - bot nije povezan na voice.", ephemeral=True)
                                except Exception:
                                    pass
                            except Exception:
                                logging.exception("[DiscordBot] Error during playback")
                                try:
                                    await interaction.followup.send("Greška pri reprodukciji pjesme.", ephemeral=True)
                                except Exception:
                                    pass
                            if voice_client:
                                 voice_client.last_active = datetime.datetime.utcnow()
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

    async def on_ready(self):
        try:
            headers = {"Authorization": f"Bot {TOKEN}"}
            async with httpx.AsyncClient() as client:
                r = await client.get("https://discord.com/api/v10/users/@me", headers=headers)
                if r.status_code == 200:
                    user = r.json()
                    bot_id = user.get("id")
                    if bot_id:
                        invite_url = f"https://discord.com/api/oauth2/authorize?client_id={bot_id}&scope=bot%20applications.commands"
                        print(f"[Discord Bot] Invite link: {invite_url}")
                    else:
                        print("[Discord Bot] Nije pronađen bot ID.")
                else:
                    print("[Discord Bot] Ne mogu dohvatiti bot user info. Provjeri token.")
        except Exception as e:
            print(f"[Discord Bot] Greška pri dohvaćanju invite linka: {e}")
        print(f"[Discord Bot] Prijavljen kao: {self.user}")

def start_discord_bot():
    """Pokreće Discord bota (koristi se za integraciju s backendom ili samostalno)"""
    client = MyClient()
    client.run(TOKEN)

