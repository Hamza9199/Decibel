import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv
from sqlalchemy.orm import selectinload

from modeli.PretplataStatus import PretplataStatusEnum
from modeli.KorisnikPretplata import KorisnikPretplata, KorisnikPretplataCreate
from modeli.KorisnikPretplata import KorisnikPretplataORM  # Dodaj import ORM klase
from modeli.Pretplata import PretplataORM  
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.KorisnikPretplataKontroler import (
    get_all_korisnik_pretplata,
    get_korisnik_pretplata_by_id,
    create_korisnik_pretplata,
    delete_korisnik_pretplata,
    get_korisnik_pretplata_by_korisnik_id

)

router = APIRouter(prefix="/api/korisnik_pretplata", tags=["KorisnikPretplata"])

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

@router.get("/", response_model=List[KorisnikPretplata])
async def sve_korisnik_pretplate(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(KorisnikPretplataORM).options(selectinload(KorisnikPretplataORM.pretplata))
    )
    return result.scalars().all()

@router.get("/{korisnik_pretplata_id}", response_model=KorisnikPretplata)
async def get_korisnik_pretplata(korisnik_pretplata_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(KorisnikPretplataORM).options(selectinload(KorisnikPretplataORM.pretplata)).where(KorisnikPretplataORM.id == korisnik_pretplata_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="KorisnikPretplata nije pronađena")
    return obj

@router.get("/korisnik/{korisnik_id}", response_model=KorisnikPretplata)
async def get_korisnik_pretplata_by_korisnik_id(korisnik_id: str, session: AsyncSession = Depends(get_session)):
    result = await get_korisnik_pretplata_by_korisnik_id(session, korisnik_id)
    if not result:
        raise HTTPException(status_code=404, detail="KorisnikPretplata nije pronađena za dati korisnikID")
    
    validna = (
        result.pretplataStatus
        and result.datumIsteka
        and result.datumIsteka > datetime.datetime.utcnow()
    )

    if not validna:
        return KorisnikPretplata(
            id=result.id,
            korisnikID=result.korisnikID,
            pretplataID=result.pretplataID,
            datumKupovine=result.datumKupovine,
            datumIsteka=result.datumIsteka,
            pretplataStatus= PretplataStatusEnum.istekla,  
            pretplata=None
        )
    
    return result

   

@router.post("/", response_model=KorisnikPretplata)
async def nova_korisnik_pretplata(data: KorisnikPretplataCreate, session: AsyncSession = Depends(get_session)):
    print("Primljen payload:", data)
    try:
        db_obj = await create_korisnik_pretplata(session, data)
        return db_obj
    except Exception as e:
        import traceback
        print("GRESKA:", e)
        traceback.print_exc()
        raise

@router.delete("/{korisnik_pretplata_id}", response_model=KorisnikPretplata)
async def obrisi_korisnik_pretplatu(korisnik_pretplata_id: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_korisnik_pretplata(session, korisnik_pretplata_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="KorisnikPretplata nije pronađena")
    return db_obj
