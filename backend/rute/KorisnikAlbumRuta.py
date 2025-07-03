from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.KorisnikAlbum import KorisnikAlbum, KorisnikAlbumCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.KorisnikAlbumKontroler import (
    get_all_korisnik_album,
    get_korisnik_album,
    create_korisnik_album,
    delete_korisnik_album
)

router = APIRouter(prefix="/api/korisnik_album", tags=["KorisnikAlbum"])

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

@router.get("/", response_model=List[KorisnikAlbum])
async def svi_korisnik_album(session: AsyncSession = Depends(get_session)):
    return await get_all_korisnik_album(session)

@router.get("/{korisnikID}/{albumID}", response_model=KorisnikAlbum)
async def get_veza(korisnikID: str, albumID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_korisnik_album(session, korisnikID, albumID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=KorisnikAlbum)
async def nova_korisnik_album(data: KorisnikAlbumCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_korisnik_album(session, data)
    return db_obj

@router.delete("/{korisnikID}/{albumID}", response_model=KorisnikAlbum)
async def obrisi_vezu(korisnikID: str, albumID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_korisnik_album(session, korisnikID, albumID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj
