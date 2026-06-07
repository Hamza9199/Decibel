from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from requests import get
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv
import tempfile

from modeli.Album import Album, AlbumCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.AlbumKontroler import (
    get_albumi_by_korisnik_id,
    get_all_albumi,
    get_album_by_id,
    create_album,
    get_pjesme_by_album_id,
    update_album,
    delete_album,
    dodaj_pjesmu_u_album,
    ukloni_pjesmu_iz_albuma,
)
from servisi.FirebaseStorage import upload_file

router = APIRouter(prefix="/api/albumi", tags=["Albumi"])

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

@router.get("/", response_model=List[Album])
async def svi_albumi(session: AsyncSession = Depends(get_session)):
    albumi = await get_all_albumi(session)
    return albumi

@router.get("/{album_id}", response_model=Album)
async def get_album(album_id: int, session: AsyncSession = Depends(get_session)):
    album = await get_album_by_id(session, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album nije pronađen")
    return album

@router.post("/", response_model=Album)
async def novi_album(
    korisnikID: str = Form(...),
    naziv: str = Form(...),
    opis: str = Form(None),
    kreiranDatumVrijeme: str = Form(None),
    odobreno: bool = Form(False),
    javno: bool = Form(False),
    brojLajkova: int = Form(0),
    file_slika: UploadFile = File(None),
    file_gif: UploadFile = File(None),
    session: AsyncSession = Depends(get_session)
):
    putanjaSlika = putanjaGif = None

    if file_slika:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_slika.read())
            temp_path = tmp.name
        putanjaSlika = upload_file(temp_path, f"albumi/slike/{file_slika.filename}")
        os.remove(temp_path)

    if file_gif:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_gif.read())
            temp_path = tmp.name
        putanjaGif = upload_file(temp_path, f"albumi/gif/{file_gif.filename}")
        os.remove(temp_path)

    album_data = AlbumCreate(
        korisnikID=korisnikID,
        naziv=naziv,
        opis=opis,
        kreiranDatumVrijeme=kreiranDatumVrijeme,
        odobreno=odobreno,
        javno=javno,
        brojLajkova=brojLajkova,
        putanjaSlika=putanjaSlika,
        putanjaGif=putanjaGif
    )
    db_album = await create_album(session, album_data)
    return db_album

@router.put("/{album_id}", response_model=Album)
async def izmeni_album(
    album_id: int,
    korisnikID: str = Form(...),
    naziv: str = Form(...),
    opis: str = Form(None),
    kreiranDatumVrijeme: str = Form(None),
    odobreno: bool = Form(False),
    javno: bool = Form(False),
    brojLajkova: int = Form(0),
    file_slika: UploadFile = File(None),
    file_gif: UploadFile = File(None),
    session: AsyncSession = Depends(get_session)
):
    db_album = await get_album_by_id(session, album_id)
    if not db_album:
        raise HTTPException(status_code=404, detail="Album nije pronađen")

    putanjaSlika = db_album.putanjaSlika  
    putanjaGif = db_album.putanjaGif      

    if file_slika:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_slika.read())
            temp_path = tmp.name
        putanjaSlika = upload_file(temp_path, f"albumi/slike/{file_slika.filename}")
        os.remove(temp_path)

    if file_gif:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_gif.read())
            temp_path = tmp.name
        putanjaGif = upload_file(temp_path, f"albumi/gif/{file_gif.filename}")
        os.remove(temp_path)

    album_data = AlbumCreate(
        korisnikID=korisnikID,
        naziv=naziv,
        opis=opis,
        kreiranDatumVrijeme=kreiranDatumVrijeme,
        odobreno=odobreno,
        javno=javno,
        brojLajkova=brojLajkova,
        putanjaSlika=putanjaSlika,
        putanjaGif=putanjaGif
    )
    db_album = await update_album(session, album_id, album_data)
    if not db_album:
        raise HTTPException(status_code=404, detail="Album nije pronađen")
    return db_album

@router.delete("/{album_id}", response_model=Album)
async def obrisi_album(album_id: int, session: AsyncSession = Depends(get_session)):
    db_album = await delete_album(session, album_id)
    if not db_album:
        raise HTTPException(status_code=404, detail="Album nije pronađen")
    return db_album


@router.get("/korisnik/{korisnik_id}", response_model=List[Album])
async def albumi_po_korisniku(korisnik_id: int, session: AsyncSession = Depends(get_session)):
    albumi = await get_albumi_by_korisnik_id(session, korisnik_id)
    return albumi

@router.get("/{album_id}/pjesme", response_model=List[str])
async def pjesme_po_albumu(album_id: int, session: AsyncSession = Depends(get_session)):
    pjesme = await get_pjesme_by_album_id(session, album_id)
    if pjesme is None:
        raise HTTPException(status_code=404, detail="Album nije pronađen ili nema pjesama")
    return pjesme

@router.post("/{album_id}/pjesme/{pjesma_id}")
async def dodaj_pjesmu(
    album_id: int,
    pjesma_id: int,
    session: AsyncSession = Depends(get_session)
):
    pjesma = await dodaj_pjesmu_u_album(
        session,
        album_id,
        pjesma_id
    )

    if not pjesma:
        raise HTTPException(
            status_code=404,
            detail="Pjesma nije pronađena"
        )

    return pjesma


@router.delete("/{album_id}/pjesme/{pjesma_id}")
async def ukloni_pjesmu(
    album_id: int,
    pjesma_id: int,
    session: AsyncSession = Depends(get_session)
):
    pjesma = await ukloni_pjesmu_iz_albuma(
        session,
        album_id,
        pjesma_id
    )

    if not pjesma:
        raise HTTPException(
            status_code=404,
            detail="Pjesma nije pronađena"
        )

    return pjesma