from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.ObnovaPretplate import ObnovaPretplateORM, ObnovaPretplate, ObnovaPretplateCreate

async def get_all_obnove(session: AsyncSession):
    result = await session.execute(select(ObnovaPretplateORM))
    return result.scalars().all()

async def get_obnova_by_id(session: AsyncSession, obnova_id: int):
    result = await session.execute(
        select(ObnovaPretplateORM).where(ObnovaPretplateORM.id == obnova_id)
    )
    return result.scalar_one_or_none()

async def create_obnova(session: AsyncSession, data: ObnovaPretplateCreate):
    db_obj = ObnovaPretplateORM(**data.dict())
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_obnova(session: AsyncSession, obnova_id: int):
    db_obj = await get_obnova_by_id(session, obnova_id)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
