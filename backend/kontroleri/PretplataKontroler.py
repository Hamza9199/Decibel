from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.Pretplata import PretplataORM, Pretplata, PretplataCreate

async def get_all_pretplate(session: AsyncSession):
    result = await session.execute(select(PretplataORM))
    return result.scalars().all()

async def get_pretplata_by_id(session: AsyncSession, pretplata_id: int):
    result = await session.execute(select(PretplataORM).where(PretplataORM.id == pretplata_id))
    return result.scalar_one_or_none()

async def create_pretplata(session: AsyncSession, pretplata: PretplataCreate):
    db_pretplata = PretplataORM(**pretplata.dict())
    session.add(db_pretplata)
    await session.commit()
    await session.refresh(db_pretplata)
    return db_pretplata

async def update_pretplata(session: AsyncSession, pretplata_id: int, pretplata: PretplataCreate):
    db_pretplata = await get_pretplata_by_id(session, pretplata_id)
    if not db_pretplata:
        return None
    for key, value in pretplata.dict().items():
        setattr(db_pretplata, key, value)
    session.add(db_pretplata)
    await session.commit()
    await session.refresh(db_pretplata)
    return db_pretplata

async def delete_pretplata(session: AsyncSession, pretplata_id: int):
    db_pretplata = await get_pretplata_by_id(session, pretplata_id)
    if not db_pretplata:
        return None
    await session.delete(db_pretplata)
    await session.commit()
    return db_pretplata
