from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
import datetime

from modeli.KorisnikPretplata import KorisnikPretplataORM, KorisnikPretplata, KorisnikPretplataCreate
from modeli.ObnovaPretplate import ObnovaPretplateORM

async def get_all_korisnik_pretplata(session: AsyncSession):
    result = await session.execute(
        select(KorisnikPretplataORM).options(joinedload(KorisnikPretplataORM.pretplata))
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
    now = datetime.datetime.utcnow()
    mjesec = datetime.timedelta(days=30)
    if existing_obj:
        # Ako je aktivna i još nije istekla, produži od trenutnog datumIsteka
        if existing_obj.datumIsteka and existing_obj.datumIsteka > now:
            # Dozvoli obnovu samo ako je do isteka ostalo najviše mjesec dana
            if (existing_obj.datumIsteka - now) > mjesec:
                raise Exception("Pretplatu možete obnoviti najviše mjesec dana prije isteka.")
            existing_obj.datumVrijemeObnove = now
            existing_obj.datumIsteka = existing_obj.datumIsteka + mjesec
        else:
            # Ako je istekla, novi period od sada
            existing_obj.datumVrijemeObnove = now
            existing_obj.datumIsteka = now + mjesec
        existing_obj.pretplataID = data.pretplataID
        existing_obj.pretplataStatus = data.pretplataStatus
        existing_obj.kreiranDatumVrijeme = now
        session.add(existing_obj)
        # Zapiši obnovu u tabelu ObnovaPretplate
        try:
            from modeli.Pretplata import PretplataORM
            pretplata = await session.get(PretplataORM, data.pretplataID)
            iznos = float(pretplata.cijena) if pretplata else 0.0
        except Exception:
            iznos = 0.0
        obnova = ObnovaPretplateORM(
            korisnikPretplataID=existing_obj.id,
            datumObnove=now,
            iznosObnove=iznos,
            kreiranDatumVrijeme=now
        )
        session.add(obnova)
        await session.commit()
        await session.refresh(existing_obj)
        await session.refresh(existing_obj, attribute_names=["pretplata"])
        return existing_obj
    # Ako ne postoji, kreiraj novu pretplatu
    db_obj = KorisnikPretplataORM(**data.dict())
    db_obj.kreiranDatumVrijeme = now
    db_obj.datumIsteka = now + mjesec
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
