from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.StatistikaReprodukcije import StatistikaReprodukcije, StatistikaReprodukcijeCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.StatistikaReprodukcijeKontroler import (
    get_all_statistika,
    get_statistika_by_id,
    create_statistika,
    delete_statistika
)

router = APIRouter(prefix="/api/statistika", tags=["StatistikaReprodukcije"])

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

@router.get("/", response_model=List[StatistikaReprodukcije])
async def sve_statistike(session: AsyncSession = Depends(get_session)):
    return await get_all_statistika(session)

@router.get("/{statistika_id}", response_model=StatistikaReprodukcije)
async def get_statistika(statistika_id: int, session: AsyncSession = Depends(get_session)):
    obj = await get_statistika_by_id(session, statistika_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Statistika nije pronađena")
    return obj

@router.post("/", response_model=StatistikaReprodukcije)
async def nova_statistika(data: StatistikaReprodukcijeCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_statistika(session, data)
    return db_obj

@router.delete("/{statistika_id}", response_model=StatistikaReprodukcije)
async def obrisi_statistiku(statistika_id: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_statistika(session, statistika_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Statistika nije pronađena")
    return db_obj
