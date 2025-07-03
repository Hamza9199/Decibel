from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.Pretplata import Pretplata, PretplataCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.PretplataKontroler import (
    get_all_pretplate,
    get_pretplata_by_id,
    create_pretplata,
    update_pretplata,
    delete_pretplata
)

router = APIRouter(prefix="/api/pretplate", tags=["Pretplate"])

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

@router.get("/", response_model=List[Pretplata])
async def sve_pretplate(session: AsyncSession = Depends(get_session)):
    return await get_all_pretplate(session)

@router.get("/{pretplata_id}", response_model=Pretplata)
async def get_pretplata(pretplata_id: int, session: AsyncSession = Depends(get_session)):
    obj = await get_pretplata_by_id(session, pretplata_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Pretplata nije pronađena")
    return obj

@router.post("/", response_model=Pretplata)
async def nova_pretplata(data: PretplataCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_pretplata(session, data)
    return db_obj

@router.put("/{pretplata_id}", response_model=Pretplata)
async def izmeni_pretplatu(pretplata_id: int, data: PretplataCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await update_pretplata(session, pretplata_id, data)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Pretplata nije pronađena")
    return db_obj

@router.delete("/{pretplata_id}", response_model=Pretplata)
async def obrisi_pretplatu(pretplata_id: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_pretplata(session, pretplata_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Pretplata nije pronađena")
    return db_obj
