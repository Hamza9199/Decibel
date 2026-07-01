from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv
import tempfile

from modeli.Playlista import Playlista, PlaylistaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.PlaylistaKontroler import (
    get_all_playliste,
    get_playlista_by_id,
    create_playlista,
    get_playliste_by_korisnik_id,
    update_playlista,
    delete_playlista
)
from servisi.FirebaseStorage import upload_file

router = APIRouter(prefix="/api/playliste", tags=["Playliste"])

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

@router.get("/", response_model=List[Playlista])
async def sve_playliste(session: AsyncSession = Depends(get_session)):
    playliste = await get_all_playliste(session)
    return playliste

@router.get("/korisnik/{korisnik_id}", response_model=List[Playlista])
async def get_playliste_by_korisnik(korisnik_id: str, session: AsyncSession = Depends(get_session)):
    playliste = await get_playliste_by_korisnik_id(session, korisnik_id)
    return playliste


@router.get("/{playlista_id}", response_model=Playlista)
async def get_playlista(playlista_id: int, session: AsyncSession = Depends(get_session)):
    playlista = await get_playlista_by_id(session, playlista_id)
    if not playlista:
        raise HTTPException(status_code=404, detail="Playlista nije pronađena")
    return playlista


@router.post("/", response_model=Playlista)
async def nova_playlista(
    korisnikID: str = Form(...),
    naziv: str = Form(...),
    opis: str = Form(None),
    kreiranDatumVrijeme: str = Form(None),
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
        putanjaSlika = upload_file(temp_path, f"playliste/slike/{file_slika.filename}")
        os.remove(temp_path)

    if file_gif:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_gif.read())
            temp_path = tmp.name
        putanjaGif = upload_file(temp_path, f"playliste/gif/{file_gif.filename}")
        os.remove(temp_path)

    playlista_data = PlaylistaCreate(
        korisnikID=korisnikID,
        naziv=naziv,
        opis=opis,
        kreiranDatumVrijeme=kreiranDatumVrijeme,
        javno=javno,
        brojLajkova=brojLajkova,
        putanjaSlika=putanjaSlika,
        putanjaGif=putanjaGif
    )
    db_playlista = await create_playlista(session, playlista_data)
    return db_playlista

@router.put("/{playlista_id}", response_model=Playlista)
async def izmeni_playlistu(
    playlista_id: int,
    korisnikID: str = Form(...),
    naziv: str = Form(...),
    opis: str = Form(None),
    kreiranDatumVrijeme: str = Form(None),
    javno: bool = Form(False),
    brojLajkova: int = Form(0),
    file_slika: UploadFile = File(None),
    file_gif: UploadFile = File(None),
    session: AsyncSession = Depends(get_session)
):
    putanjaSlika = putanjaGif = None

    from kontroleri.PlaylistaKontroler import get_playlista_by_id
    db_playlista = await get_playlista_by_id(session, playlista_id)
    if not db_playlista:
        raise HTTPException(status_code=404, detail="Playlista nije pronađena")

    if file_slika:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_slika.read())
            temp_path = tmp.name
        putanjaSlika = upload_file(temp_path, f"playliste/slike/{file_slika.filename}")
        os.remove(temp_path)
    else:
        putanjaSlika = db_playlista.putanjaSlika

    if file_gif:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_gif.read())
            temp_path = tmp.name
        putanjaGif = upload_file(temp_path, f"playliste/gif/{file_gif.filename}")
        os.remove(temp_path)
    else:
        putanjaGif = db_playlista.putanjaGif

    playlista_data = PlaylistaCreate(
        korisnikID=korisnikID,
        naziv=naziv,
        opis=opis,
        kreiranDatumVrijeme=kreiranDatumVrijeme,
        javno=javno,
        brojLajkova=brojLajkova,
        putanjaSlika=putanjaSlika,
        putanjaGif=putanjaGif
    )
    from kontroleri.PlaylistaKontroler import update_playlista
    db_playlista = await update_playlista(session, playlista_id, playlista_data)
    if not db_playlista:
        raise HTTPException(status_code=404, detail="Playlista nije pronađena")
    return db_playlista

@router.delete("/{playlista_id}", response_model=Playlista)
async def obrisi_playlistu(playlista_id: int, session: AsyncSession = Depends(get_session)):
    db_playlista = await delete_playlista(session, playlista_id)
    if not db_playlista:
        raise HTTPException(status_code=404, detail="Playlista nije pronađena")
    return db_playlista
