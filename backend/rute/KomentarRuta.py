from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.Komentar import Komentar, KomentarCreate, KomentarUpdate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.KomentarKontroler import (
    get_all_komentari,
    get_komentar_by_id,
    create_komentar,
    delete_komentar
)

router = APIRouter(prefix="/api/komentari", tags=["Komentari"])

load_dotenv()
ASYNC_DATABASE_URL = os.getenv("DATABASE_URL_ASYNC")

engine = create_async_engine(
    ASYNC_DATABASE_URL, echo=True, future=True
)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

from typing import AsyncGenerator
from kontroleri.KomentarKontroler import update_komentar

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/", response_model=List[Komentar])
async def svi_komentari(session: AsyncSession = Depends(get_session)):
    return await get_all_komentari(session)

@router.get("/{komentar_id}", response_model=Komentar)
async def get_komentar(komentar_id: int, session: AsyncSession = Depends(get_session)):
    komentar = await get_komentar_by_id(session, komentar_id)
    if not komentar:
        raise HTTPException(status_code=404, detail="Komentar nije pronađen")
    return komentar

@router.post("/", response_model=Komentar)
async def novi_komentar(data: KomentarCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_komentar(session, data)
    return db_obj

@router.put("/{komentar_id}", response_model=Komentar)
async def azuriraj_komentar(
    komentar_id: int,
    data: KomentarUpdate,
    session: AsyncSession = Depends(get_session)
):
    db_obj = await update_komentar(session, komentar_id, data)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Komentar nije pronađen")
    return db_obj

@router.delete("/{komentar_id}", response_model=Komentar)
async def obrisi_komentar(komentar_id: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_komentar(session, komentar_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Komentar nije pronađen")
    return db_obj
