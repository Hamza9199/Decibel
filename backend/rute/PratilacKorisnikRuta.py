from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.PratilacKorisnik import PratilacKorisnik, PratilacKorisnikCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.PratilacKorisnikKontroler import (
    get_all_pratioci,
    get_pratilac_korisnik,
    create_pratilac_korisnik,
    delete_pratilac_korisnik
)

router = APIRouter(prefix="/api/pratioci", tags=["Pratioci"])

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

@router.get("/", response_model=List[PratilacKorisnik])
async def svi_pratioci(session: AsyncSession = Depends(get_session)):
    return await get_all_pratioci(session)

@router.get("/{korisnikID}/{pratilacID}", response_model=PratilacKorisnik)
async def get_veza(korisnikID: str, pratilacID: str, session: AsyncSession = Depends(get_session)):
    veza = await get_pratilac_korisnik(session, korisnikID, pratilacID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=PratilacKorisnik)
async def novi_pratilac_korisnik(data: PratilacKorisnikCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_pratilac_korisnik(session, data)
    return db_obj

@router.delete("/{korisnikID}/{pratilacID}", response_model=PratilacKorisnik)
async def obrisi_vezu(korisnikID: str, pratilacID: str, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_pratilac_korisnik(session, korisnikID, pratilacID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj


@router.get("/korisnik/{korisnikID}", response_model=List[PratilacKorisnik])
async def get_all_pratioci_by_korisnik(korisnikID: str, session: AsyncSession = Depends(get_session)):
    pratioci = await get_all_pratioci_by_korisnik(session, korisnikID)
    if not pratioci:
        raise HTTPException(status_code=404, detail="Nema pratilaca za ovog korisnika")
    return pratioci
