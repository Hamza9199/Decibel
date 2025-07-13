from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from modeli.SuspendovanKorisnik import SuspendovanKorisnikORM, SuspendovanKorisnik, SuspendovanKorisnikCreate

async def get_all_suspendovani(session: AsyncSession):
    result = await session.execute(
        select(SuspendovanKorisnikORM).options(selectinload(SuspendovanKorisnikORM.korisnik))
    )
    return result.scalars().all()

async def get_suspendovan_by_id(session: AsyncSession, suspendovan_id: int):
    result = await session.execute(
        select(SuspendovanKorisnikORM).options(selectinload(SuspendovanKorisnikORM.korisnik)).where(SuspendovanKorisnikORM.id == suspendovan_id)
    )
    return result.scalar_one_or_none()

async def get_suspendovan_by_korisnik_id(session: AsyncSession, korisnik_id: str):
    result = await session.execute(
        select(SuspendovanKorisnikORM).options(selectinload(SuspendovanKorisnikORM.korisnik)).where(SuspendovanKorisnikORM.korisnikID == korisnik_id)
    )
    return result.scalar_one_or_none()

async def create_suspendovan(session: AsyncSession, suspendovan: SuspendovanKorisnikCreate):
    db_sus = SuspendovanKorisnikORM(**suspendovan.dict())
    session.add(db_sus)
    await session.commit()
    await session.refresh(db_sus)
    return db_sus

async def update_suspendovan(session: AsyncSession, suspendovan_id: int, suspendovan: SuspendovanKorisnikCreate):
    db_sus = await get_suspendovan_by_id(session, suspendovan_id)
    if not db_sus:
        return None
    for key, value in suspendovan.dict().items():
        setattr(db_sus, key, value)
    session.add(db_sus)
    await session.commit()
    await session.refresh(db_sus)
    return db_sus

async def delete_suspendovan(session: AsyncSession, suspendovan_id: int):
    db_sus = await get_suspendovan_by_id(session, suspendovan_id)
    if not db_sus:
        return None
    await session.delete(db_sus)
    await session.commit()
    return db_sus
