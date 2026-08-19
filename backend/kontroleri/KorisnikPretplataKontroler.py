from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
import datetime


from modeli.KorisnikPretplata import KorisnikPretplataORM, KorisnikPretplata, KorisnikPretplataCreate
from modeli.ObnovaPretplate import ObnovaPretplateORM
from modeli.PretplataStatus import PretplataStatusEnum

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
    existing = await session.execute(
        select(KorisnikPretplataORM).where(KorisnikPretplataORM.korisnikID == data.korisnikID)
    )
    existing_obj = existing.scalar_one_or_none()
    now = datetime.datetime.utcnow()
    mjesec = datetime.timedelta(days=30)
    if existing_obj:
        if existing_obj.datumIsteka and existing_obj.datumIsteka > now:
            if (existing_obj.datumIsteka - now) > mjesec:
                raise Exception("Pretplatu možete obnoviti najviše mjesec dana prije isteka.")
            existing_obj.datumVrijemeObnove = now
            existing_obj.datumIsteka = existing_obj.datumIsteka + mjesec
        else:
            existing_obj.datumVrijemeObnove = now
            existing_obj.datumIsteka = now + mjesec
        existing_obj.pretplataID = data.pretplataID
        existing_obj.pretplataStatus = data.pretplataStatus
        existing_obj.kreiranDatumVrijeme = now
        session.add(existing_obj)
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
    db_obj.pretplataStatus = PretplataStatusEnum.pauzirana
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    await session.refresh(db_obj, attribute_names=["pretplata"])
    return db_obj


async def get_korisnik_pretplata_by_korisnik_id(session: AsyncSession, korisnik_id: str):
    result = await session.execute(
        select(KorisnikPretplataORM).options(joinedload(KorisnikPretplataORM.pretplata)).where(KorisnikPretplataORM.korisnikID == korisnik_id)
    )
    return result.scalar_one_or_none()


async def create_free_pretplata_for_user(session: AsyncSession, korisnik_id: str, pretplata_id: int):
    """
    Kreira 3 mjeseca besplatne pretplate za korisnika koji nema aktivnu pretplatu.
    """
    # Provjeri da li korisnik već ima pretplatu
    existing = await session.execute(
        select(KorisnikPretplataORM).where(KorisnikPretplataORM.korisnikID == korisnik_id)
    )
    existing_obj = existing.scalar_one_or_none()
    
    if existing_obj:
        raise Exception("Korisnik već ima pretplatu")
    
    # Provjeri da li pretplata postoji
    from modeli.Pretplata import PretplataORM
    pretplata = await session.get(PretplataORM, pretplata_id)
    if not pretplata:
        raise Exception("Pretplata nije pronađena")
    
    now = datetime.datetime.utcnow()
    tri_mjeseca = datetime.timedelta(days=90)  # 3 mjeseca
    
    # Kreiraj novu pretplatu za korisnika
    db_obj = KorisnikPretplataORM(
        korisnikID=korisnik_id,
        pretplataID=pretplata_id,
        pretplataStatus=PretplataStatusEnum.aktivna,
        kreiranDatumVrijeme=now,
        datumVrijemeObnove=now,
        datumIsteka=now + tri_mjeseca
    )
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    await session.refresh(db_obj, attribute_names=["pretplata"])
    return db_obj
