from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.RedoslijedPjesama import RedoslijedPjesamaORM, RedoslijedPjesama, RedoslijedPjesamaCreate

async def get_all_redoslijed(session: AsyncSession):
    result = await session.execute(select(RedoslijedPjesamaORM))
    return result.scalars().all()

async def get_redoslijed_by_id(session: AsyncSession, redoslijedPjesama: int):
    result = await session.execute(
        select(RedoslijedPjesamaORM).where(RedoslijedPjesamaORM.redoslijedPjesama == redoslijedPjesama)
    )
    return result.scalar_one_or_none()

async def create_redoslijed(session: AsyncSession, data: RedoslijedPjesamaCreate):
    db_obj = RedoslijedPjesamaORM(**data.dict())
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_redoslijed(session: AsyncSession, redoslijedPjesama: int):
    db_obj = await get_redoslijed_by_id(session, redoslijedPjesama)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
