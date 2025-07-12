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

async def dodaj_pjesmu_na_kraj(session: AsyncSession, playlistaID: int, pjesmaID: int):
    """Dodaje pjesmu na kraj kružne playliste i održava pointere"""
    if await postoji_pjesma_u_playlisti(session, playlistaID, pjesmaID):
        raise ValueError("Pjesma već postoji u playlisti")

    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result.scalars().all()

    if not veze:
        # Prva pjesma, pokazivači na samu sebe
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=pjesmaID,
            pokazivacNaSljedecuPjesmuID=pjesmaID
        )
        session.add(nova)
        await session.commit()
        return nova
    else:
        # Pronađi zadnju pjesmu (ona kojoj pokazivacNaSljedecuPjesmuID == prva pjesma)
        # i prvu pjesmu (ona kojoj pokazivacNaPrethodnuPjesmuID == zadnja pjesma)
        # U kružnoj listi, možeš uzeti bilo koju pjesmu i pratiti pointere
        curr = veze[0]
        visited = set()
        while curr.pokazivacNaSljedecuPjesmuID != veze[0].pjesmaID and curr.pokazivacNaSljedecuPjesmuID not in visited:
            visited.add(curr.pjesmaID)
            next_obj = next((v for v in veze if v.pjesmaID == curr.pokazivacNaSljedecuPjesmuID), None)
            if not next_obj:
                break
            curr = next_obj
        zadnja = curr
        prva = next((v for v in veze if v.pjesmaID == zadnja.pokazivacNaSljedecuPjesmuID), None)
        if not prva:
            prva = veze[0]

        # Nova pjesma ide iza zadnje, ispred prve
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=zadnja.pjesmaID,
            pokazivacNaSljedecuPjesmuID=prva.pjesmaID
        )
        session.add(nova)

        # Ažuriraj pokazivače
        zadnja.pokazivacNaSljedecuPjesmuID = pjesmaID
        prva.pokazivacNaPrethodnuPjesmuID = pjesmaID
        session.add(zadnja)
        session.add(prva)

        await session.commit()
        return nova

async def pronadji_prvu_pjesmu(session: AsyncSession, playlistaID: int):
    """Pronalazi prvu pjesmu u kružnoj listi"""
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result.scalars().all()
    if not veze:
        return None
    # U kružnoj listi, možeš uzeti bilo koju pjesmu i pratiti pointere unazad dok se ne vratiš na početak
    curr = veze[0]
    visited = set()
    while curr.pokazivacNaPrethodnuPjesmuID != curr.pjesmaID and curr.pokazivacNaPrethodnuPjesmuID not in visited:
        visited.add(curr.pjesmaID)
        prev_obj = next((v for v in veze if v.pjesmaID == curr.pokazivacNaPrethodnuPjesmuID), None)
        if not prev_obj:
            break
        curr = prev_obj
    return curr.pjesmaID

async def pronadji_zadnju_pjesmu(session: AsyncSession, playlistaID: int):
    """Pronalazi zadnju pjesmu u kružnoj listi"""
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result.scalars().all()
    if not veze:
        return None
    curr = veze[0]
    visited = set()
    while curr.pokazivacNaSljedecuPjesmuID != curr.pjesmaID and curr.pokazivacNaSljedecuPjesmuID not in visited:
        visited.add(curr.pjesmaID)
        next_obj = next((v for v in veze if v.pjesmaID == curr.pokazivacNaSljedecuPjesmuID), None)
        if not next_obj:
            break
        curr = next_obj
    return curr.pjesmaID

async def obrisi_pjesmu(session: AsyncSession, playlistaID: int, pjesmaID: int):
    """Briše pjesmu iz kružne playliste i ažurira pointere"""
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

    prethodna_id = obj.pokazivacNaPrethodnuPjesmuID
    sljedeca_id = obj.pokazivacNaSljedecuPjesmuID

    if prethodna_id == pjesmaID and sljedeca_id == pjesmaID:
        # Jedina pjesma
        await session.delete(obj)
        await session.commit()
        return True

    # Ažuriraj pointere susjednih pjesama
    if prethodna_id:
        preth_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == prethodna_id
                )
            )
        )
        preth_obj = preth_result.scalar_one_or_none()
        if preth_obj:
            preth_obj.pokazivacNaSljedecuPjesmuID = sljedeca_id
            session.add(preth_obj)

    if sljedeca_id:
        sljed_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == sljedeca_id
                )
            )
        )
        sljed_obj = sljed_result.scalar_one_or_none()
        if sljed_obj:
            sljed_obj.pokazivacNaPrethodnuPjesmuID = prethodna_id
            session.add(sljed_obj)

    await session.delete(obj)
    await session.commit()
    return True

