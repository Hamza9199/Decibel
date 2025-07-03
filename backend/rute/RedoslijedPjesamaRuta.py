from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.RedoslijedPjesama import RedoslijedPjesama, RedoslijedPjesamaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.RedoslijedPjesamaKontroler import (
    get_all_redoslijed,
    get_redoslijed_by_id,
    create_redoslijed,
    delete_redoslijed
)

router = APIRouter(prefix="/api/redoslijed_pjesama", tags=["RedoslijedPjesama"])

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

@router.get("/", response_model=List[RedoslijedPjesama])
async def svi_redoslijed(session: AsyncSession = Depends(get_session)):
    return await get_all_redoslijed(session)

@router.get("/{redoslijedPjesama}", response_model=RedoslijedPjesama)
async def get_redoslijed(redoslijedPjesama: int, session: AsyncSession = Depends(get_session)):
    obj = await get_redoslijed_by_id(session, redoslijedPjesama)
    if not obj:
        raise HTTPException(status_code=404, detail="Redoslijed nije pronađen")
    return obj

@router.post("/", response_model=RedoslijedPjesama)
async def novi_redoslijed(data: RedoslijedPjesamaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_redoslijed(session, data)
    return db_obj

@router.delete("/{redoslijedPjesama}", response_model=RedoslijedPjesama)
async def obrisi_redoslijed(redoslijedPjesama: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_redoslijed(session, redoslijedPjesama)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Redoslijed nije pronađen")
    return db_obj
