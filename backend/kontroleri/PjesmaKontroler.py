from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.Pjesma import PjesmaORM, Pjesma, PjesmaCreate

async def get_all_pjesme(session: AsyncSession):
    result = await session.execute(select(PjesmaORM))
    return result.scalars().all()

async def get_pjesma_by_id(session: AsyncSession, pjesma_id: int):
    result = await session.execute(select(PjesmaORM).where(PjesmaORM.id == pjesma_id))
    return result.scalar_one_or_none()

async def create_pjesma(session: AsyncSession, pjesma: PjesmaCreate):
    db_pjesma = PjesmaORM(**pjesma.dict())
    session.add(db_pjesma)
    await session.commit()
    await session.refresh(db_pjesma)
    return db_pjesma

async def update_pjesma(session: AsyncSession, pjesma_id: int, pjesma: PjesmaCreate):
    db_pjesma = await get_pjesma_by_id(session, pjesma_id)
    if not db_pjesma:
        return None
    for key, value in pjesma.dict().items():
        setattr(db_pjesma, key, value)
    session.add(db_pjesma)
    await session.commit()
    await session.refresh(db_pjesma)
    return db_pjesma

async def delete_pjesma(session: AsyncSession, pjesma_id: int):
    db_pjesma = await get_pjesma_by_id(session, pjesma_id)
    if not db_pjesma:
        return None
    await session.delete(db_pjesma)
    await session.commit()
    return db_pjesma
