from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload  # Dodaj joinedload
import datetime

from modeli.KorisnikPretplata import KorisnikPretplataORM, KorisnikPretplata, KorisnikPretplataCreate

async def get_all_korisnik_pretplata(session: AsyncSession):
    result = await session.execute(
        select(KorisnikPretplataORM).options(joinedload(KorisnikPretplataORM.pretplata))  # koristi joinedload
    )
    return result.scalars().all()

async def get_korisnik_pretplata_by_id(session: AsyncSession, korisnik_pretplata_id: int):
    result = await session.execute(
        select(KorisnikPretplataORM).options(joinedload(KorisnikPretplataORM.pretplata)).where(KorisnikPretplataORM.id == korisnik_pretplata_id)
    )
    return result.scalar_one_or_none()

async def create_korisnik_pretplata(session: AsyncSession, data: KorisnikPretplataCreate):
    # Prvo provjeri postoji li već pretplata za korisnika
    existing = await session.execute(
        select(KorisnikPretplataORM).where(KorisnikPretplataORM.korisnikID == data.korisnikID)
    )
    existing_obj = existing.scalar_one_or_none()
    if existing_obj:
        # Ako postoji, ažuriraj postojeću pretplatu (obnova)
        existing_obj.pretplataID = data.pretplataID
        existing_obj.pretplataStatus = data.pretplataStatus
        existing_obj.kreiranDatumVrijeme = datetime.datetime.utcnow()
        existing_obj.datumIsteka = existing_obj.kreiranDatumVrijeme + datetime.timedelta(days=30)
        existing_obj.datumVrijemeObnove = existing_obj.kreiranDatumVrijeme
        session.add(existing_obj)
        await session.commit()
        await session.refresh(existing_obj)
        # Ovdje koristi joinedload da bi pretplata bila odmah dostupna
        await session.refresh(existing_obj, attribute_names=["pretplata"])
        return existing_obj
    # Ako ne postoji, kreiraj novu pretplatu
    db_obj = KorisnikPretplataORM(**data.dict())
    db_obj.kreiranDatumVrijeme = datetime.datetime.utcnow()
    db_obj.datumIsteka = db_obj.kreiranDatumVrijeme + datetime.timedelta(days=30)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    await session.refresh(db_obj, attribute_names=["pretplata"])
    return db_obj

async def delete_korisnik_pretplata(session: AsyncSession, korisnik_pretplata_id: int):
    db_obj = await get_korisnik_pretplata_by_id(session, korisnik_pretplata_id)
    if not db_obj:
        return None
    await session.delete(db_obj)
    await session.commit()
    return db_obj
