from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.KorisnikAlbum import KorisnikAlbumORM, KorisnikAlbum, KorisnikAlbumCreate
from modeli.Album import AlbumORM

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
    album = await session.get(AlbumORM, data.albumID)
    if album:
        album.brojLajkova = (album.brojLajkova or 0) + 1
        session.add(album)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj

async def delete_korisnik_album(session: AsyncSession, korisnikID: str, albumID: int):
    db_obj = await get_korisnik_album(session, korisnikID, albumID)
    if not db_obj:
        return None
    await session.delete(db_obj)
    album = await session.get(AlbumORM, albumID)
    if album and (album.brojLajkova or 0) > 0:
        album.brojLajkova -= 1
        session.add(album)
    await session.commit()
    return db_obj

async def get_all_korisnik_album(session: AsyncSession, korisnikID: str):
    result = await session.execute(
        select(KorisnikAlbumORM).where(KorisnikAlbumORM.korisnikID == korisnikID)
    )
    return result.scalars().all()
