from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.KorisnikPlaylista import KorisnikPlaylista, KorisnikPlaylistaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from modeli.Playlista import Playlista
from modeli.Korisnik import Korisnik
from kontroleri.KorisnikPlaylistaKontroler import (
    get_all_korisnik_playlista,
    get_all_korisnik_playlista2,
    get_korisnik_playlista,
    create_korisnik_playlista,
    delete_korisnik_playlista
)

router = APIRouter(prefix="/api/korisnik_playlista", tags=["KorisnikPlaylista"])

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

@router.get("/", response_model=List[KorisnikPlaylista])
async def svi_korisnik_playlista(session: AsyncSession = Depends(get_session)):
    return await get_all_korisnik_playlista(session)

@router.get("/korisnik/{korisnikID}", response_model=List[KorisnikPlaylista])
async def get_playliste_korisnika(korisnikID: str, session: AsyncSession = Depends(get_session)):
    playliste_veze = await get_all_korisnik_playlista2(session=session, korisnikID=korisnikID)
    if not playliste_veze:
        raise HTTPException(status_code=404, detail="Korisnik nema playliste")
    playlista_ids = [v.playlistaID for v in playliste_veze]
    if playlista_ids:
        from sqlalchemy.future import select
        from modeli.Playlista import PlaylistaORM
        from modeli.Korisnik import KorisnikORM
        playliste_query = await session.execute(select(PlaylistaORM).where(PlaylistaORM.id.in_(playlista_ids)))
        playliste_map = {p.id: p for p in playliste_query.scalars().all()}
        korisnik_ids = list(set([p.korisnikID for p in playliste_map.values() if p.korisnikID]))
        korisnici_query = await session.execute(select(KorisnikORM).where(KorisnikORM.id.in_(korisnik_ids)))
        korisnici_map = {k.id: k for k in korisnici_query.scalars().all()}
    else:
        playliste_map = {}
        korisnici_map = {}
    enriched = []
    for v in playliste_veze:
        playlista_obj = playliste_map.get(v.playlistaID)
        korisnik_obj = korisnici_map.get(playlista_obj.korisnikID) if playlista_obj and playlista_obj.korisnikID else None
        v_dict = v.__dict__.copy()
        v_dict['playlista'] = Playlista.from_orm(playlista_obj) if playlista_obj else None
        v_dict['korisnik'] = Korisnik.from_orm(korisnik_obj) if korisnik_obj else None
        enriched.append(KorisnikPlaylista(**v_dict))
    return enriched


@router.get("/{korisnikID}/{playlistaID}", response_model=KorisnikPlaylista)
async def get_veza(korisnikID: str, playlistaID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_korisnik_playlista(session, korisnikID, playlistaID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=KorisnikPlaylista)
async def nova_korisnik_playlista(data: KorisnikPlaylistaCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_korisnik_playlista(session, data)
    return db_obj

@router.delete("/{korisnikID}/{playlistaID}", response_model=KorisnikPlaylista)
async def obrisi_vezu(korisnikID: str, playlistaID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_korisnik_playlista(session, korisnikID, playlistaID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj



