from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.PjesmaPlaylista import PjesmaPlaylista, PjesmaPlaylistaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.PjesmaPlaylistaKontroler import (
    get_all_pjesma_playlista,
    get_pjesma_playlista,
    create_pjesma_playlista,
    delete_pjesma_playlista
)

router = APIRouter(prefix="/api/pjesma_playlista", tags=["PjesmaPlaylista"])

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

@router.get("/", response_model=List[PjesmaPlaylista])
async def sve_pjesma_playlista(session: AsyncSession = Depends(get_session)):
    return await get_all_pjesma_playlista(session)

@router.get("/{pjesmaID}/{playlistaID}", response_model=PjesmaPlaylista)
async def get_veza(pjesmaID: int, playlistaID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_pjesma_playlista(session, pjesmaID, playlistaID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=PjesmaPlaylista)
async def nova_pjesma_playlista(data: PjesmaPlaylistaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_pjesma_playlista(session, data)
    return db_obj

@router.delete("/{pjesmaID}/{playlistaID}", response_model=PjesmaPlaylista)
async def obrisi_vezu(pjesmaID: int, playlistaID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_pjesma_playlista(session, pjesmaID, playlistaID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj
