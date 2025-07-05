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
    db_obj = IzvodjacPjesmaORM(**data.dict())
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_izvodjac_pjesma(session: AsyncSession, izvodjacID: str, pjesmaID: int):
    db_obj = await get_izvodjac_pjesma(session, izvodjacID, pjesmaID)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
