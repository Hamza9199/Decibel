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
        # Pronađi pravu zadnju pjesmu
        zadnja_id = await pronadji_zadnju_pjesmu(session, playlistaID)
        prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
        
        # Dohvati objekte
        zadnja_obj = next((v for v in veze if v.pjesmaID == zadnja_id), None)
        prva_obj = next((v for v in veze if v.pjesmaID == prva_id), None)
        
        if not zadnja_obj or not prva_obj:
            raise ValueError("Neispravna struktura playliste")

        # Nova pjesma postaje nova zadnja
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=zadnja_id,  # Pokazuje na staru zadnju
            pokazivacNaSljedecuPjesmuID=prva_id      # Pokazuje na prvu (kružno)
        )
        session.add(nova)

        # Ažuriraj staru zadnju da pokazuje na novu
        zadnja_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
        session.add(zadnja_obj)
        
        # Ažuriraj prvu da pokazuje na novu zadnju kao prethodnu
        prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
        session.add(prva_obj)

        await session.commit()
        return nova

async def pronadji_prvu_pjesmu(session: AsyncSession, playlistaID: int):
    """Pronalazi prvu pjesmu u kružnoj listi - počinje sa bilo koju i prati unazad"""
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result.scalars().all()
    if not veze:
        return None
    
    if len(veze) == 1:
        return veze[0].pjesmaID
    
    # Početni čvor
    start = veze[0]
    current = start
    visited = set()
    
    # Prati pokazivače unazad dok ne dođemo do čvora koji pokazuje na početni
    while current.pjesmaID not in visited:
        visited.add(current.pjesmaID)
        prev_id = current.pokazivacNaPrethodnuPjesmuID
        
        # Ako pokazuje na sebe, to je jedina pjesma ili greška
        if prev_id == current.pjesmaID:
            return current.pjesmaID
            
        prev_obj = next((v for v in veze if v.pjesmaID == prev_id), None)
        if not prev_obj:
            break
            
        # Ako prev_obj pokazuje na start, onda je start prva pjesma
        if prev_obj.pokazivacNaSljedecuPjesmuID == start.pjesmaID:
            return start.pjesmaID
            
        current = prev_obj
    
    return start.pjesmaID

async def pronadji_zadnju_pjesmu(session: AsyncSession, playlistaID: int):
    """Pronalazi zadnju pjesmu u kružnoj listi - ona koja pokazuje na prvu"""
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result.scalars().all()
    if not veze:
        return None
        
    if len(veze) == 1:
        return veze[0].pjesmaID
    
    # Pronađi prvu pjesmu prvo
    prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
    
    # Zadnja pjesma je ona koja pokazuje na prvu
    for veza in veze:
        if veza.pokazivacNaSljedecuPjesmuID == prva_id:
            return veza.pjesmaID
    
    # Ako nema, vrati bilo koju kao zadnju
    return veze[0].pjesmaID

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

