from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.KorisnikPlaylista import KorisnikPlaylista, KorisnikPlaylistaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.KorisnikPlaylistaKontroler import (
    get_all_korisnik_playlista,
    get_korisnik_playlista,
    create_korisnik_playlista,
    delete_korisnik_playlista
)

router = APIRouter(prefix="/api/korisnik_playlista", tags=["KorisnikPlaylista"])

load_dotenv()
ASYNC_DATABASE_URL = os.getenv("DATABASE_URL_ASYNC")

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

@router.get("/", response_model=List[KorisnikPlaylista])
async def svi_korisnik_playlista(session: AsyncSession = Depends(get_session)):
    return await get_all_korisnik_playlista(session)

@router.get("/{korisnikID}/{playlistaID}", response_model=KorisnikPlaylista)
async def get_veza(korisnikID: str, playlistaID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_korisnik_playlista(session, korisnikID, playlistaID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=KorisnikPlaylista)
async def nova_korisnik_playlista(data: KorisnikPlaylistaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_korisnik_playlista(session, data)
    return db_obj

@router.delete("/{korisnikID}/{playlistaID}", response_model=KorisnikPlaylista)
async def obrisi_vezu(korisnikID: str, playlistaID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_korisnik_playlista(session, korisnikID, playlistaID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj
