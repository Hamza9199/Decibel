from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
import os
from dotenv import load_dotenv

from modeli.Korisnik import Korisnik, KorisnikCreate
from servisi.Baza import database
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.KorisnikKontroler import (
    get_all_korisnici,
    register_korisnik,
    login_korisnik,
    get_korisnik_by_id,
    update_korisnik,
    delete_korisnik
)

router = APIRouter(prefix="/api/korisnici", tags=["Korisnici"])

load_dotenv()
ASYNC_DATABASE_URL = os.getenv("DATABASE_URL_ASYNC")

# Kreiraj async session maker
engine = create_async_engine(
    ASYNC_DATABASE_URL, echo=True, future=True
)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

from typing import AsyncGenerator

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/", response_model=List[Korisnik])
async def svi_korisnici(session: AsyncSession = Depends(get_session)):
    korisnici = await get_all_korisnici(session)
    return korisnici

@router.post("/register", response_model=Korisnik)
async def register(korisnik: KorisnikCreate, session: AsyncSession = Depends(get_session)):
    db_korisnik = await register_korisnik(session, korisnik)
    return db_korisnik

@router.post("/login", response_model=Korisnik)
async def login(email: str, lozinka: str, session: AsyncSession = Depends(get_session)):
    korisnik = await login_korisnik(session, email, lozinka)
    if not korisnik:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Pogrešan email ili lozinka")
    return korisnik

@router.get("/{korisnik_id}", response_model=Korisnik)
async def get_korisnik(korisnik_id: str, session: AsyncSession = Depends(get_session)):
    korisnik = await get_korisnik_by_id(session, korisnik_id)
    if not korisnik:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    return korisnik

@router.put("/{korisnik_id}", response_model=Korisnik)
async def update(korisnik_id: str, korisnik: KorisnikCreate, session: AsyncSession = Depends(get_session)):
    db_korisnik = await update_korisnik(session, korisnik_id, korisnik)
    if not db_korisnik:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    return db_korisnik

@router.delete("/{korisnik_id}", response_model=Korisnik)
async def delete(korisnik_id: str, session: AsyncSession = Depends(get_session)):
    db_korisnik = await delete_korisnik(session, korisnik_id)
    if not db_korisnik:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    return db_korisnik
