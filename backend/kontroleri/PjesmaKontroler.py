from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


from modeli.Pjesma import PjesmaORM, Pjesma, PjesmaCreate
from modeli.IzvodjacPjesma import IzvodjacPjesmaORM
from modeli.KorisnikPjesma import KorisnikPjesmaORM
from modeli.HistorijaSlusanja import HistorijaSlusanjaORM
from modeli.StatistikaReprodukcije import StatistikaReprodukcijeORM
from modeli.PjesmaPlaylista import PjesmaPlaylistaORM
from servisi.PlaylistaRedoslijed import obrisi_pjesmu
from sqlalchemy import delete, update


async def get_all_pjesme(session: AsyncSession):
    result = await session.execute(
        select(PjesmaORM).options(selectinload(PjesmaORM.korisnik))
    )
    pjesme = result.scalars().all()
    return pjesme

async def get_pjesma_by_id(session: AsyncSession, pjesma_id: int):
    result = await session.execute(
        select(PjesmaORM).options(selectinload(PjesmaORM.korisnik)).where(PjesmaORM.id == pjesma_id)
    )
    return result.scalar_one_or_none()

async def create_pjesma(session: AsyncSession, pjesma: PjesmaCreate):
    db_pjesma = PjesmaORM(**pjesma.dict())
    session.add(db_pjesma)
    await session.commit()
    await session.refresh(db_pjesma)
    await session.refresh(db_pjesma, attribute_names=["korisnik"])
    return db_pjesma

async def update_pjesma(session: AsyncSession, pjesma_id: int, pjesma: PjesmaCreate):
    db_pjesma = await get_pjesma_by_id(session, pjesma_id)
    if not db_pjesma:
        return None
    for key, value in pjesma.dict().items():
        setattr(db_pjesma, key, value)
    session.add(db_pjesma)
    await session.commit()
    await session.refresh(db_pjesma)
    await session.refresh(db_pjesma, attribute_names=["korisnik"])
    return db_pjesma

async def delete_pjesma(
    session: AsyncSession,
    pjesma_id: int
):
    db_pjesma = await get_pjesma_by_id(
        session,
        pjesma_id
    )

    if not db_pjesma:
        return None

    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            PjesmaPlaylistaORM.pjesmaID == pjesma_id
        )
    )

    veze = result.scalars().all()

    for veza in veze:
        await obrisi_pjesmu(
            session,
            veza.playlistaID,
            pjesma_id
        )

    await session.execute(
        delete(IzvodjacPjesmaORM).where(
            IzvodjacPjesmaORM.pjesmaID == pjesma_id
        )
    )

    await session.execute(
        delete(KorisnikPjesmaORM).where(
            KorisnikPjesmaORM.pjesmaID == pjesma_id
        )
    )

    await session.execute(
        delete(HistorijaSlusanjaORM).where(
            HistorijaSlusanjaORM.pjesmaID == pjesma_id
        )
    )

    await session.execute(
        delete(StatistikaReprodukcijeORM).where(
            StatistikaReprodukcijeORM.pjesmaID == pjesma_id
        )
    )

    await session.delete(db_pjesma)
    await session.commit()

    return db_pjesma


async def get_pjesme_by_korisnik_id(
    session: AsyncSession,
    korisnik_id: str
):
    result = await session.execute(
        select(PjesmaORM).where(
            PjesmaORM.korisnikID == korisnik_id
        )
    )
    return result.scalars().all()