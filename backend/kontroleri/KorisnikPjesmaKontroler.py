from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.KorisnikPjesma import KorisnikPjesmaORM, KorisnikPjesma, KorisnikPjesmaCreate

async def get_all_korisnik_pjesma(session: AsyncSession):
    result = await session.execute(select(KorisnikPjesmaORM))
    return result.scalars().all()

async def get_korisnik_pjesma(session: AsyncSession, korisnikID: str, pjesmaID: int):
    result = await session.execute(
        select(KorisnikPjesmaORM).where(
            KorisnikPjesmaORM.korisnikID == korisnikID,
            KorisnikPjesmaORM.pjesmaID == pjesmaID
        )
    )
    return result.scalar_one_or_none()

async def create_korisnik_pjesma(session: AsyncSession, data: KorisnikPjesmaCreate):
    db_obj = KorisnikPjesmaORM(**data.dict())
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_korisnik_pjesma(session: AsyncSession, korisnikID: str, pjesmaID: int):
    db_obj = await get_korisnik_pjesma(session, korisnikID, pjesmaID)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
