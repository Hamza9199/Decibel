from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.KorisnikAlbum import KorisnikAlbumORM, KorisnikAlbum, KorisnikAlbumCreate

async def get_all_korisnik_album(session: AsyncSession):
    result = await session.execute(select(KorisnikAlbumORM))
    return result.scalars().all()

async def get_korisnik_album(session: AsyncSession, korisnikID: str, albumID: int):
    result = await session.execute(
        select(KorisnikAlbumORM).where(
            KorisnikAlbumORM.korisnikID == korisnikID,
            KorisnikAlbumORM.albumID == albumID
        )
    )
    return result.scalar_one_or_none()

async def create_korisnik_album(session: AsyncSession, data: KorisnikAlbumCreate):
    db_obj = KorisnikAlbumORM(**data.dict())
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_korisnik_album(session: AsyncSession, korisnikID: str, albumID: int):
    db_obj = await get_korisnik_album(session, korisnikID, albumID)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
