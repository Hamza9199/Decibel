from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from modeli.PrijavaIzvodjaca import PrijavaIzvodjacaORM, PrijavaIzvodjacaCreate
import uuid

async def get_all_prijave(session: AsyncSession):
    result = await session.execute(select(PrijavaIzvodjacaORM))
    return result.scalars().all()

async def get_prijava_by_id(session: AsyncSession, prijava_id: str):
    result = await session.execute(
        select(PrijavaIzvodjacaORM).where(PrijavaIzvodjacaORM.id == prijava_id)
    )
    return result.scalar_one_or_none()

async def create_prijava(session: AsyncSession, data: PrijavaIzvodjacaCreate):
    obj = PrijavaIzvodjacaORM(
        id=str(uuid.uuid4()),
        korisnikID=data.korisnikID,
        poruka=data.poruka,
        datum=data.datum
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj

async def delete_prijava(session: AsyncSession, prijava_id: str):
    obj = await get_prijava_by_id(session, prijava_id)
    if not obj:
        return None
    await session.delete(obj)
    await session.commit()
    return obj
