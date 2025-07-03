from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.Playlista import PlaylistaORM, Playlista, PlaylistaCreate

async def get_all_playliste(session: AsyncSession):
    result = await session.execute(select(PlaylistaORM))
    return result.scalars().all()

async def get_playlista_by_id(session: AsyncSession, playlista_id: int):
    result = await session.execute(select(PlaylistaORM).where(PlaylistaORM.id == playlista_id))
    return result.scalar_one_or_none()

async def create_playlista(session: AsyncSession, playlista: PlaylistaCreate):
    db_playlista = PlaylistaORM(**playlista.dict())
    session.add(db_playlista)
    await session.commit()
    await session.refresh(db_playlista)
    return db_playlista

async def update_playlista(session: AsyncSession, playlista_id: int, playlista: PlaylistaCreate):
    db_playlista = await get_playlista_by_id(session, playlista_id)
    if not db_playlista:
        return None
    for key, value in playlista.dict().items():
        setattr(db_playlista, key, value)
    session.add(db_playlista)
    await session.commit()
    await session.refresh(db_playlista)
    return db_playlista

async def delete_playlista(session: AsyncSession, playlista_id: int):
    db_playlista = await get_playlista_by_id(session, playlista_id)
    if not db_playlista:
        return None
    await session.delete(db_playlista)
    await session.commit()
    return db_playlista
