from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv
import tempfile

from modeli.Pjesma import Pjesma, PjesmaCreate
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from kontroleri.PjesmaKontroler import (
    get_all_pjesme,
    get_pjesma_by_id,
    create_pjesma,
    update_pjesma,
    delete_pjesma
)
from kontroleri.IzvodjacPjesmaKontroler import create_izvodjac_pjesma
from modeli.IzvodjacPjesma import IzvodjacPjesmaCreate
from servisi.FirebaseStorage import upload_file

router = APIRouter(prefix="/api/pjesme", tags=["Pjesme"])

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

@router.get("/", response_model=List[Pjesma])
async def sve_pjesme(session: AsyncSession = Depends(get_session)):
    pjesme = await get_all_pjesme(session)
    return pjesme

@router.get("/{pjesma_id}", response_model=Pjesma)
async def get_pjesma(pjesma_id: int, session: AsyncSession = Depends(get_session)):
    pjesma = await get_pjesma_by_id(session, pjesma_id)
    if not pjesma:
        raise HTTPException(status_code=404, detail="Pjesma nije pronađena")
    return pjesma

@router.post("/", response_model=Pjesma)
async def nova_pjesma(
    korisnikID: str = Form(...),
    naziv: str = Form(...),
    opis: str = Form(None),
    datumObjave: str = Form(...),
    trajanjeSekunde: int = Form(...),
    javno: bool = Form(False),
    odobreno: bool = Form(False),
    jezikPjesme: str = Form(None),
    licenca: str = Form(None),
    eksplicitniSadrzaj: bool = Form(False),
    zanr: str = Form(...),
    albumID: int = Form(None),
    file_audio: UploadFile = File(None),
    file_slika: UploadFile = File(None),
    file_gif: UploadFile = File(None),
    session: AsyncSession = Depends(get_session)
):
    try:
        putanjaAudio = putanjaSlika = putanjaGif = None

        if file_audio:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(await file_audio.read())
                temp_path = tmp.name
            putanjaAudio = upload_file(temp_path, f"pjesme/audio/{file_audio.filename}")
            os.remove(temp_path)

        if file_slika:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(await file_slika.read())
                temp_path = tmp.name
            putanjaSlika = upload_file(temp_path, f"pjesme/slike/{file_slika.filename}")
            os.remove(temp_path)

        if file_gif:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(await file_gif.read())
                temp_path = tmp.name
            putanjaGif = upload_file(temp_path, f"pjesme/gif/{file_gif.filename}")
            os.remove(temp_path)

        pjesma_data = PjesmaCreate(
            korisnikID=korisnikID,
            albumID=albumID,
            naziv=naziv,
            opis=opis,
            datumObjave=datumObjave,
            trajanjeSekunde=trajanjeSekunde,
            javno=javno,
            odobreno=odobreno,
            putanjaAudio=putanjaAudio,
            putanjaSlika=putanjaSlika,
            putanjaGif=putanjaGif,
            jezikPjesme=jezikPjesme,
            licenca=licenca,
            eksplicitniSadrzaj=eksplicitniSadrzaj,
            zanr=zanr
        )
        db_pjesma = await create_pjesma(session, pjesma_data)

        if db_pjesma and db_pjesma.id and korisnikID:
            izvodjac_pjesma_data = IzvodjacPjesmaCreate(
                izvodjacID=korisnikID,
                pjesmaID=db_pjesma.id
            )
            await create_izvodjac_pjesma(session, izvodjac_pjesma_data)
        else:
            print("Ne može se kreirati izvodjac_pjesma: nedostaje korisnikID ili pjesmaID")

        return db_pjesma
    except Exception as e:
        import traceback
        print("GRESKA PRI KREIRANJU PJESME:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{pjesma_id}", response_model=Pjesma)
