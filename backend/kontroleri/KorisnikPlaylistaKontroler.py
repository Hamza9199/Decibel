from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.KorisnikPlaylista import KorisnikPlaylistaORM, KorisnikPlaylista, KorisnikPlaylistaCreate
from modeli.Playlista import PlaylistaORM

async def get_all_korisnik_playlista(session: AsyncSession):
    result = await session.execute(select(KorisnikPlaylistaORM))
    return result.scalars().all()

async def get_korisnik_playlista(session: AsyncSession, korisnikID: str, playlistaID: int):
    result = await session.execute(
        select(KorisnikPlaylistaORM).where(
            KorisnikPlaylistaORM.korisnikID == korisnikID,
            KorisnikPlaylistaORM.playlistaID == playlistaID
        )
    )
    return result.scalar_one_or_none()

async def create_korisnik_playlista(session: AsyncSession, data: KorisnikPlaylistaCreate):
    db_obj = KorisnikPlaylistaORM(**data.dict())
    session.add(db_obj)
    # Povećaj broj lajkova na playlisti
    playlista = await session.get(PlaylistaORM, data.playlistaID)
    if playlista:
        playlista.brojLajkova = (playlista.brojLajkova or 0) + 1
        session.add(playlista)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_korisnik_playlista(session: AsyncSession, korisnikID: str, playlistaID: int):
    db_obj = await get_korisnik_playlista(session, korisnikID, playlistaID)
    if not db_obj:
        return None
    await session.delete(db_obj)
    # Smanji broj lajkova na playlisti
    playlista = await session.get(PlaylistaORM, playlistaID)
    if playlista and (playlista.brojLajkova or 0) > 0:
        playlista.brojLajkova -= 1
        session.add(playlista)
    await session.commit()
    return db_obj


async def get_all_korisnik_playlista(session: AsyncSession, korisnikID: str):
    result = await session.execute(
        select(KorisnikPlaylistaORM).where(KorisnikPlaylistaORM.korisnikID == korisnikID)
    )
    return result.scalars().all()

