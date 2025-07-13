from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.SuspendovanKorisnik import SuspendovanKorisnik, SuspendovanKorisnikCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine

from kontroleri.SuspendovanKorisnikKontroler import (
    get_all_suspendovani,
    get_suspendovan_by_id,
    get_suspendovan_by_korisnik_id,
    create_suspendovan,
    update_suspendovan,
    delete_suspendovan
)

router = APIRouter(prefix="/api/suspendovani", tags=["SuspendovaniKorisnici"])

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

@router.get("/", response_model=List[SuspendovanKorisnik])
async def svi_suspendovani(session: AsyncSession = Depends(get_session)):
    return await get_all_suspendovani(session)

@router.get("/{suspendovan_id}", response_model=SuspendovanKorisnik)
async def get_suspendovan(suspendovan_id: int, session: AsyncSession = Depends(get_session)):
    sus = await get_suspendovan_by_id(session, suspendovan_id)
    if not sus:
        raise HTTPException(status_code=404, detail="Suspendovani korisnik nije pronađen")
    return sus

@router.get("/korisnik/{korisnik_id}", response_model=SuspendovanKorisnik)
async def get_suspendovan_by_korisnik(korisnik_id: str, session: AsyncSession = Depends(get_session)):
    sus = await get_suspendovan_by_korisnik_id(session, korisnik_id)
    if not sus:
        raise HTTPException(status_code=404, detail="Suspendovani korisnik nije pronađen")
    return sus

@router.post("/", response_model=SuspendovanKorisnik)
async def novi_suspendovan(suspendovan: SuspendovanKorisnikCreate, session: AsyncSession = Depends(get_session)):
    return await create_suspendovan(session, suspendovan)

@router.put("/{suspendovan_id}", response_model=SuspendovanKorisnik)
async def izmeni_suspendovan(suspendovan_id: int, suspendovan: SuspendovanKorisnikCreate, session: AsyncSession = Depends(get_session)):
    sus = await update_suspendovan(session, suspendovan_id, suspendovan)
    if not sus:
        raise HTTPException(status_code=404, detail="Suspendovani korisnik nije pronađen")
    return sus

@router.delete("/{suspendovan_id}", response_model=SuspendovanKorisnik)
async def obrisi_suspendovan(suspendovan_id: int, session: AsyncSession = Depends(get_session)):
    sus = await delete_suspendovan(session, suspendovan_id)
    if not sus:
        raise HTTPException(status_code=404, detail="Suspendovani korisnik nije pronađen")
    return sus
