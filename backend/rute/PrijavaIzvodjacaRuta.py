from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
from modeli.PrijavaIzvodjaca import PrijavaIzvodjaca, PrijavaIzvodjacaCreate
from kontroleri.PrijavaIzvodjacaKontroler import (
    get_all_prijave,
    get_prijava_by_id,
    create_prijava,
    delete_prijava
)

router = APIRouter(prefix="/api/prijave_izvodjaca", tags=["Prijave izvodjaca"])

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

@router.get("/", response_model=List[PrijavaIzvodjaca])
async def sve_prijave(session: AsyncSession = Depends(get_session)):
    return await get_all_prijave(session)

@router.get("/{prijava_id}", response_model=PrijavaIzvodjaca)
async def get_prijava(prijava_id: str, session: AsyncSession = Depends(get_session)):
    prijava = await get_prijava_by_id(session, prijava_id)
    if not prijava:
        raise HTTPException(status_code=404, detail="Prijava nije pronađena")
    return prijava

@router.post("/", response_model=PrijavaIzvodjaca)
async def nova_prijava(data: PrijavaIzvodjacaCreate, session: AsyncSession = Depends(get_session)):
    obj = await create_prijava(session, data)
    return obj

@router.delete("/{prijava_id}", response_model=PrijavaIzvodjaca)
async def obrisi_prijavu(prijava_id: str, session: AsyncSession = Depends(get_session)):
    obj = await delete_prijava(session, prijava_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Prijava nije pronađena")
    return obj
