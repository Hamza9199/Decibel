from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.PratilacKorisnik import PratilacKorisnikORM, PratilacKorisnik, PratilacKorisnikCreate
from modeli.Korisnik import KorisnikORM

async def get_all_pratioci(session: AsyncSession):
    result = await session.execute(select(PratilacKorisnikORM))
    return result.scalars().all()

async def get_pratilac_korisnik(session: AsyncSession, korisnikID: str, pratilacID: str):
    result = await session.execute(
        select(PratilacKorisnikORM).where(
            PratilacKorisnikORM.korisnikID == korisnikID,
            PratilacKorisnikORM.pratilacID == pratilacID
        )
    )
    return result.scalar_one_or_none()

async def create_pratilac_korisnik(session: AsyncSession, data: PratilacKorisnikCreate):
    db_obj = PratilacKorisnikORM(**data.dict())
    session.add(db_obj)
    # Povećaj broj pratilaca na korisniku
    korisnik = await session.get(KorisnikORM, data.korisnikID)
    if korisnik:
        korisnik.brojPratilaca = (korisnik.brojPratilaca or 0) + 1
        session.add(korisnik)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_pratilac_korisnik(session: AsyncSession, korisnikID: str, pratilacID: str):
    db_obj = await get_pratilac_korisnik(session, korisnikID, pratilacID)
    if not db_obj:
        return None
    await session.delete(db_obj)
    # Smanji broj pratilaca na korisniku
    korisnik = await session.get(KorisnikORM, korisnikID)
    if korisnik and (korisnik.brojPratilaca or 0) > 0:
        korisnik.brojPratilaca -= 1
        session.add(korisnik)
    await session.commit()
    return db_obj
