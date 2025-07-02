from typing import List
from uuid import UUID, uuid4
from fastapi import FastAPI
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from databases import Database
from fastapi.middleware.cors import CORSMiddleware

from modeli.Korisnik import Korisnik
from modeli.KorisnikRole import KorisnikRole as Role
from servisi.Baza import database, create_tables, delete_tables  
from rute.KorisnikRuta import router as korisnik_router
from rute.PjesmaRuta import router as pjesma_router

app = FastAPI()

# Dodaj CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ili npr. ["http://localhost:5173"] za veću sigurnost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    create_tables()  
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/")
async def root():
    return {"message": "Server radi!"}

app.include_router(korisnik_router)
app.include_router(pjesma_router)








