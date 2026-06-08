from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import NoResultFound
from uuid import uuid4
from passlib.context import CryptContext

from modeli.Korisnik import KorisnikORM, Korisnik, KorisnikCreate
from modeli.Album import AlbumORM
from modeli.Pjesma import PjesmaORM
from modeli.Playlista import PlaylistaORM
from modeli.KorisnikPjesma import KorisnikPjesmaORM
from modeli.KorisnikAlbum import KorisnikAlbumORM
from modeli.KorisnikPlaylista import KorisnikPlaylistaORM
from modeli.HistorijaSlusanja import HistorijaSlusanjaORM
from modeli.Komentar import KomentarORM
from modeli.PratilacKorisnik import PratilacKorisnikORM
from modeli.IzvodjacPjesma import IzvodjacPjesmaORM
from modeli.StatistikaReprodukcije import StatistikaReprodukcijeORM
from modeli.KorisnikPretplata import KorisnikPretplataORM
from modeli.ObnovaPretplate import ObnovaPretplateORM
from modeli.PrijavaIzvodjaca import PrijavaIzvodjacaORM
from modeli.SuspendovanKorisnik import SuspendovanKorisnikORM

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def get_all_korisnici(session: AsyncSession):
    result = await session.execute(select(KorisnikORM))
    return result.scalars().all()

async def get_korisnik_by_id(session: AsyncSession, korisnik_id: str):
    if not isinstance(korisnik_id, str):
        korisnik_id = str(korisnik_id)
    result = await session.execute(
        select(KorisnikORM).where(KorisnikORM.id == korisnik_id)
    )
    korisnik = result.scalar_one_or_none()
    return korisnik

async def register_korisnik(session: AsyncSession, korisnik: KorisnikCreate):
    db_korisnik = KorisnikORM(
        id=str(uuid4()),
        ime=korisnik.ime,
        prezime=korisnik.prezime,
        korisnicko_ime=korisnik.korisnicko_ime,
        email=korisnik.email,
        lozinka=hash_password(korisnik.lozinka),  
        rola=korisnik.rola,
        bio=korisnik.bio,
        statusKorisnika=korisnik.statusKorisnika or "aktivan",
        putanjaProfilneSlike=korisnik.putanjaProfilneSlike,
        datumRegistracije=korisnik.datumRegistracije or None,
        brojPratilaca=korisnik.brojPratilaca or 0,
        obrisan=korisnik.obrisan or False
    )
    session.add(db_korisnik)
    await session.commit()
    await session.refresh(db_korisnik)
    return db_korisnik

async def login_korisnik(session: AsyncSession, email: str, lozinka: str):
    result = await session.execute(
        select(KorisnikORM).where(KorisnikORM.email == email)
    )
    korisnik = result.scalar_one_or_none()
    if korisnik and verify_password(lozinka, korisnik.lozinka):
        return korisnik
    return None

async def update_korisnik(session: AsyncSession, korisnik_id: str, korisnik: KorisnikCreate):
    db_korisnik = await get_korisnik_by_id(session, korisnik_id)
    if not db_korisnik:
        return None
    db_korisnik.ime = korisnik.ime
    db_korisnik.prezime = korisnik.prezime
    db_korisnik.korisnicko_ime = korisnik.korisnicko_ime
    db_korisnik.email = korisnik.email
    db_korisnik.lozinka = korisnik.lozinka
    db_korisnik.rola = korisnik.rola
    db_korisnik.bio = korisnik.bio
    db_korisnik.statusKorisnika = korisnik.statusKorisnika
    db_korisnik.putanjaProfilneSlike = korisnik.putanjaProfilneSlike  
    db_korisnik.datumRegistracije = korisnik.datumRegistracije
    db_korisnik.brojPratilaca = korisnik.brojPratilaca
    db_korisnik.obrisan = korisnik.obrisan
    session.add(db_korisnik)
    await session.commit()
    await session.refresh(db_korisnik)
    return db_korisnik

async def delete_korisnik(session: AsyncSession, korisnik_id: str):
    db_korisnik = await get_korisnik_by_id(session, korisnik_id)
    if not db_korisnik:
        return None
    await session.delete(db_korisnik)
    await session.commit()
    return db_korisnik

