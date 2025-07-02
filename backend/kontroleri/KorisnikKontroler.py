from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import NoResultFound
from uuid import uuid4
from passlib.context import CryptContext

from modeli.Korisnik import KorisnikORM, Korisnik, KorisnikCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def get_all_korisnici(session: AsyncSession):
    result = await session.execute(select(KorisnikORM))
    return result.scalars().all()

async def get_korisnik_by_id(session: AsyncSession, korisnik_id: str):
    result = await session.execute(select(KorisnikORM).where(KorisnikORM.id == korisnik_id))
    korisnik = result.scalar_one_or_none()
    return korisnik

async def register_korisnik(session: AsyncSession, korisnik: KorisnikCreate):
    db_korisnik = KorisnikORM(
        id=str(uuid4()),
        ime=korisnik.ime,
        prezime=korisnik.prezime,
        korisnicko_ime=korisnik.korisnicko_ime,
        email=korisnik.email,
        lozinka=hash_password(korisnik.lozinka),  # Hesiraj lozinku
        rola=korisnik.rola
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
