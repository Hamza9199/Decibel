from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from modeli.PjesmaPlaylista import PjesmaPlaylistaORM

async def prebroj_pjesme(session: AsyncSession, playlistaID: int) -> int:
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    return len(result.scalars().all())

async def postoji_pjesma_u_playlisti(session: AsyncSession, playlistaID: int, pjesmaID: int) -> bool:
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            and_(
                PjesmaPlaylistaORM.playlistaID == playlistaID,
                PjesmaPlaylistaORM.pjesmaID == pjesmaID
            )
        )
    )
    return result.scalar_one_or_none() is not None

async def pronadji_prvu_pjesmu(session: AsyncSession, playlistaID: int):
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            and_(
                PjesmaPlaylistaORM.playlistaID == playlistaID,
                PjesmaPlaylistaORM.pokazivacNaPrethodnuPjesmuID == None
            )
        )
    )
    obj = result.scalar_one_or_none()
    return obj.pjesmaID if obj else None

async def pronadji_zadnju_pjesmu(session: AsyncSession, playlistaID: int):
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            and_(
                PjesmaPlaylistaORM.playlistaID == playlistaID,
                PjesmaPlaylistaORM.pokazivacNaSljedecuPjesmuID == None
            )
        )
    )
    obj = result.scalar_one_or_none()
    return obj.pjesmaID if obj else None

async def dodaj_pjesmu_na_kraj(session: AsyncSession, playlistaID: int, pjesmaID: int):
    # Pronađi zadnju pjesmu
    zadnja = await pronadji_zadnju_pjesmu(session, playlistaID)
    nova = PjesmaPlaylistaORM(
        pjesmaID=pjesmaID,
        playlistaID=playlistaID,
        pokazivacNaPrethodnuPjesmuID=zadnja,
        pokazivacNaSljedecuPjesmuID=None
    )
    session.add(nova)
    if zadnja:
        # Update prethodne zadnje pjesme
        result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == zadnja
                )
            )
        )
        zadnja_obj = result.scalar_one_or_none()
        if zadnja_obj:
            zadnja_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
            session.add(zadnja_obj)
    await session.commit()
    return nova

async def obrisi_pjesmu(session: AsyncSession, playlistaID: int, pjesmaID: int):
    # Pronađi pjesmu
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            and_(
                PjesmaPlaylistaORM.playlistaID == playlistaID,
                PjesmaPlaylistaORM.pjesmaID == pjesmaID
            )
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        return False
    # Update pokazivače susjednih pjesama
    prethodna = obj.pokazivacNaPrethodnuPjesmuID
    sljedeca = obj.pokazivacNaSljedecuPjesmuID
    if prethodna:
        res_preth = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == prethodna
                )
            )
        )
        preth_obj = res_preth.scalar_one_or_none()
        if preth_obj:
            preth_obj.pokazivacNaSljedecuPjesmuID = sljedeca
            session.add(preth_obj)
    if sljedeca:
        res_sljed = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == sljedeca
                )
            )
        )
        sljed_obj = res_sljed.scalar_one_or_none()
        if sljed_obj:
            sljed_obj.pokazivacNaPrethodnuPjesmuID = prethodna
            session.add(sljed_obj)
    await session.delete(obj)
    await session.commit()
    return True

async def promjeni_redoslijed(session: AsyncSession, playlistaID: int, pjesmaID: int, nova_pozicija_iza_pjesmeID: int):
    """
    Pomjeri pjesmu (pjesmaID) na novo mjesto u playlisti (playlistaID), tako da bude odmah iza pjesme nova_pozicija_iza_pjesmeID.
    Ako je nova_pozicija_iza_pjesmeID=None, pjesma ide na početak.
    """
    # Ukloni pjesmu iz trenutnog mjesta
    await obrisi_pjesmu(session, playlistaID, pjesmaID)
    # Dodaj je iza pjesme sa ID nova_pozicija_iza_pjesmeID
    if nova_pozicija_iza_pjesmeID is None:
        # Dodaj na početak
        prva = await pronadji_prvu_pjesmu(session, playlistaID)
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=None,
            pokazivacNaSljedecuPjesmuID=prva
        )
        session.add(nova)
        if prva:
            result = await session.execute(
                select(PjesmaPlaylistaORM).where(
                    and_(
                        PjesmaPlaylistaORM.playlistaID == playlistaID,
                        PjesmaPlaylistaORM.pjesmaID == prva
                    )
                )
            )
            prva_obj = result.scalar_one_or_none()
            if prva_obj:
                prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
                session.add(prva_obj)
        await session.commit()
        return nova
    else:
        # Dodaj iza određene pjesme
        result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == nova_pozicija_iza_pjesmeID
                )
            )
        )
        target = result.scalar_one_or_none()
        if not target:
            return None
        sljedeca = target.pokazivacNaSljedecuPjesmuID
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=nova_pozicija_iza_pjesmeID,
            pokazivacNaSljedecuPjesmuID=sljedeca
        )
        session.add(nova)
        target.pokazivacNaSljedecuPjesmuID = pjesmaID
        session.add(target)
        if sljedeca:
            res_sljed = await session.execute(
                select(PjesmaPlaylistaORM).where(
                    and_(
                        PjesmaPlaylistaORM.playlistaID == playlistaID,
                        PjesmaPlaylistaORM.pjesmaID == sljedeca
                    )
                )
            )
            sljed_obj = res_sljed.scalar_one_or_none()
            if sljed_obj:
                sljed_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
                session.add(sljed_obj)
        await session.commit()
        return nova
