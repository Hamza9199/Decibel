from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from sqlalchemy import delete
from modeli.KorisnikPlaylista import KorisnikPlaylistaORM
from modeli.PjesmaPlaylista import PjesmaPlaylistaORM
from modeli.Playlista import PlaylistaORM, Playlista, PlaylistaCreate

async def get_all_playliste(session: AsyncSession):
    result = await session.execute(
        select(PlaylistaORM).options(selectinload(PlaylistaORM.korisnik))
    )
    return result.scalars().all()

async def get_playlista_by_id(session: AsyncSession, playlista_id: int):
    result = await session.execute(
        select(PlaylistaORM).options(selectinload(PlaylistaORM.korisnik)).where(PlaylistaORM.id == playlista_id)
    )
    return result.scalar_one_or_none()

async def create_playlista(session: AsyncSession, playlista: PlaylistaCreate):
    db_playlista = PlaylistaORM(**playlista.dict())
    session.add(db_playlista)
    await session.commit()
    await session.refresh(db_playlista)
    # Učitaj korisnika
    await session.refresh(db_playlista, attribute_names=["korisnik"])
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
    await session.refresh(db_playlista, attribute_names=["korisnik"])
    return db_playlista

async def delete_playlista(session: AsyncSession, playlista_id: int):
    db_playlista = await get_playlista_by_id(session, playlista_id)
    if not db_playlista:
        return None
    
    await session.execute(
        delete(KorisnikPlaylistaORM).where(
            KorisnikPlaylistaORM.playlistaID == playlista_id
        )
    )

    await session.execute(
        delete(PjesmaPlaylistaORM).where(
            PjesmaPlaylistaORM.playlistaID == playlista_id
        )
    )


    await session.delete(db_playlista)
    await session.commit()
    return db_playlista

async def get_playliste_by_korisnik_id(session: AsyncSession, korisnik_id: int):
    result = await session.execute(
        select(PlaylistaORM).options(selectinload(PlaylistaORM.korisnik)).where(PlaylistaORM.korisnik_id == korisnik_id)
    )
    return result.scalars().all() if result else []

