from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modeli.KorisnikPretplata import KorisnikPretplataORM, KorisnikPretplata, KorisnikPretplataCreate

async def get_all_korisnik_pretplata(session: AsyncSession):
    result = await session.execute(
        select(KorisnikPretplataORM).options(selectinload(KorisnikPretplataORM.pretplata))
    )
    return result.scalars().all()

async def get_korisnik_pretplata_by_id(session: AsyncSession, korisnik_pretplata_id: int):
    result = await session.execute(
        select(KorisnikPretplataORM).options(selectinload(KorisnikPretplataORM.pretplata)).where(KorisnikPretplataORM.id == korisnik_pretplata_id)
    )
    return result.scalar_one_or_none()

async def create_korisnik_pretplata(session: AsyncSession, data: KorisnikPretplataCreate):
    db_obj = KorisnikPretplataORM(**data.dict())
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_korisnik_pretplata(session: AsyncSession, korisnik_pretplata_id: int):
    db_obj = await get_korisnik_pretplata_by_id(session, korisnik_pretplata_id)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
