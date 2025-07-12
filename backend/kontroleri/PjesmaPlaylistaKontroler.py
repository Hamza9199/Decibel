from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.PjesmaPlaylista import PjesmaPlaylistaORM, PjesmaPlaylista, PjesmaPlaylistaCreate
from servisi.PlaylistaRedoslijed import dodaj_pjesmu_na_kraj

async def get_all_pjesma_playlista(session: AsyncSession):
    result = await session.execute(select(PjesmaPlaylistaORM))
    return result.scalars().all()

async def get_pjesma_playlista(session: AsyncSession, pjesmaID: int, playlistaID: int):
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            PjesmaPlaylistaORM.pjesmaID == pjesmaID,
            PjesmaPlaylistaORM.playlistaID == playlistaID
        )
    )
    return result.scalar_one_or_none()

async def create_pjesma_playlista(session: AsyncSession, data: PjesmaPlaylistaCreate):
    # Umjesto direktnog unosa, koristi servis koji održava kružnu listu
    obj = await dodaj_pjesmu_na_kraj(session, data.playlistaID, data.pjesmaID)
    return obj

async def delete_pjesma_playlista(session: AsyncSession, pjesmaID: int, playlistaID: int):
    db_obj = await get_pjesma_playlista(session, pjesmaID, playlistaID)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
    return db_obj
