from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.IzvodjacPjesma import IzvodjacPjesmaORM, IzvodjacPjesma, IzvodjacPjesmaCreate

async def get_all_izvodjac_pjesma(session: AsyncSession):
    result = await session.execute(select(IzvodjacPjesmaORM))
    return result.scalars().all()

async def get_izvodjac_pjesma(session: AsyncSession, izvodjacID: str, pjesmaID: int):
    result = await session.execute(
        select(IzvodjacPjesmaORM).where(
            IzvodjacPjesmaORM.izvodjacID == izvodjacID,
            IzvodjacPjesmaORM.pjesmaID == pjesmaID
        )
    )
    return result.scalar_one_or_none()

async def create_izvodjac_pjesma(session: AsyncSession, data: IzvodjacPjesmaCreate):
    # Provjeri postoji li već veza
    existing = await get_izvodjac_pjesma(session, data.izvodjacID, data.pjesmaID)
    if existing:
        return existing  # ili podigni grešku: raise Exception("Veza već postoji")
    db_obj = IzvodjacPjesmaORM(**data.dict())
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_izvodjac_pjesma(session: AsyncSession, izvodjacID: str, pjesmaID: int):
    obj = await get_izvodjac_pjesma(session, izvodjacID, pjesmaID)
    if not obj:
        return None
    await session.delete(obj)
    await session.commit()
    return obj
