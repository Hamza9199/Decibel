from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.KorisnikPjesma import KorisnikPjesma, KorisnikPjesmaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from modeli.Pjesma import Pjesma
from modeli.Korisnik import Korisnik
from kontroleri.KorisnikPjesmaKontroler import (
    get_all_korisnik_pjesma,
    get_all_korisnik_pjesma2,
    get_korisnik_pjesma,
    create_korisnik_pjesma,
    delete_korisnik_pjesma
)

router = APIRouter(prefix="/api/korisnik_pjesma", tags=["KorisnikPjesma"])

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

@router.get("/", response_model=List[KorisnikPjesma])
async def svi_korisnik_pjesma(session: AsyncSession = Depends(get_session)):
    return await get_all_korisnik_pjesma(session)

@router.get("/korisnik/{korisnikID}", response_model=List[KorisnikPjesma])
async def get_korisnik_pjesme(korisnikID: str, session: AsyncSession = Depends(get_session)):
    pjesme_veze = await get_all_korisnik_pjesma2(session=session, korisnikID=korisnikID)
    if not pjesme_veze:
        raise HTTPException(status_code=404, detail="Nema pjesama za ovog korisnika")
    pjesma_ids = [v.pjesmaID for v in pjesme_veze]
    if pjesma_ids:
        from sqlalchemy.future import select
        from modeli.Pjesma import PjesmaORM
        from modeli.Korisnik import KorisnikORM
        pjesme_query = await session.execute(select(PjesmaORM).where(PjesmaORM.id.in_(pjesma_ids)))
        pjesme_map = {p.id: p for p in pjesme_query.scalars().all()}
        korisnik_ids = list(set([p.korisnikID for p in pjesme_map.values() if p.korisnikID]))
        korisnici_query = await session.execute(select(KorisnikORM).where(KorisnikORM.id.in_(korisnik_ids)))
        korisnici_map = {k.id: k for k in korisnici_query.scalars().all()}
    else:
        pjesme_map = {}
        korisnici_map = {}
    enriched = []
    for v in pjesme_veze:
        pjesma_obj = pjesme_map.get(v.pjesmaID)
        korisnik_obj = korisnici_map.get(pjesma_obj.korisnikID) if pjesma_obj and pjesma_obj.korisnikID else None
        v_dict = v.__dict__.copy()
        v_dict['pjesma'] = Pjesma.from_orm(pjesma_obj) if pjesma_obj else None
        v_dict['korisnik'] = Korisnik.from_orm(korisnik_obj) if korisnik_obj else None
        enriched.append(KorisnikPjesma(**v_dict))
    return enriched

@router.get("/{korisnikID}/{pjesmaID}")
async def get_veza(korisnikID: str, pjesmaID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_korisnik_pjesma(session, korisnikID, pjesmaID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return {
        "liked": veza is not None
    }

@router.post("/", response_model=KorisnikPjesma)
async def nova_korisnik_pjesma(data: KorisnikPjesmaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_korisnik_pjesma(session, data)
    return db_obj

@router.delete("/{korisnikID}/{pjesmaID}", response_model=KorisnikPjesma)
async def obrisi_vezu(korisnikID: str, pjesmaID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_korisnik_pjesma(session, korisnikID, pjesmaID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj

