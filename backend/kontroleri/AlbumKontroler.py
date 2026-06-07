from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, update

from modeli.Album import AlbumORM, Album, AlbumCreate
from modeli.Pjesma import PjesmaORM
from modeli.KorisnikAlbum import KorisnikAlbumORM


async def get_all_albumi(session: AsyncSession):
    result = await session.execute(
        select(AlbumORM).options(selectinload(AlbumORM.korisnik))
    )
    return result.scalars().all()

async def get_album_by_id(session: AsyncSession, album_id: int):
    result = await session.execute(
        select(AlbumORM).options(selectinload(AlbumORM.korisnik)).where(AlbumORM.id == album_id)
    )
    return result.scalar_one_or_none()

async def create_album(session: AsyncSession, album: AlbumCreate):
    db_album = AlbumORM(**album.dict())
    session.add(db_album)
    await session.commit()
    await session.refresh(db_album)
    # Učitaj korisnika
    await session.refresh(db_album, attribute_names=["korisnik"])
    return db_album

async def update_album(session: AsyncSession, album_id: int, album: AlbumCreate):
    db_album = await get_album_by_id(session, album_id)
    if not db_album:
        return None
    for key, value in album.dict().items():
        setattr(db_album, key, value)
    session.add(db_album)
    await session.commit()
    await session.refresh(db_album)
    await session.refresh(db_album, attribute_names=["korisnik"])
    return db_album

async def delete_album(
    session: AsyncSession,
    album_id: int
):
    db_album = await get_album_by_id(
        session,
        album_id
    )

    if not db_album:
        return None

    await session.execute(
        delete(KorisnikAlbumORM).where(
            KorisnikAlbumORM.albumID == album_id
        )
    )

    await session.execute(
        update(PjesmaORM)
        .where(PjesmaORM.albumID == album_id)
        .values(albumID=None)
    )

    await session.delete(db_album)

    await session.commit()

    return db_album

async def get_albumi_by_korisnik_id(session: AsyncSession, korisnik_id: int):
    result = await session.execute(
        select(AlbumORM).options(selectinload(AlbumORM.korisnik)).where(AlbumORM.korisnik_id == korisnik_id)
    )
    return result.scalars().all()

async def get_pjesme_by_album_id(session: AsyncSession, album_id: int):
    result = await session.execute(
        select(AlbumORM.pjesme).where(AlbumORM.id == album_id)
    )
    return result.scalars().all() if result else None

async def dodaj_pjesmu_u_album(
    session: AsyncSession,
    album_id: int,
    pjesma_id: int
):
    result = await session.execute(
        select(PjesmaORM).where(
            PjesmaORM.id == pjesma_id
        )
    )

    pjesma = result.scalar_one_or_none()

    if not pjesma:
        return None

    pjesma.albumID = album_id

    session.add(pjesma)
    await session.commit()
    await session.refresh(pjesma)

    return pjesma


async def ukloni_pjesmu_iz_albuma(
    session: AsyncSession,
    album_id: int,
    pjesma_id: int
):
    result = await session.execute(
        select(PjesmaORM).where(
            PjesmaORM.id == pjesma_id,
            PjesmaORM.albumID == album_id
        )
    )

    pjesma = result.scalar_one_or_none()

    if not pjesma:
        return None

    pjesma.albumID = None

    session.add(pjesma)
    await session.commit()
    await session.refresh(pjesma)

    return pjesma