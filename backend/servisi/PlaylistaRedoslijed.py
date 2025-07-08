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
    """Dodaje pjesmu na kraj playliste i održava kružnu listu"""
    
    # Provjeri da li pjesma već postoji u playlisti
    if await postoji_pjesma_u_playlisti(session, playlistaID, pjesmaID):
        raise ValueError("Pjesma već postoji u playlisti")
    
    # Dohvati sve postojeće veze za playlistu
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result.scalars().all()
    
    if not veze:
        # Prva pjesma u playlisti - pokazivači na samu sebe (kružna lista)
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
        # Pronađi prvu i zadnju pjesmu u kružnoj listi
        prva = None
        zadnja = None
        
        for veza in veze:
            # Prva pjesma: ona čiji prethodni pokazivač pokazuje na zadnju pjesmu
            # Zadnja pjesma: ona čiji sljedeći pokazivač pokazuje na prvu pjesmu
            if veza.pokazivacNaPrethodnuPjesmuID != veza.pjesmaID:
                # Provjeri da li je ova pjesma prva (njen prethodni je zadnja)
                prethodna_result = await session.execute(
                    select(PjesmaPlaylistaORM).where(
                        and_(
                            PjesmaPlaylistaORM.playlistaID == playlistaID,
                            PjesmaPlaylistaORM.pjesmaID == veza.pokazivacNaPrethodnuPjesmuID
                        )
                    )
                )
                prethodna = prethodna_result.scalar_one_or_none()
                if prethodna and prethodna.pokazivacNaSljedecuPjesmuID == veza.pjesmaID:
                    # Ova je prva jer prethodna pokazuje na nju
                    if not prva:
                        prva = veza
                
                # Provjeri da li je ova pjesma zadnja (njen sljedeći je prva)
                sljedeca_result = await session.execute(
                    select(PjesmaPlaylistaORM).where(
                        and_(
                            PjesmaPlaylistaORM.playlistaID == playlistaID,
                            PjesmaPlaylistaORM.pjesmaID == veza.pokazivacNaSljedecuPjesmuID
                        )
                    )
                )
                sljedeca = sljedeca_result.scalar_one_or_none()
                if sljedeca and sljedeca.pokazivacNaPrethodnuPjesmuID == veza.pjesmaID:
                    # Ova je zadnja jer sljedeća pokazuje na nju kao prethodnu
                    if not zadnja:
                        zadnja = veza
        
        # Fallback ako algoritam ne pronađe prvu/zadnju
        if not prva or not zadnja:
            # Jednostavniji pristup - uzmi bilo koje dvije
            prva = veze[0]
            zadnja = veze[-1] if len(veze) > 1 else veze[0]
        
        # Kreiraj novu pjesmu
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=zadnja.pjesmaID,
            pokazivacNaSljedecuPjesmuID=prva.pjesmaID
        )
        session.add(nova)
        
        # Ažuriraj pokazivače postojećih pjesama
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
    
    if len(veze) == 1:
        return veze[0].pjesmaID
    
    # Pronađi pjesmu čiji prethodni pokazivač pokazuje na zadnju
    for veza in veze:
        prethodna_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == veza.pokazivacNaPrethodnuPjesmuID
                )
            )
        )
        prethodna = prethodna_result.scalar_one_or_none()
        if prethodna and prethodna.pokazivacNaSljedecuPjesmuID == veza.pjesmaID:
            return veza.pjesmaID
    
    # Fallback
    return veze[0].pjesmaID

async def pronadji_zadnju_pjesmu(session: AsyncSession, playlistaID: int):
    """Pronalazi zadnju pjesmu u kružnoj listi"""
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result.scalars().all()
    
    if not veze:
        return None
    
    if len(veze) == 1:
        return veze[0].pjesmaID
    
    # Pronađi pjesmu čiji sljedeći pokazivač pokazuje na prvu
    for veza in veze:
        sljedeca_result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == veza.pokazivacNaSljedecuPjesmuID
                )
            )
        )
        sljedeca = sljedeca_result.scalar_one_or_none()
        if sljedeca and sljedeca.pokazivacNaPrethodnuPjesmuID == veza.pjesmaID:
            return veza.pjesmaID
    
    # Fallback
    return veze[-1].pjesmaID

async def obrisi_pjesmu(session: AsyncSession, playlistaID: int, pjesmaID: int):
    """Briše pjesmu iz playliste i ažurira pokazivače"""
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
    
    # Dohvati prethodnu i sljedeću pjesmu
    prethodna_id = obj.pokazivacNaPrethodnuPjesmuID
    sljedeca_id = obj.pokazivacNaSljedecuPjesmuID
    
    # Ako je ovo jedina pjesma u playlisti
    if prethodna_id == pjesmaID and sljedeca_id == pjesmaID:
        await session.delete(obj)
        await session.commit()
        return True
    
    # Ažuriraj pokazivače susjednih pjesama
    if prethodna_id and prethodna_id != pjesmaID:
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
            sljed_obj.pokazivacNaPrethodnuPjesmuID = prethodna_id
            session.add(sljed_obj)
    
    await session.delete(obj)
    await session.commit()
    return True

async def promjeni_redoslijed(session: AsyncSession, playlistaID: int, pjesmaID: int, nova_pozicija_iza_pjesmeID: int):
    """
    Pomjera pjesmu na novo mjesto u playlisti.
    Ako je nova_pozicija_iza_pjesmeID=None, pjesma ide na početak.
    """
    # Prvo ukloni pjesmu iz trenutnog mjesta
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
    
    # Sačuvaj trenutne pokazivače prije brisanja
    stari_prethodna = obj.pokazivacNaPrethodnuPjesmuID
    stari_sljedeca = obj.pokazivacNaSljedecuPjesmuID
    
    # Ukloni pjesmu iz trenutnog mjesta (ali ne briši iz baze)
    if stari_prethodna != pjesmaID:
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
    
    if stari_sljedeca != pjesmaID:
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
    
    # Dodaj pjesmu na novo mjesto
    if nova_pozicija_iza_pjesmeID is None:
        # Dodaj na početak
        prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
        zadnja_id = await pronadji_zadnju_pjesmu(session, playlistaID)
        
        obj.pokazivacNaPrethodnuPjesmuID = zadnja_id
        obj.pokazivacNaSljedecuPjesmuID = prva_id
        
        if prva_id and prva_id != pjesmaID:
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
        
        if zadnja_id and zadnja_id != pjesmaID:
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
        
        if not target:
            return None
        
        sljedeca_id = target.pokazivacNaSljedecuPjesmuID
        
        # Ažuriraj pokazivače
        obj.pokazivacNaPrethodnuPjesmuID = nova_pozicija_iza_pjesmeID
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
    """Vraća listu pjesama u redoslijedu playliste"""
    prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
    if not prva_id:
        return []
    
    redoslijed = []
    trenutna_id = prva_id
    posjecene = set()
    
    while trenutna_id and trenutna_id not in posjecene:
        posjecene.add(trenutna_id)
        redoslijed.append(trenutna_id)
        
        # Pronađi sljedeću pjesmu
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
        
        # Zaustavi se ako smo došli do kraja kružne liste
        if sljedeca_id == prva_id:
            break
            
        trenutna_id = sljedeca_id
    
    return redoslijed