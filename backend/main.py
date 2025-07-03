import os
from typing import List
from uuid import UUID, uuid4
from fastapi import FastAPI
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from databases import Database
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import threading
import requests

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
from rute.RedoslijedPjesamaRuta import router as redoslijed_pjesama_router
from rute.StatistikaReprodukcijeRuta import router as statistika_reprodukcije_router
from rute.PretplataRuta import router as pretplata_router
from rute.KorisnikPretplataRuta import router as korisnik_pretplata_router
from rute.ObnovaPretplateRuta import router as obnova_pretplate_router
from rute.AlbumRuta import router as album_router
from rute.PlaylistaRuta import router as playlista_router
from rute.PratilacKorisnikRuta import router as pratilac_korisnik_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:5173", "https://decibel-three.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    create_tables()  
    await database.connect()

    def keep_alive():
        import time
        url = os.getenv("KEEP_ALIVE_URL") or "http://localhost:8000/"
        while True:
            try:
                requests.get(url, timeout=10)
            except Exception:
                pass
            time.sleep(120)  # 2 minute

    threading.Thread(target=keep_alive, daemon=True).start()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/")
async def root():
    return {"message": "Server radi!"}

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
app.include_router(redoslijed_pjesama_router)
app.include_router(statistika_reprodukcije_router)
app.include_router(pretplata_router)
app.include_router(korisnik_pretplata_router)
app.include_router(obnova_pretplate_router)
app.include_router(pratilac_korisnik_router)