async def promjeni_redoslijed(session: AsyncSession, playlistaID: int, pjesmaID: int, nova_pozicija_iza_pjesmeID: int | None):
    """
    Pomjera pjesmu na novo mjesto u kružnoj playlisti.
    Ako je nova_pozicija_iza_pjesmeID=None, pjesma ide na početak (prije prve).
    """
    # Pronađi objekt pjesme koju pomjeramo
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

    # Dohvati sve veze u playlisti
    result_all = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result_all.scalars().all()
    
    # Ako je samo jedna pjesma, nema smisla mijenjati redoslijed
    if len(veze) <= 1:
        return obj

    # Ako pokušavaš staviti pjesmu odmah iza sebe, nema smisla
    if nova_pozicija_iza_pjesmeID == pjesmaID:
        await session.commit()
        return obj

    # Dohvati trenutne susjedne pjesme prije uklanjanja
    stari_prethodna = obj.pokazivacNaPrethodnuPjesmuID
    stari_sljedeca = obj.pokazivacNaSljedecuPjesmuID

    # Ako premještamo na prvo mjesto
    if nova_pozicija_iza_pjesmeID is None:
        # Trebamo pronaći koja je trenutno prva i zadnja pjesma
        # Prva je ona na koju pokazuje naša prethodna
        # Zadnja je ona koja pokazuje na našu sljedeću
        
        if len(veze) == 1:
            # Jedina pjesma - pokazuje na sebe
            obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
            obj.pokazivacNaSljedecuPjesmuID = pjesmaID
            session.add(obj)
            await session.commit()
            return obj
        
        # Pronađi pravu prvu i zadnju bez pozivanja funkcija
        trenutna_prva_id = None
        trenutna_zadnja_id = None
        
        # Ako je naša sljedeća različita od nas, to je prva
        if stari_sljedeca and stari_sljedeca != pjesmaID:
            trenutna_prva_id = stari_sljedeca
        
        # Ako je naša prethodna različita od nas, to je zadnja  
        if stari_prethodna and stari_prethodna != pjesmaID:
            trenutna_zadnja_id = stari_prethodna
            
        if not trenutna_prva_id or not trenutna_zadnja_id:
            # Fallback - pronađi bilo koju drugu pjesmu
            for v in veze:
                if v.pjesmaID != pjesmaID:
                    if not trenutna_prva_id:
                        trenutna_prva_id = v.pjesmaID
                    if not trenutna_zadnja_id:  
                        trenutna_zadnja_id = v.pjesmaID
                    break

        # 1. Spoji susjedne pjesme da uklonimo trenutnu
        preth_obj = next((v for v in veze if v.pjesmaID == stari_prethodna), None)
        sljed_obj = next((v for v in veze if v.pjesmaID == stari_sljedeca), None)
        
        if preth_obj and preth_obj.pjesmaID != pjesmaID:
            preth_obj.pokazivacNaSljedecuPjesmuID = stari_sljedeca
            session.add(preth_obj)
            
        if sljed_obj and sljed_obj.pjesmaID != pjesmaID:
            sljed_obj.pokazivacNaPrethodnuPjesmuID = stari_prethodna
            session.add(sljed_obj)

        # 2. Postavi novu pjesmu kao prvu
        if trenutna_prva_id and trenutna_zadnja_id:
            obj.pokazivacNaPrethodnuPjesmuID = trenutna_zadnja_id
            obj.pokazivacNaSljedecuPjesmuID = trenutna_prva_id
            
            # Ažuriraj zadnju da pokazuje na novu prvu
            zadnja_obj = next((v for v in veze if v.pjesmaID == trenutna_zadnja_id), None)
            if zadnja_obj:
                zadnja_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
                session.add(zadnja_obj)
            
            # Ažuriraj staru prvu da pokazuje na novu kao prethodnu
            prva_obj = next((v for v in veze if v.pjesmaID == trenutna_prva_id), None)
            if prva_obj:
                prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
                session.add(prva_obj)

    else:
        # Dodaj iza određene pjesme (target)
        target = next((v for v in veze if v.pjesmaID == nova_pozicija_iza_pjesmeID), None)
        if not target:
            await session.commit()
            return obj

        sljedeca_id = target.pokazivacNaSljedecuPjesmuID

        # Ako je targetova sljedeća pjesma ona koju pomjeramo, nema potrebe za promjenom
        if sljedeca_id == pjesmaID:
            await session.commit()
            return obj

        # 1. Prvo ukloni pjesmu iz trenutnog mjesta
        preth_obj = next((v for v in veze if v.pjesmaID == stari_prethodna), None)
        sljed_obj = next((v for v in veze if v.pjesmaID == stari_sljedeca), None)
        
        if preth_obj and preth_obj.pjesmaID != pjesmaID:
            preth_obj.pokazivacNaSljedecuPjesmuID = stari_sljedeca
            session.add(preth_obj)
            
        if sljed_obj and sljed_obj.pjesmaID != pjesmaID:
            sljed_obj.pokazivacNaPrethodnuPjesmuID = stari_prethodna
            session.add(sljed_obj)

        # 2. Postavi novu pjesmu iza targeta
        obj.pokazivacNaPrethodnuPjesmuID = target.pjesmaID
        obj.pokazivacNaSljedecuPjesmuID = sljedeca_id

        # Ažuriraj target da pokazuje na novu pjesmu
        target.pokazivacNaSljedecuPjesmuID = pjesmaID
        session.add(target)

        # Ažuriraj sljedeću pjesmu (ako postoji i nije sama pjesma)
        if sljedeca_id and sljedeca_id != pjesmaID:
            next_obj = next((v for v in veze if v.pjesmaID == sljedeca_id), None) 
            if next_obj:
                next_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
                session.add(next_obj)

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