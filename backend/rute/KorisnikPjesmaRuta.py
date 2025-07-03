from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.KorisnikPjesma import KorisnikPjesma, KorisnikPjesmaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.KorisnikPjesmaKontroler import (
    get_all_korisnik_pjesma,
    get_korisnik_pjesma,
    create_korisnik_pjesma,
    delete_korisnik_pjesma
)

router = APIRouter(prefix="/api/korisnik_pjesma", tags=["KorisnikPjesma"])

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

@router.get("/", response_model=List[KorisnikPjesma])
async def svi_korisnik_pjesma(session: AsyncSession = Depends(get_session)):
    return await get_all_korisnik_pjesma(session)

@router.get("/{korisnikID}/{pjesmaID}", response_model=KorisnikPjesma)
async def get_veza(korisnikID: str, pjesmaID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_korisnik_pjesma(session, korisnikID, pjesmaID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=KorisnikPjesma)
async def nova_korisnik_pjesma(data: KorisnikPjesmaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_korisnik_pjesma(session, data)
    return db_obj

@router.delete("/{korisnikID}/{pjesmaID}", response_model=KorisnikPjesma)
async def obrisi_vezu(korisnikID: str, pjesmaID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_korisnik_pjesma(session, korisnikID, pjesmaID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj
