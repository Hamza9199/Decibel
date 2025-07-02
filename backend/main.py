from typing import List
from uuid import UUID, uuid4
from fastapi import FastAPI
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from databases import Database

from modeli.Korisnik import Korisnik
from modeli.KorisnikRole import KorisnikRole as Role
from servisi.Baza import database, create_tables  
from rute.KorisnikRuta import router as korisnik_router

app = FastAPI()


@app.on_event("startup")
async def startup():
    create_tables()  # Dodaj ovo za automatsko kreiranje tabela
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/")
async def root():
    return {"message": "Server radi!"}

app.include_router(korisnik_router)








