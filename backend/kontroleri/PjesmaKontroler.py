from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modeli.Pjesma import PjesmaORM, Pjesma, PjesmaCreate

async def get_all_pjesme(session: AsyncSession):
    result = await session.execute(
        select(PjesmaORM).options(selectinload(PjesmaORM.korisnik))
    )
    pjesme = result.scalars().all()
    # Vrati ORM objekte sa korisnik atributom
    return pjesme

async def get_pjesma_by_id(session: AsyncSession, pjesma_id: int):
    result = await session.execute(
        select(PjesmaORM).options(selectinload(PjesmaORM.korisnik)).where(PjesmaORM.id == pjesma_id)
    )
    return result.scalar_one_or_none()

async def create_pjesma(session: AsyncSession, pjesma: PjesmaCreate):
    db_pjesma = PjesmaORM(**pjesma.dict())
    session.add(db_pjesma)
    await session.commit()
    await session.refresh(db_pjesma)
    # Učitaj korisnika
    await session.refresh(db_pjesma, attribute_names=["korisnik"])
    return db_pjesma

async def update_pjesma(session: AsyncSession, pjesma_id: int, pjesma: PjesmaCreate):
    db_pjesma = await get_pjesma_by_id(session, pjesma_id)
    if not db_pjesma:
        return None
    for key, value in pjesma.dict().items():
        # Ispravi: dozvoli update svih polja, uključujući 'odobreno'
        setattr(db_pjesma, key, value)
    session.add(db_pjesma)
    await session.commit()
    await session.refresh(db_pjesma)
    await session.refresh(db_pjesma, attribute_names=["korisnik"])
    return db_pjesma

async def delete_pjesma(session: AsyncSession, pjesma_id: int):
    db_pjesma = await get_pjesma_by_id(session, pjesma_id)
    if not db_pjesma:
        return None
    await session.delete(db_pjesma)
    await session.commit()
    return db_pjesma
