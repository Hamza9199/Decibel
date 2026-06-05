from sqlalchemy.future import select
import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from modeli.HistorijaSlusanja import HistorijaSlusanjaORM, HistorijaSlusanja, HistorijaSlusanjaCreate

async def get_all_historija(session: AsyncSession):
    result = await session.execute(select(HistorijaSlusanjaORM))
    return result.scalars().all()

async def get_historija_by_id(session: AsyncSession, historija_id: int):
    result = await session.execute(select(HistorijaSlusanjaORM).where(HistorijaSlusanjaORM.id == historija_id))
    return result.scalar_one_or_none()

async def create_or_update_historija(session: AsyncSession, historija: HistorijaSlusanjaCreate):
    result = await session.execute(
        select(HistorijaSlusanjaORM).where(
            HistorijaSlusanjaORM.korisnikID == historija.korisnikID,
            HistorijaSlusanjaORM.pjesmaID == historija.pjesmaID,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.kreiranDatumVrijeme = historija.kreiranDatumVrijeme or datetime.datetime.utcnow()
        existing.trajanje = historija.trajanje
        existing.kontekstPustanjaURL = historija.kontekstPustanjaURL
        existing.offline = historija.offline
        existing.kontekstPustanja = historija.kontekstPustanja
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        return existing
    else:
        db_historija = HistorijaSlusanjaORM(**historija.dict())
        session.add(db_historija)
        await session.commit()
        await session.refresh(db_historija)
        return db_historija

async def delete_historija(session: AsyncSession, historija_id: int):
    db_historija = await get_historija_by_id(session, historija_id)
    if not db_historija:
        return None
    await session.delete(db_historija)
    await session.commit()
    return db_historija

async def delete_existing_historija_for_user_song(session: AsyncSession, korisnik_id: str, pjesma_id: int):
    """Obriši postojeći zapis historije za korisnika i pjesmu (ako postoji)"""
    result = await session.execute(
        select(HistorijaSlusanjaORM).where(
            HistorijaSlusanjaORM.korisnikID == korisnik_id,
            HistorijaSlusanjaORM.pjesmaID == pjesma_id
        )
    )
    postojeci = result.scalar_one_or_none()
    if postojeci:
        await session.delete(postojeci)
        await session.flush()
    return postojeci

async def create_historija_without_duplicates(session: AsyncSession, historija: HistorijaSlusanjaCreate):
    """Kreiraj novu historiju, prethodno obrisavši postojeću za isti korisnik-pjesma par"""
    await delete_existing_historija_for_user_song(session, historija.korisnikID, historija.pjesmaID)
    
    db_historija = HistorijaSlusanjaORM(**historija.dict())
    session.add(db_historija)
    await session.commit()
    await session.refresh(db_historija)
    return db_historija
