from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
import os
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError

from modeli.Korisnik import Korisnik, KorisnikCreate, KorisnikLogin
from servisi.Baza import database
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from fastapi import File, UploadFile
import tempfile
from servisi.FirebaseStorage import upload_file

from kontroleri.KorisnikKontroler import (
    get_all_korisnici,
    register_korisnik,
    login_korisnik,
    get_korisnik_by_id,
    update_korisnik,
    delete_korisnik,
    export_korisnik_podaci
)

router = APIRouter(prefix="/api/korisnici", tags=["Korisnici"])

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

@router.get("/", response_model=List[Korisnik])
async def svi_korisnici(session: AsyncSession = Depends(get_session)):
    korisnici = await get_all_korisnici(session)
    return korisnici


@router.get("/{korisnik_id}", response_model=Korisnik)
async def get_korisnik(korisnik_id: str, session: AsyncSession = Depends(get_session)):
    korisnik = await get_korisnik_by_id(session, korisnik_id)
    if not korisnik:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    return korisnik

@router.get("/{korisnik_id}/izvoz-podataka")
async def export_podataka(
    korisnik_id: str,
    session: AsyncSession = Depends(get_session)
    ):
    return await export_korisnik_podaci(
        session,
        korisnik_id
    )

@router.put("/{korisnik_id}", response_model=Korisnik)
async def update(korisnik_id: str, korisnik: KorisnikCreate, session: AsyncSession = Depends(get_session)):
    try:
        db_korisnik = await update_korisnik(session, korisnik_id, korisnik)
        if not db_korisnik:
            raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
        return db_korisnik
    except IntegrityError as e:
        await session.rollback()
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        if "korisnicko_ime" in error_msg:
            raise HTTPException(status_code=400, detail="Korisničko ime je već zauzeto")
        elif "email" in error_msg:
            raise HTTPException(status_code=400, detail="Email je već registriran")
        elif "discordID" in error_msg:
            raise HTTPException(status_code=400, detail="Discord nalog je već povezan")
        raise HTTPException(status_code=400, detail="Podaci već postoje")

@router.delete("/{korisnik_id}", response_model=Korisnik)
async def delete(korisnik_id: str, session: AsyncSession = Depends(get_session)):
    # Umjesto fizičkog brisanja, postavi status na "neaktivan"
    db_korisnik = await get_korisnik_by_id(session, korisnik_id)
    if not db_korisnik:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    db_korisnik.statusKorisnika = "neaktivan"
    db_korisnik.obrisan = True
    session.add(db_korisnik)
    await session.commit()
    await session.refresh(db_korisnik)
    return db_korisnik

@router.post("/register", response_model=Korisnik)
async def register(korisnik: KorisnikCreate, session: AsyncSession = Depends(get_session)):
    try:
        db_korisnik = await register_korisnik(session, korisnik)
        return db_korisnik
    except IntegrityError as e:
        await session.rollback()
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        if "korisnicko_ime" in error_msg:
            raise HTTPException(status_code=400, detail="Korisničko ime je već zauzeto")
        elif "email" in error_msg:
            raise HTTPException(status_code=400, detail="Email je već registriran")
        elif "discordID" in error_msg:
            raise HTTPException(status_code=400, detail="Discord nalog je već povezan")
        raise HTTPException(status_code=400, detail="Podaci već postoje")

@router.post("/login", response_model=Korisnik)
async def login(login_data: KorisnikLogin, session: AsyncSession = Depends(get_session)):
    korisnik = await login_korisnik(session, login_data.email, login_data.lozinka)
    if not korisnik:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Pogrešan email ili lozinka")
    return korisnik


@router.put("/slika/{korisnik_id}", response_model=Korisnik)
async def promijeni_sliku(
    korisnik_id: str,
    file_profilna: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    korisnik = await get_korisnik_by_id(session, korisnik_id)

    if not korisnik:
        raise HTTPException(
            status_code=404,
            detail="Korisnik nije pronađen"
        )

    dozvoljeni_tipovi = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if file_profilna.content_type not in dozvoljeni_tipovi:
        raise HTTPException(
            status_code=400,
            detail="Dozvoljeni su samo JPG, PNG i WEBP formati"
        )

    ekstenzija = os.path.splitext(file_profilna.filename or "")[1].lower()

    if ekstenzija not in {".jpg", ".jpeg", ".png", ".webp"}:
        ekstenzija = ".jpg"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=ekstenzija
        ) as tmp:
            tmp.write(await file_profilna.read())
            temp_path = tmp.name

        print(f"[DEBUG] Uploading file: {temp_path}")
        slika = upload_file(temp_path)
        print(f"[DEBUG] Upload result: {slika}")

        putanjaProfilneSlike = slika["url"]

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Greška prilikom upload-a slike: {str(e)}"
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    korisnik_data = KorisnikCreate(
        ime=korisnik.ime,
        prezime=korisnik.prezime,
        korisnicko_ime=korisnik.korisnicko_ime,
        email=korisnik.email,
        lozinka=korisnik.lozinka,  
        rola=korisnik.rola,
        bio=korisnik.bio,
        statusKorisnika=korisnik.statusKorisnika,
        putanjaProfilneSlike=putanjaProfilneSlike,
        datumRegistracije=korisnik.datumRegistracije,
        brojPratilaca=korisnik.brojPratilaca,
        obrisan=korisnik.obrisan
    )

    try:
        db_korisnik = await update_korisnik(
            session,
            korisnik_id,
            korisnik_data
        )
        return db_korisnik
    except IntegrityError as e:
        await session.rollback()
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        if "korisnicko_ime" in error_msg:
            raise HTTPException(status_code=400, detail="Korisničko ime je već zauzeto")
        elif "email" in error_msg:
            raise HTTPException(status_code=400, detail="Email je već registriran")
        elif "discordID" in error_msg:
            raise HTTPException(status_code=400, detail="Discord nalog je već povezan")
        raise HTTPException(status_code=400, detail="Podaci već postoje")