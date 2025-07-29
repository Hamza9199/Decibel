from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.Komentar import KomentarORM, Komentar, KomentarCreate, KomentarUpdate

async def get_all_komentari(session: AsyncSession):
    result = await session.execute(select(KomentarORM))
    return result.scalars().all()

async def get_komentar_by_id(session: AsyncSession, komentar_id: int):
    result = await session.execute(select(KomentarORM).where(KomentarORM.id == komentar_id))
    return result.scalar_one_or_none()

async def create_komentar(session: AsyncSession, komentar: KomentarCreate):
    db_komentar = KomentarORM(**komentar.dict())
    session.add(db_komentar)
    await session.commit()
    await session.refresh(db_komentar)
    return db_komentar

async def delete_komentar(session: AsyncSession, komentar_id: int):
    db_komentar = await get_komentar_by_id(session, komentar_id)
    if not db_komentar:
        return None
    await session.delete(db_komentar)
    await session.commit()
    return db_komentar


async def update_komentar(session: AsyncSession, komentar_id: int, data: KomentarUpdate):
    db_komentar = await get_komentar_by_id(session, komentar_id)
    if not db_komentar:
        return None

    db_komentar.tekst = data.tekst
    session.add(db_komentar)
    await session.commit()
    await session.refresh(db_komentar)
    return db_komentar
