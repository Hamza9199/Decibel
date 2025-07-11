from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.StatistikaReprodukcije import StatistikaReprodukcijeORM, StatistikaReprodukcije, StatistikaReprodukcijeCreate
from modeli.Pjesma import PjesmaORM

async def get_all_statistika(session: AsyncSession):
    result = await session.execute(select(StatistikaReprodukcijeORM))
    return result.scalars().all()

async def get_statistika_by_id(session: AsyncSession, statistika_id: int):
    result = await session.execute(
        select(StatistikaReprodukcijeORM).where(StatistikaReprodukcijeORM.id == statistika_id)
    )
    return result.scalar_one_or_none()

async def create_statistika(session: AsyncSession, data: StatistikaReprodukcijeCreate):
    db_obj = StatistikaReprodukcijeORM(**data.dict())
    session.add(db_obj)
    # Povećaj broj reprodukcija na pjesmi
    pjesma = await session.get(PjesmaORM, data.pjesmaID)
    if pjesma:
        pjesma.brojReprodukcija = (pjesma.brojReprodukcija or 0) + 1
        session.add(pjesma)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_statistika(session: AsyncSession, statistika_id: int):
    db_obj = await get_statistika_by_id(session, statistika_id)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