async def promjeni_redoslijed(session: AsyncSession, playlistaID: int, pjesmaID: int, nova_pozicija_iza_pjesmeID: int):
    """
    Pomjera pjesmu na novo mjesto u kružnoj playlisti.
    Ako je nova_pozicija_iza_pjesmeID=None, pjesma ide na početak.
    """
    # Prvo pronađi objekt pjesme
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
        return None

    # Ako je samo jedna pjesma, nema smisla mijenjati redoslijed
    result_all = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result_all.scalars().all()
    if len(veze) <= 1:
        return obj

    # Ako pokušavaš staviti pjesmu odmah iza sebe, nema smisla
    if nova_pozicija_iza_pjesmeID == pjesmaID:
        await session.commit()
        return obj

    # Prvo izbacivanje pjesme iz trenutnog mjesta (spoji prethodnu i sljedeću)
    stari_prethodna = obj.pokazivacNaPrethodnuPjesmuID
    stari_sljedeca = obj.pokazivacNaSljedecuPjesmuID

    if stari_prethodna and stari_prethodna != pjesmaID:
        preth_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == stari_prethodna
                )
            )
        )
        preth_obj = preth_result.scalar_one_or_none()
        if preth_obj:
            preth_obj.pokazivacNaSljedecuPjesmuID = stari_sljedeca
            session.add(preth_obj)

    if stari_sljedeca and stari_sljedeca != pjesmaID:
        sljed_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == stari_sljedeca
                )
            )
        )
        sljed_obj = sljed_result.scalar_one_or_none()
        if sljed_obj:
            sljed_obj.pokazivacNaPrethodnuPjesmuID = stari_prethodna
            session.add(sljed_obj)

    # Resetuj pointere prije umetanja na novo mjesto!
    obj.pokazivacNaPrethodnuPjesmuID = None
    obj.pokazivacNaSljedecuPjesmuID = None

    # Sada umetanje na novo mjesto
    if nova_pozicija_iza_pjesmeID is None:
        # Dodaj na početak (iza zadnje, ispred prve)
        prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
        zadnja_id = await pronadji_zadnju_pjesmu(session, playlistaID)
        if prva_id == pjesmaID:
            await session.commit()
            return obj

        obj.pokazivacNaPrethodnuPjesmuID = zadnja_id
        obj.pokazivacNaSljedecuPjesmuID = prva_id

        # Ažuriraj stare pointere
        prva_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == prva_id
                )
            )
        )
        prva_obj = prva_result.scalar_one_or_none()
        if prva_obj:
            prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
            session.add(prva_obj)

        zadnja_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == zadnja_id
                )
            )
        )
        zadnja_obj = zadnja_result.scalar_one_or_none()
        if zadnja_obj:
            zadnja_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
            session.add(zadnja_obj)
    else:
        # Dodaj iza određene pjesme
        target_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == nova_pozicija_iza_pjesmeID
                )
            )
        )
        target = target_result.scalar_one_or_none()
        if not target or target.pjesmaID == pjesmaID:
            await session.commit()
            return obj

        # Provjeri da li je target zadnja pjesma (pokazivacNaSljedecuPjesmuID pokazuje na prvu)
        prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
        if target.pokazivacNaSljedecuPjesmuID == prva_id:
            # Umetanje na kraj
            obj.pokazivacNaPrethodnuPjesmuID = target.pjesmaID
            obj.pokazivacNaSljedecuPjesmuID = prva_id

            target.pokazivacNaSljedecuPjesmuID = pjesmaID
            session.add(target)

            # Ažuriraj prvu pjesmu da pokazuje na novu zadnju
            prva_result = await session.execute(
                select(PjesmaPlaylistaORM).where(
                    and_(
                        PjesmaPlaylistaORM.playlistaID == playlistaID,
                        PjesmaPlaylistaORM.pjesmaID == prva_id
                    )
                )
            )
            prva_obj = prva_result.scalar_one_or_none()
            if prva_obj:
                prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
                session.add(prva_obj)
        else:
            # Umetanje u sredinu
            sljedeca_id = target.pokazivacNaSljedecuPjesmuID

            # Ako je sljedeća pjesma ona koju pomjeramo, nema potrebe za promjenom
            if sljedeca_id == pjesmaID:
                await session.commit()
                return obj

            obj.pokazivacNaPrethodnuPjesmuID = target.pjesmaID
            obj.pokazivacNaSljedecuPjesmuID = sljedeca_id

            target.pokazivacNaSljedecuPjesmuID = pjesmaID
            session.add(target)

            if sljedeca_id and sljedeca_id != pjesmaID:
                sljed_result = await session.execute(
                    select(PjesmaPlaylistaORM).where(
                        and_(
                            PjesmaPlaylistaORM.playlistaID == playlistaID,
                            PjesmaPlaylistaORM.pjesmaID == sljedeca_id
                        )
                    )
                )
                sljed_obj = sljed_result.scalar_one_or_none()
                if sljed_obj:
                    sljed_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
                    session.add(sljed_obj)

    session.add(obj)
    await session.commit()
    return obj

async def dobij_redoslijed_playliste(session: AsyncSession, playlistaID: int) -> list:
    """Vraća listu pjesama u redoslijedu kružne playliste, počevši od prve"""
    prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
    if not prva_id:
        return []

    redoslijed = []
    trenutna_id = prva_id
    visited = set()

    while trenutna_id and trenutna_id not in visited:
        visited.add(trenutna_id)
        redoslijed.append(trenutna_id)
        result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == trenutna_id
                )
            )
        )
        trenutna = result.scalar_one_or_none()
        if not trenutna:
            break
        sljedeca_id = trenutna.pokazivacNaSljedecuPjesmuID
        if sljedeca_id == prva_id or sljedeca_id is None:
            break
        trenutna_id = sljedeca_id

    return redoslijed