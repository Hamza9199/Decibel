import os
import logging
import discord
from discord import app_commands, Embed
import random
from dotenv import load_dotenv
import datetime
from discord.ui import View, Button
import httpx
import asyncio
import aiohttp

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
        
        

    async def setup_hook(self):
        GUILD_IDS = [899379078086426675, 373131243224694785, 775693283007397899]  
        
        async def keep_alive_task():
            await self.wait_until_ready()
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
            try:
                if interaction.response.is_done():
                    return []
                
                BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"
                
                if not current or not current.strip():
                    try:
                        timeout = aiohttp.ClientTimeout(total=2)
                        async with aiohttp.ClientSession(timeout=timeout) as session:
                            async with session.get(f"{BACKEND_URL}/api/pjesme/pjesma/search?q=") as resp:
                                if resp.status == 200:
                                    pjesme = await resp.json()
                                    import random
                                    random_songs = random.sample(pjesme, min(10, len(pjesme)))
                                    return [discord.app_commands.Choice(name=p['naziv'], value=p['naziv']) for p in random_songs[:10]]
                    except asyncio.TimeoutError:
                        logging.warning("[DiscordBot] Autocomplete random songs timeout")
                    except Exception as e:
                        logging.warning(f"[DiscordBot] Autocomplete random songs error: {e}")
                    return []
                
                if len(current.strip()) < 2:
                    return []
                
                timeout = aiohttp.ClientTimeout(total=2)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.get(f"{BACKEND_URL}/api/pjesme/pjesma/search?q={current}") as resp:
                        if resp.status == 200:
                            pjesme = await resp.json()
                            return [discord.app_commands.Choice(name=p['naziv'], value=p['naziv']) for p in pjesme[:10]]
            except asyncio.TimeoutError:
                logging.warning("[DiscordBot] Autocomplete timeout")
            except Exception as e:
                logging.warning(f"[DiscordBot] Autocomplete error: {e}")
            return []
        

        async def provjeri_pristup(interaction: discord.Interaction):
            discord_id = str(interaction.user.id)

            try:
                async with aiohttp.ClientSession() as session:

                    async with session.get(
                        f"{BACKEND_URL}/api/discordlink/{discord_id}"
                    ) as resp:

                        if resp.status != 200:
                            await interaction.response.send_message(
                                "❌ You need to connect your decibel account.\n\nhttps://decibel.click/discord-link",
                                ephemeral=True
                            )
                            return None

                        korisnik = await resp.json()

                    async with session.get(
                        f"{BACKEND_URL}/api/korisnik_pretplata/korisnik/{korisnik['id']}"
                    ) as pretplata_resp:

                        if pretplata_resp.status != 200:
                            await interaction.response.send_message(
                                "❌ U need subscription on Decibel.\n\nhttps://decibel.click/profile/subscription",
                                ephemeral=True
                            )
                            return None

                        pretplata = await pretplata_resp.json()
                        status = pretplata.get("pretplataStatus")

                        if status not in ["aktivna", "pauzirana"]:
                            await interaction.response.send_message(
                                "❌ U need active subscription on Decibel.\n\nhttps://decibel.click/profile/subscription",
                                ephemeral=True
                            )
                            return None

                return korisnik

            except Exception as e:
                logging.exception("[DiscordBot] check access error")
                return None

        async def play_command(interaction: discord.Interaction, naziv: str):
            korisnik = await provjeri_pristup(interaction)

            if not korisnik:
                return
            if os.getenv("DISABLE_VOICE", "false").lower() == "true":
                try:
                    await interaction.response.send_message(
                        "🎵 Voice playback is disabled on this hosting environment (Render doesn't support UDP). "
                        "Songs can only be played on local/self-hosted instances. "
                        "Check the music on the web player instead!",
                        ephemeral=True
                    )
                except Exception:
                    pass
                return

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
                    logging.warning("[DiscordBot] Failed to defer interaction (ignoring)")

                if voice_client and is_vc_connected(voice_client):
                    if voice_client.is_playing():
                        voice_client.stop()
                    if voice_client.channel != channel:
                        await voice_client.move_to(channel)
                else:
                    try:
                        voice_client = await channel.connect(timeout=30, reconnect=False)
                    except discord.errors.ConnectionClosed as cc:
                        logging.error(f"[DiscordBot] Voice ConnectionClosed (code {cc.code}): {cc}")
                        try:
                            await interaction.followup.send(
                                "❌ Cannot connect to voice channel. This is a hosting environment limitation (Render doesn't support UDP voice). "
                                "Try on a self-hosted or local instance instead.",
                                ephemeral=True
                            )
                        except Exception:
                            pass
                        return
                    except discord.errors.ClientException as ce:
                        logging.error(f"[DiscordBot] Voice ClientException: {ce}")
                        try:
                            await interaction.followup.send(
                                "❌ Bot connection error. Try again in a moment.",
                                ephemeral=True
                            )
                        except Exception:
                            pass
                        return
                    except Exception as e:
                        logging.exception("[DiscordBot] Failed to connect to voice channel")
                        try:
                            await interaction.followup.send(
                                f"❌ Failed to connect to voice channel: {type(e).__name__}",
                                ephemeral=True
                            )
                        except Exception:
                            pass
                        return
            except Exception as e:
                logging.exception(f"[DiscordBot] Unexpected error before voice connection")
                try:
                    await interaction.followup.send("❌ An unexpected error occurred.", ephemeral=True)
                except Exception:
                    pass
                return

           
            BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:8000"
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{BACKEND_URL}/api/pjesme/pjesma/search?q={naziv}") as resp:
                        if resp.status == 200:
                            pjesme = await resp.json()
                            pjesma = next((p for p in pjesme if p['naziv'].lower() == naziv.lower()), None)
                            if pjesma and pjesma.get('putanjaAudio'):
                                url = pjesma['putanjaAudio']
                                trajanje = pjesma.get('trajanjeSekunde', 0)
                                artist_names: list[str] = []
                                try:
                                    async with session.get(f"{BACKEND_URL}/api/izvodjac_pjesma/") as rel_resp:
                                        if rel_resp.status == 200:
                                            veze = await rel_resp.json()
                                            song_veze = [v for v in veze if v.get('pjesmaID') == pjesma.get('id')]
                                            async def fetch_artist(v):
                                                izvodjac_id = v.get('izvodjacID')
                                                if not izvodjac_id:
                                                    return None
                                                async with session.get(f"{BACKEND_URL}/api/korisnici/{izvodjac_id}") as art_resp:
                                                    if art_resp.status == 200:
                                                        korisnik = await art_resp.json()
                                                        return korisnik.get('korisnicko_ime')
                                                    return None
                                            artist_results = await asyncio.gather(*[fetch_artist(v) for v in song_veze])
                                            artist_names = [name for name in artist_results if name]
                                except Exception as e:
                                    logging.exception("[DiscordBot] Failed to fetch artists for play command")
                                if not artist_names:
                                    artist_names = ["Nepoznati izvođač"]
                                izvodjac_ime = " & ".join(artist_names)

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
                                    
                                    # @discord.ui.button(label="\u23F8", style=discord.ButtonStyle.secondary, custom_id="pause_btn")
                                    # async def pause_btn(self, button: Button, interaction2: discord.Interaction):
                                    #     voice_client = discord.utils.get(interaction2.client.voice_clients, guild=interaction2.guild)
                                    #     if voice_client and voice_client.is_playing():
                                    #         voice_client.pause()
                                    #         self.paused = True
                                    #         button.label = "\u25B6"
                                    #         # Defer if not already responded
                                    #         if not interaction2.response.is_done():
                                    #             await interaction2.response.defer()
                                    #         await interaction2.response.edit_message(view=self)
                                    #     elif voice_client and voice_client.is_paused():
                                    #         voice_client.resume()
                                    #         self.paused = False
                                    #         button.label = "\u23F8"
                                    #         if not interaction2.response.is_done():
                                    #             await interaction2.response.defer()
                                    #         await interaction2.response.edit_message(view=self)
                                    
                                    # @discord.ui.button(label="\u23ED", style=discord.ButtonStyle.secondary, custom_id="skip_btn")
                                    # async def skip_btn(self, button: Button, interaction2: discord.Interaction):
                                    #     voice_client = discord.utils.get(interaction2.client.voice_clients, guild=interaction2.guild)
                                    #     if voice_client and (voice_client.is_playing() or voice_client.is_paused()):
                                    #         voice_client.stop()
                                    #     if not interaction2.response.is_done():
                                    #         await interaction2.response.defer()
                                    #     await interaction2.response.edit_message(view=self)
                                    
                                    # @discord.ui.button(label="\u23F9", style=discord.ButtonStyle.danger, custom_id="stop_btn")
                                    # async def stop_btn(self, button: Button, interaction2: discord.Interaction):
                                    #     voice_client = discord.utils.get(interaction2.client.voice_clients, guild=interaction2.guild)
                                    #     if voice_client:
                                    #         if voice_client.is_playing() or voice_client.is_paused():
                                    #             voice_client.stop()
                                    #         await voice_client.disconnect()
                                    #     if not interaction2.response.is_done():
                                    #         await interaction2.response.defer()
                                    #     await interaction2.response.edit_message(view=self)
                                
                                try:
                                    if not is_vc_connected(voice_client):
                                        try:
                                            voice_client = await channel.connect(timeout=15, reconnect=True)
                                        except Exception as e:
                                            logging.exception("[DiscordBot] Could not reconnect before playback")
                                            try:
                                                await interaction.followup.send(
                                                    f"❌ Cannot start playback - voice connection issue: {type(e).__name__}",
                                                    ephemeral=True
                                                )
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
                                
                                except discord.errors.ClientException as ce:
                                    logging.exception("[DiscordBot] ClientException during playback")
                                    try:
                                        await interaction.followup.send("❌ Bot is not connected to voice.", ephemeral=True)
                                    except Exception:
                                        pass
                                except Exception as e:
                                    logging.exception("[DiscordBot] Error during playback")
                                    try:
                                        await interaction.followup.send(f"❌ Playback error: {type(e).__name__}", ephemeral=True)
                                    except Exception:
                                        pass
                                
                                if voice_client:
                                    voice_client.last_active = datetime.datetime.utcnow()
                                return
            except Exception as e:
                logging.exception("[DiscordBot] Error in play_command")
                try:
                    await interaction.followup.send(f"❌ Error: {type(e).__name__}", ephemeral=True)
                except Exception:
                    pass
                return

            try:
                await interaction.followup.send("🎵 Song not found!", ephemeral=True)
            except Exception:
                pass


        async def link_command(
            interaction: discord.Interaction,
            kod: str
        ):
            try:
                async with aiohttp.ClientSession() as session:

                    async with session.post(
                        f"{BACKEND_URL}/api/discordlink/link",
                        params={
                            "kod": kod,
                            "discord_id": str(interaction.user.id)
                        }
                    ) as resp:

                        if resp.status == 200:
                            await interaction.response.send_message(
                                "✅ Discord account successfully linked! You can now use the music commands.\n\nIf you want to unlink, use the command `/unlink` and follow the instructions.",
                                ephemeral=True
                            )
                        else:
                            data = await resp.json()

                            await interaction.response.send_message(
                                f"❌ {data.get('detail', 'Unknown error')}",
                                ephemeral=True
                            )

            except Exception:
                await interaction.response.send_message(
                    "❌ Error while connecting your account.",
                    ephemeral=True
                )

        async def skip_command(interaction: discord.Interaction):
            korisnik = await provjeri_pristup(interaction)

            if not korisnik:
                return
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
            korisnik = await provjeri_pristup(interaction)

            if not korisnik:
                return
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client and voice_client.is_playing():
                voice_client.pause()
                await interaction.response.send_message("Paused!", ephemeral=False)
            else:
                await interaction.response.send_message("There is no song to pause!", ephemeral=True)

        async def unpause_command(interaction: discord.Interaction):
            korisnik = await provjeri_pristup(interaction)

            if not korisnik:
                return
            voice_client = discord.utils.get(self.voice_clients, guild=interaction.guild)
            if voice_client and voice_client.is_paused():
                voice_client.resume()
                await interaction.response.send_message("Unpaused!", ephemeral=False)
            else:
                await interaction.response.send_message("There is no paused song!", ephemeral=True)

        async def dis_command(interaction: discord.Interaction):
            korisnik = await provjeri_pristup(interaction)

            if not korisnik:
                return
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
            self.tree.command(
                name="link",
                description="Connect your Decibel account with Discord (one-time, 5 minute code)",
                guild=discord.Object(id=guild_id)
            )(
                app_commands.describe(
                    kod="The code you received from the Decibel website (valid for 5 minutes)"
                )(link_command)
            )
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