async def izmeni_pjesmu(
    pjesma_id: int,
    session: AsyncSession = Depends(get_session),
    korisnikID: str = Form(None),
    naziv: str = Form(None),
    opis: str = Form(None),
    datumObjave: str = Form(None),
    trajanjeSekunde: int = Form(None),
    javno: bool = Form(None),
    odobreno: bool = Form(None),
    jezikPjesme: str = Form(None),
    licenca: str = Form(None),
    eksplicitniSadrzaj: bool = Form(None),
    zanr: str = Form(None),
    albumID: int = Form(None),
    file_audio: UploadFile = File(None),
    file_slika: UploadFile = File(None),
    file_gif: UploadFile = File(None),
):
    # Dohvati postojeću pjesmu iz baze
    db_pjesma = await get_pjesma_by_id(session, pjesma_id)
    if not db_pjesma:
        raise HTTPException(status_code=404, detail="Pjesma nije pronađena")

    # Zadrži postojeće vrijednosti ako nije uploadovan novi fajl
    putanjaAudio = db_pjesma.putanjaAudio
    putanjaSlika = db_pjesma.putanjaSlika
    putanjaGif = db_pjesma.putanjaGif

    if file_audio:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_audio.read())
            temp_path = tmp.name
        putanjaAudio = upload_file(temp_path, f"pjesme/audio/{file_audio.filename}")
        os.remove(temp_path)

    if file_slika:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_slika.read())
            temp_path = tmp.name
        putanjaSlika = upload_file(temp_path, f"pjesme/slike/{file_slika.filename}")
        os.remove(temp_path)

    if file_gif:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file_gif.read())
            temp_path = tmp.name
        putanjaGif = upload_file(temp_path, f"pjesme/gif/{file_gif.filename}")
        os.remove(temp_path)

    # Pripremi podatke za update, koristi postojeće vrijednosti ako nisu poslani novi podaci
    pjesma_data = {
        "korisnikID": korisnikID if korisnikID is not None else db_pjesma.korisnikID,
        "albumID": albumID if albumID is not None else db_pjesma.albumID,
        "naziv": naziv if naziv is not None else db_pjesma.naziv,
        "opis": opis if opis is not None else db_pjesma.opis,
        "datumObjave": datumObjave if datumObjave is not None else db_pjesma.datumObjave,
        "trajanjeSekunde": trajanjeSekunde if trajanjeSekunde is not None else db_pjesma.trajanjeSekunde,
        "javno": javno if javno is not None else db_pjesma.javno,
        "odobreno": odobreno if odobreno is not None else db_pjesma.odobreno,
        "putanjaAudio": putanjaAudio,
        "putanjaSlika": putanjaSlika,
        "putanjaGif": putanjaGif,
        "jezikPjesme": jezikPjesme if jezikPjesme is not None else db_pjesma.jezikPjesme,
        "licenca": licenca if licenca is not None else db_pjesma.licenca,
        "eksplicitniSadrzaj": eksplicitniSadrzaj if eksplicitniSadrzaj is not None else db_pjesma.eksplicitniSadrzaj,
        "zanr": zanr if zanr is not None else db_pjesma.zanr,
        "brojReprodukcija": db_pjesma.brojReprodukcija,
        "brojLajkova": db_pjesma.brojLajkova,
    }

    # Pretvori datumObjave u datetime.date ako je string
    import datetime
    if isinstance(pjesma_data["datumObjave"], str):
        pjesma_data["datumObjave"] = datetime.datetime.strptime(pjesma_data["datumObjave"], "%Y-%m-%d").date()

    from modeli.Pjesma import PjesmaCreate
    pjesma_create = PjesmaCreate(**pjesma_data)
    db_pjesma = await update_pjesma(session, pjesma_id, pjesma_create)
    if not db_pjesma:
        raise HTTPException(status_code=404, detail="Pjesma nije pronađena")
    return db_pjesma

@router.delete("/{pjesma_id}", response_model=Pjesma)
async def obrisi_pjesmu(pjesma_id: int, session: AsyncSession = Depends(get_session)):
    db_pjesma = await delete_pjesma(session, pjesma_id)
    if not db_pjesma:
        raise HTTPException(status_code=404, detail="Pjesma nije pronađena")
    return db_pjesma
