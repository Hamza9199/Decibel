from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.HistorijaSlusanja import HistorijaSlusanjaORM, HistorijaSlusanja, HistorijaSlusanjaCreate

async def get_all_historija(session: AsyncSession):
    result = await session.execute(select(HistorijaSlusanjaORM))
    return result.scalars().all()

async def get_historija_by_id(session: AsyncSession, historija_id: int):
    result = await session.execute(select(HistorijaSlusanjaORM).where(HistorijaSlusanjaORM.id == historija_id))
    return result.scalar_one_or_none()

async def create_historija(session: AsyncSession, historija: HistorijaSlusanjaCreate):
    db_historija = HistorijaSlusanjaORM(**historija.dict())
    session.add(db_historija)
    await session.commit()
    await session.refresh(db_historija)
    return db_historija

async def delete_historija(session: AsyncSession, historija_id: int):
    db_historija = await get_historija_by_id(session, historija_id)
    if not db_historija:
        return None
    await session.delete(db_historija)
    await session.commit()
    return db_historija