async def export_korisnik_podaci(
    session: AsyncSession,
    korisnik_id: str
):
    db_korisnik = await get_korisnik_by_id(session, korisnik_id)
    if not db_korisnik:
        return None
    
    korisnik = db_korisnik

    albumi = (
    await session.execute(
        select(AlbumORM).where(
            AlbumORM.korisnikID == korisnik_id
        )
    )
    ).scalars().all()

    pjesme = (
    await session.execute(
        select(PjesmaORM).where(
            PjesmaORM.korisnikID == korisnik_id
        )
    )
    ).scalars().all()

    playliste = (
    await session.execute(
        select(PlaylistaORM).where(
            PlaylistaORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    lajk_pjesme = (
    await session.execute(
        select(KorisnikPjesmaORM).where(
            KorisnikPjesmaORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    lajk_albumi = (
    await session.execute(
        select(KorisnikAlbumORM).where(
            KorisnikAlbumORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    lajk_playliste = (
    await session.execute(
        select(KorisnikPlaylistaORM).where(
            KorisnikPlaylistaORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    historija = (
    await session.execute(
        select(HistorijaSlusanjaORM).where(
            HistorijaSlusanjaORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    komentari = (
    await session.execute(
        select(KomentarORM).where(
            KomentarORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    pratim = (
    await session.execute(
        select(PratilacKorisnikORM).where(
            PratilacKorisnikORM.pratilacID == korisnik_id
        )
    )
).scalars().all()
    
    prati_me = (
    await session.execute(
        select(PratilacKorisnikORM).where(
            PratilacKorisnikORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    izvodjac_pjesma = (
    await session.execute(
        select(IzvodjacPjesmaORM).where(
            IzvodjacPjesmaORM.izvodjacID == korisnik_id
        )
    )
).scalars().all()
    
    statistika = (
    await session.execute(
        select(StatistikaReprodukcijeORM).where(
            StatistikaReprodukcijeORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    pretplata = (
    await session.execute(
        select(KorisnikPretplataORM).where(
            KorisnikPretplataORM.korisnikID == korisnik_id
        )
    )
).scalar_one_or_none()
    
    obnove = []
    if pretplata:
        obnove = (
            await session.execute(
                select(ObnovaPretplateORM).where(
                    ObnovaPretplateORM.korisnikPretplataID == pretplata.id
                )
            )
        ).scalars().all()


    prijave = (
    await session.execute(
        select(PrijavaIzvodjacaORM).where(
            PrijavaIzvodjacaORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    suspenzije = (
    await session.execute(
        select(SuspendovanKorisnikORM).where(
            SuspendovanKorisnikORM.korisnikID == korisnik_id
        )
    )
).scalars().all()
    
    broj_pjesama = len(pjesme)
    broj_albuma = len(albumi)
    broj_playlista = len(playliste)
    broj_komentara = len(komentari)
    ukupno_preslusavanja = sum(
        s.brojReprodukcija for s in statistika
    )

    
    return {
    "korisnik": korisnik,
    "albumi": albumi,
    "pjesme": pjesme,
    "playliste": playliste,
    "lajkovanePjesme": lajk_pjesme,
    "lajkovaniAlbumi": lajk_albumi,
    "lajkovanePlayliste": lajk_playliste,
    "historijaSlusanja": historija,
    "komentari": komentari,
    "pratim": pratim,
    "pratiMe": prati_me,
    "izvodjacNaPjesmama": izvodjac_pjesma,
    "statistikaReprodukcije": statistika,
    "pretplata": pretplata,
    "obnovePretplate": obnove,
    "prijaveIzvodjaca": prijave,
    "suspenzije": suspenzije,
    "statistikaNaloga": {
        "brojPjesama": broj_pjesama,
        "brojAlbuma": broj_albuma,
        "brojPlaylista": broj_playlista,
        "brojKomentara": broj_komentara,
        "ukupnoPreslusavanja": ukupno_preslusavanja
    }
}