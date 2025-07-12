from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel
from modeli.PjesmaPlaylista import PjesmaPlaylista, PjesmaPlaylistaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from kontroleri.PjesmaPlaylistaKontroler import (
    get_all_pjesma_playlista,
    get_pjesma_playlista,
    create_pjesma_playlista,
    delete_pjesma_playlista
)
from servisi.PlaylistaRedoslijed import (
    promjeni_redoslijed,
    dodaj_pjesmu_na_kraj,
    dobij_redoslijed_playliste,
    obrisi_pjesmu
)

router = APIRouter(prefix="/api/pjesma_playlista", tags=["PjesmaPlaylista"])

import os
from dotenv import load_dotenv
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

# Pydantic modeli za zahtjeve
class DodajPjesmuRequest(BaseModel):
    playlistaID: int
    pjesmaID: int

class PromjeniRedoslijedRequest(BaseModel):
    playlistaID: int
    pjesmaID: int
    nova_pozicija_iza_pjesmeID: int = None

@router.get("/", response_model=List[PjesmaPlaylista])
async def sve_pjesma_playlista(session: AsyncSession = Depends(get_session)):
    return await get_all_pjesma_playlista(session)

@router.get("/redoslijed/{playlistaID}", response_model=List[int])
async def dobij_redoslijed(playlistaID: int, session: AsyncSession = Depends(get_session)):
    """Vraća redoslijed pjesama u playlisti"""
    return await dobij_redoslijed_playliste(session, playlistaID)

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

@router.post("/dodaj-na-kraj/", response_model=PjesmaPlaylista)
async def dodaj_na_kraj(data: DodajPjesmuRequest, session: AsyncSession = Depends(get_session)):
    """Dodaje pjesmu na kraj playliste"""
    try:
        result = await dodaj_pjesmu_na_kraj(session, data.playlistaID, data.pjesmaID)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Greška pri dodavanju pjesme")

@router.delete("/{pjesmaID}/{playlistaID}", response_model=PjesmaPlaylista)
async def obrisi_vezu(pjesmaID: int, playlistaID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_pjesma_playlista(session, pjesmaID, playlistaID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj

@router.delete("/obrisi-iz-playliste/{pjesmaID}/{playlistaID}", response_model=dict)
async def obrisi_iz_playliste(pjesmaID: int, playlistaID: int, session: AsyncSession = Depends(get_session)):
    """Briše pjesmu iz playliste i ažurira pokazivače"""
    success = await obrisi_pjesmu(session, playlistaID, pjesmaID)
    if not success:
        raise HTTPException(status_code=404, detail="Pjesma nije pronađena u playlisti")
    return {"success": True}

@router.post("/promjeni-redoslijed/", response_model=dict)
async def promjeni_redoslijed_pjesme(
    data: PromjeniRedoslijedRequest,
    session: AsyncSession = Depends(get_session)
):
    """Mijenja redoslijed pjesme u playlisti"""
    rezultat = await promjeni_redoslijed(
        session, 
        data.playlistaID, 
        data.pjesmaID, 
        data.nova_pozicija_iza_pjesmeID
    )
    if rezultat is None:
        raise HTTPException(status_code=400, detail="Neuspješna promjena redoslijeda")
        
    return {"success": True}