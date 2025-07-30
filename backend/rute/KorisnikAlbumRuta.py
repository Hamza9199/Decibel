from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv

from modeli.KorisnikAlbum import KorisnikAlbum, KorisnikAlbumCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from modeli.Album import Album
from modeli.Korisnik import Korisnik
from kontroleri.KorisnikAlbumKontroler import (
    get_all_korisnik_album,
    get_all_korisnik_album2,
    get_korisnik_album,
    create_korisnik_album,
    delete_korisnik_album
)

router = APIRouter(prefix="/api/korisnik_album", tags=["KorisnikAlbum"])

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

@router.get("/", response_model=List[KorisnikAlbum])
async def svi_korisnik_album(session: AsyncSession = Depends(get_session)):
    return await get_all_korisnik_album(session)

@router.get("/{korisnikID}/{albumID}", response_model=KorisnikAlbum)
async def get_veza(korisnikID: str, albumID: int, session: AsyncSession = Depends(get_session)):
    veza = await get_korisnik_album(session, korisnikID, albumID)
    if not veza:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return veza

@router.post("/", response_model=KorisnikAlbum)
async def nova_korisnik_album(data: KorisnikAlbumCreate, session: AsyncSession = Depends(get_session)):
    db_obj = await create_korisnik_album(session, data)
    return db_obj

@router.delete("/{korisnikID}/{albumID}", response_model=KorisnikAlbum)
async def obrisi_vezu(korisnikID: str, albumID: int, session: AsyncSession = Depends(get_session)):
    db_obj = await delete_korisnik_album(session, korisnikID, albumID)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Veza nije pronađena")
    return db_obj



@router.get("/korisnik/{korisnikID}", response_model=List[KorisnikAlbum])
async def get_korisnik_albumi(korisnikID: str, session: AsyncSession = Depends(get_session)):
    albumi_veze = await get_all_korisnik_album2(session, korisnikID=korisnikID)
    if not albumi_veze:
        raise HTTPException(status_code=404, detail="Nema albuma za ovog korisnika")
    album_ids = [v.albumID for v in albumi_veze]
    if album_ids:
        from sqlalchemy.future import select
        from modeli.Album import AlbumORM
        from modeli.Korisnik import KorisnikORM
        albumi_query = await session.execute(select(AlbumORM).where(AlbumORM.id.in_(album_ids)))
        albumi_map = {a.id: a for a in albumi_query.scalars().all()}
        korisnik_ids = list(set([a.korisnikID for a in albumi_map.values() if a.korisnikID]))
        korisnici_query = await session.execute(select(KorisnikORM).where(KorisnikORM.id.in_(korisnik_ids)))
        korisnici_map = {k.id: k for k in korisnici_query.scalars().all()}
    else:
        albumi_map = {}
        korisnici_map = {}
    enriched = []
    for v in albumi_veze:
        album_obj = albumi_map.get(v.albumID)
        korisnik_obj = korisnici_map.get(album_obj.korisnikID) if album_obj and album_obj.korisnikID else None
        v_dict = v.__dict__.copy()
        v_dict['album'] = Album.from_orm(album_obj) if album_obj else None
        v_dict['korisnik'] = Korisnik.from_orm(korisnik_obj) if korisnik_obj else None
        enriched.append(KorisnikAlbum(**v_dict))
    return enriched
