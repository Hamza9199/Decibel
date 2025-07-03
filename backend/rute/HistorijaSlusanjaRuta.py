from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.HistorijaSlusanja import HistorijaSlusanja, HistorijaSlusanjaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.HistorijaSlusanjaKontroler import (
    get_all_historija,
    get_historija_by_id,
    create_historija,
    delete_historija
)

router = APIRouter(prefix="/api/historija", tags=["Historija slusanja"])

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

@router.get("/", response_model=List[HistorijaSlusanja])
async def sve_historije(session: AsyncSession = Depends(get_session)):
    return await get_all_historija(session)

@router.get("/{historija_id}", response_model=HistorijaSlusanja)
async def get_historija(historija_id: int, session: AsyncSession = Depends(get_session)):
    historija = await get_historija_by_id(session, historija_id)
    if not historija:
        raise HTTPException(status_code=404, detail="Historija nije pronađena")
    return historija

@router.post("/", response_model=HistorijaSlusanja)
async def nova_historija(data: HistorijaSlusanjaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_historija(session, data)
    return db_obj

@router.delete("/{historija_id}", response_model=HistorijaSlusanja)
async def obrisi_historiju(historija_id: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_historija(session, historija_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Historija nije pronađena")
    return db_obj
