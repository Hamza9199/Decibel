from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.IzvodjacPjesma import IzvodjacPjesma, IzvodjacPjesmaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.IzvodjacPjesmaKontroler import (
    get_all_izvodjac_pjesma,
    get_izvodjac_pjesma,
    create_izvodjac_pjesma,
    delete_izvodjac_pjesma
)

router = APIRouter(prefix="/api/izvodjac_pjesma", tags=["IzvodjacPjesma"])

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

@router.get("/", response_model=List[IzvodjacPjesma])
async def svi_izvodjac_pjesma(session: AsyncSession = Depends(get_session)):
    return await get_all_izvodjac_pjesma(session)

@router.get("/{izvodjacID}/{pjesmaID}", response_model=IzvodjacPjesma)
async def get_veza(izvodjacID: str, pjesmaID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_izvodjac_pjesma(session, izvodjacID, pjesmaID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=IzvodjacPjesma)
async def nova_izvodjac_pjesma(data: IzvodjacPjesmaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_izvodjac_pjesma(session, data)
    return db_obj

@router.delete("/{izvodjacID}/{pjesmaID}", response_model=IzvodjacPjesma)
async def obrisi_vezu(izvodjacID: str, pjesmaID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_izvodjac_pjesma(session, izvodjacID, pjesmaID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj
