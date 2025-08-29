import os
from typing import List
from uuid import UUID, uuid4
from fastapi import FastAPI, Request, HTTPException
from sqlalchemy import create_engine, MetaData, select
from sqlalchemy.orm import sessionmaker, declarative_base
from databases import Database
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import threading
import requests
import datetime
import time
from pydantic import BaseModel
from dotenv import load_dotenv

from modeli.Korisnik import Korisnik
from modeli.KorisnikRole import KorisnikRole as Role
from servisi.Baza import database, create_tables, delete_tables  
from rute.KorisnikRuta import router as korisnik_router
from rute.PjesmaRuta import router as pjesma_router
from rute.HistorijaSlusanjaRuta import router as historija_router
from rute.KomentarRuta import router as komentar_router
from rute.IzvodjacPjesmaRuta import router as izvodjac_pjesma_router
from rute.KorisnikAlbumRuta import router as korisnik_album_router
from rute.KorisnikPjesmaRuta import router as korisnik_pjesma_router
from rute.KorisnikPlaylistaRuta import router as korisnik_playlista_router
from rute.PjesmaPlaylistaRuta import router as pjesma_playlista_router
from rute.StatistikaReprodukcijeRuta import router as statistika_reprodukcije_router
from rute.PretplataRuta import router as pretplata_router
from rute.KorisnikPretplataRuta import router as korisnik_pretplata_router
from rute.ObnovaPretplateRuta import router as obnova_pretplate_router
from rute.AlbumRuta import router as album_router
from rute.PlaylistaRuta import router as playlista_router
from rute.PratilacKorisnikRuta import router as pratilac_korisnik_router
from rute.PrijavaIzvodjacaRuta import router as prijava_izvodjaca_router
from rute.SuspendovanKorisnikRuta import router as suspendovan_korisnik_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:5173", "https://deccibel.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

DISCORD_BOT_TOKEN = os.getenv("TOKEN")


@app.on_event("startup")
async def startup():
    create_tables()  
    await database.connect()

    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.asyncio import create_async_engine
    from modeli.SuspendovanKorisnik import SuspendovanKorisnikORM
    from modeli.Korisnik import KorisnikORM
    from modeli.KorisnikStatus import KorisnikStatusEnum

    ASYNC_DATABASE_URL = os.getenv("DATABASE_URL_ASYNC")
    engine = create_async_engine(
        ASYNC_DATABASE_URL, echo=False, future=True
    )
    AsyncSessionLocal = sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async def check_and_update_suspended_users():
        while True:
            async with AsyncSessionLocal() as session:
                now = datetime.datetime.utcnow()
                suspendovani = await session.execute(
                    select(SuspendovanKorisnikORM).where(SuspendovanKorisnikORM.vrijemeDo <= now)
                )
                suspendovani_list = suspendovani.scalars().all()
                for sus in suspendovani_list:
                    korisnik = await session.get(KorisnikORM, sus.korisnikID)
                    if korisnik and korisnik.statusKorisnika == KorisnikStatusEnum.suspendovan:
                        korisnik.statusKorisnika = KorisnikStatusEnum.aktivan
                        session.add(korisnik)
                    await session.delete(sus)
                if suspendovani_list:
                    await session.commit()
            await asyncio.sleep(60)  

    asyncio.create_task(check_and_update_suspended_users())

    def keep_alive():
        import time
        url = os.getenv("KEEP_ALIVE_URL") or "http://localhost:8000/"
        while True:
            try:
                requests.get(url, timeout=10)
                print(f"Keep-alive request sent to {url}")
            except Exception:
                pass
            time.sleep(60)  

    threading.Thread(target=keep_alive, daemon=True).start()

    def auto_cleanup():
        while True:
            try:
                print("[AutoCleanup] Pokrećem čišćenje servera...")
                import glob, os
                for f in glob.glob("/tmp/*"):
                    try:
                        os.remove(f)
                    except Exception:
                        pass
            except Exception as e:
                print("[AutoCleanup] Greška:", e)
            time.sleep(60 * 30 * 1)

    threading.Thread(target=auto_cleanup, daemon=True).start()



   
@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/")
async def root():
    return {"message": "Server radi!"}

class TokenCheckRequest(BaseModel):
    token: str

@app.post("/discord/check_token")
async def discord_check_token(data: TokenCheckRequest):
    """Provjeri validnost Discord bot tokena"""
    import httpx
    headers = {"Authorization": f"Bot {data.token}"}
    async with httpx.AsyncClient() as client:
        r = await client.get("https://discord.com/api/v10/users/@me", headers=headers)
        return {"valid": r.status_code == 200}

class CommandRequest(BaseModel):
    token: str
    guild_id: str
    command: str

@app.post("/discord/send_command")
async def discord_send_command(data: CommandRequest):
    return {"status": "ok", "message": f"Command '{data.command}' sent to guild {data.guild_id}"}

@app.get("/discord/bot_invite")
async def discord_bot_invite():
    """Vrati invite link za Discord bota iz .env"""
    import httpx
    if not DISCORD_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token nije definisan u .env")
    headers = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}"}
    async with httpx.AsyncClient() as client:
        r = await client.get("https://discord.com/api/v10/users/@me", headers=headers)
        if r.status_code != 200:
            raise HTTPException(status_code=500, detail="Ne mogu dohvatiti bot user info. Provjeri token.")
        user = r.json()
        bot_id = user.get("id")
        if not bot_id:
            raise HTTPException(status_code=500, detail="Nije pronađen bot ID.")
        invite_url = f"https://discord.com/api/oauth2/authorize?client_id={bot_id}&scope=bot%20applications.commands"
        return {"bot_id": bot_id, "invite_url": invite_url}

app.include_router(korisnik_router)
app.include_router(pjesma_router)
app.include_router(album_router)
app.include_router(playlista_router)
app.include_router(historija_router)
app.include_router(komentar_router)
app.include_router(izvodjac_pjesma_router)
app.include_router(korisnik_album_router)
app.include_router(korisnik_pjesma_router)
app.include_router(korisnik_playlista_router)
app.include_router(pjesma_playlista_router)
app.include_router(statistika_reprodukcije_router)
app.include_router(pretplata_router)
app.include_router(korisnik_pretplata_router)
app.include_router(obnova_pretplate_router)
app.include_router(pratilac_korisnik_router)
app.include_router(prijava_izvodjaca_router)
app.include_router(suspendovan_korisnik_router)









