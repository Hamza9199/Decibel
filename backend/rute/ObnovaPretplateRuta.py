from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.ObnovaPretplate import ObnovaPretplate, ObnovaPretplateCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.ObnovaPretplateKontroler import (
    get_all_obnove,
    get_obnova_by_id,
    create_obnova,
    delete_obnova
)

router = APIRouter(prefix="/api/obnove_pretplate", tags=["ObnovaPretplate"])

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

@router.get("/", response_model=List[ObnovaPretplate])
async def sve_obnove(session: AsyncSession = Depends(get_session)):
    return await get_all_obnove(session)

@router.get("/{obnova_id}", response_model=ObnovaPretplate)
async def get_obnova(obnova_id: int, session: AsyncSession = Depends(get_session)):
    obj = await get_obnova_by_id(session, obnova_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Obnova nije pronađena")
    return obj

@router.post("/", response_model=ObnovaPretplate)
async def nova_obnova(data: ObnovaPretplateCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_obnova(session, data)
    return db_obj

@router.delete("/{obnova_id}", response_model=ObnovaPretplate)
async def obrisi_obnovu(obnova_id: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_obnova(session, obnova_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Obnova nije pronađena")
    return db_obj
