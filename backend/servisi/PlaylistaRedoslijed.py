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
    """Dodaje pjesmu na kraj playliste i održava pointere (SQL ekvivalent)"""
    if await postoji_pjesma_u_playlisti(session, playlistaID, pjesmaID):
        raise ValueError("Pjesma već postoji u playlisti")

    # Brojanje pjesama u playlisti
    broj_pjesama = await prebroj_pjesme(session, playlistaID)

    if broj_pjesama == 0:
        # Prva pjesma - ima NULL prev, pokazuje na sebe kao next
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=None,  # KLJUČNO: prva pjesma nema prethodnu (NULL)
            pokazivacNaSljedecuPjesmuID=pjesmaID  # Prva (i jedina) pokazuje na sebe
        )
        session.add(nova)
        await session.commit()
        return nova
    else:
        # Pronađi prvu pjesmu
        prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
        if not prva_id:
            raise ValueError("Neispravna struktura playliste - nema prve pjesme")
            
        # Pronađi zadnju pjesmu (ona koja pokazuje na prvu)
        zadnja_id = await pronadji_zadnju_pjesmu(session, playlistaID)
        if not zadnja_id:
            raise ValueError("Neispravna struktura playliste - nema zadnje pjesme")

        # Dodaj novu pjesmu na kraj
        nova = PjesmaPlaylistaORM(
            pjesmaID=pjesmaID,
            playlistaID=playlistaID,
            pokazivacNaPrethodnuPjesmuID=zadnja_id,  # Pokazuje na staru zadnju
            pokazivacNaSljedecuPjesmuID=prva_id      # Pokazuje na prvu (kružno)
        )
        session.add(nova)

        # Ažuriraj staru zadnju da pokazuje na novu
        result = await session.execute(
            select(PjesmaPlaylistaORM).where(
                and_(
                    PjesmaPlaylistaORM.playlistaID == playlistaID,
                    PjesmaPlaylistaORM.pjesmaID == zadnja_id
                )
            )
        )
        zadnja_obj = result.scalar_one()
        zadnja_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
        session.add(zadnja_obj)

        await session.commit()
        return nova

async def pronadji_prvu_pjesmu(session: AsyncSession, playlistaID: int):
    """Pronalazi prvu pjesmu - ona koja ima pokazivacNaPrethodnuPjesmuID = NULL"""
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            and_(
                PjesmaPlaylistaORM.playlistaID == playlistaID,
                PjesmaPlaylistaORM.pokazivacNaPrethodnuPjesmuID.is_(None)
            )
        )
    )
    prva = result.scalar_one_or_none()
    return prva.pjesmaID if prva else None

async def pronadji_zadnju_pjesmu(session: AsyncSession, playlistaID: int):
    """Pronalazi zadnju pjesmu - ona koja pokazuje na prvu u kružnoj listi"""
    prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
    if not prva_id:
        return None
        
    result = await session.execute(
        select(PjesmaPlaylistaORM).where(
            and_(
                PjesmaPlaylistaORM.playlistaID == playlistaID,
                PjesmaPlaylistaORM.pokazivacNaSljedecuPjesmuID == prva_id
            )
        )
    )
    zadnja = result.scalar_one_or_none()
    return zadnja.pjesmaID if zadnja else None

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

    print(
        f"BRISEM {pjesmaID}, prev={prethodna_id}, next={sljedeca_id}"
    )

    prva_id = await pronadji_prvu_pjesmu(session, playlistaID)

    if prethodna_id is None and sljedeca_id == pjesmaID:
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
            if sljedeca_id == prva_id:
                sljed_obj.pokazivacNaPrethodnuPjesmuID = None
            else:
                sljed_obj.pokazivacNaPrethodnuPjesmuID = prethodna_id
            session.add(sljed_obj)

    await session.delete(obj)
    await session.commit()
    return True

async def promjeni_redoslijed(session: AsyncSession, playlistaID: int, pjesmaID: int, nova_pozicija_iza_pjesmeID: int | None):
    """
    Pomjera pjesmu na novo mjesto u playlisti.
    Ako je nova_pozicija_iza_pjesmeID=None, pjesma ide na početak (prije prve).
    Implementacija bazirana na starom SQL kodu.
    """
    print(f"=== PROMJENA REDOSLIJEDA ===")
    print(f"Premještam pjesmu {pjesmaID} u playlisti {playlistaID}")
    print(f"Nova pozicija iza: {nova_pozicija_iza_pjesmeID}")
    
    # Provjere (Validacija)
    broj_pjesama = await prebroj_pjesme(session, playlistaID)
    if broj_pjesama <= 1:
        print("Manje od 2 pjesme - nema mijenjanja")
        return None
    
    if not await postoji_pjesma_u_playlisti(session, playlistaID, pjesmaID):
        print(f"Pjesma {pjesmaID} ne postoji u playlisti")
        return None
    
    if nova_pozicija_iza_pjesmeID and not await postoji_pjesma_u_playlisti(session, playlistaID, nova_pozicija_iza_pjesmeID):
        print(f"Ciljna pjesma {nova_pozicija_iza_pjesmeID} ne postoji u playlisti")
        return None
    
    # Provjeri ako pokušavaš staviti pjesmu odmah iza sebe
    if nova_pozicija_iza_pjesmeID == pjesmaID:
        print("Pokušava staviti iza sebe - nema mijenjanja")
        await session.commit()
        return None

    # Dohvati sve veze u playlisti
    result_all = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result_all.scalars().all()
    
    print(f"Broj pjesama u playlisti: {len(veze)}")
    for v in veze:
        print(f"  Pjesma {v.pjesmaID}: prev={v.pokazivacNaPrethodnuPjesmuID}, next={v.pokazivacNaSljedecuPjesmuID}")

    # Bitne varijable (iz starog SQL koda)
    prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
    zadnja_id = await pronadji_zadnju_pjesmu(session, playlistaID)
    
    print(f"Prva pjesma: {prva_id}, Zadnja pjesma: {zadnja_id}")
    
    target_obj = next((v for v in veze if v.pjesmaID == pjesmaID), None)
    if not target_obj:
        print(f"Target pjesma {pjesmaID} nije pronađena")
        return None
    
    og_prethodnik_id = target_obj.pokazivacNaPrethodnuPjesmuID
    og_sljedbenik_id = target_obj.pokazivacNaSljedecuPjesmuID
    
    print(f"Target pjesma {pjesmaID}: prev={og_prethodnik_id}, next={og_sljedbenik_id}")

    # Provjeri ako pokušavaš staviti iza pjesme koja je trenutno sljedeća (bez promjene)
    if nova_pozicija_iza_pjesmeID == og_prethodnik_id:
        print("Pokušava staviti iza svoje trenutne prethodne pjesme - nema mijenjanja")
        await session.commit()
        return target_obj

    # Ako premještamo na početak (nova_pozicija_iza_pjesmeID je None)
    if nova_pozicija_iza_pjesmeID is None:
        print("=== PREMJEŠTANJE NA POČETAK ===")
        
        # Ako je već prva pjesma, nema posla
        if pjesmaID == prva_id:
            print("Pjesma je već prva - nema promjene")
            await session.commit()
            return target_obj
        
        # Postavi pokazivače za novu prvu pjesmu (kao u starom SQL kodu)
        target_obj.pokazivacNaSljedecuPjesmuID = prva_id
        target_obj.pokazivacNaPrethodnuPjesmuID = None  # KLJUČNO: prva pjesma ima NULL prev
        session.add(target_obj)
        
        # Ažuriraj staru prvu da pokazuje na novu kao prethodnu
        prva_obj = next((v for v in veze if v.pjesmaID == prva_id), None)
        if prva_obj:
            prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
            session.add(prva_obj)
        
        # Spoji susjedne pjesme (ukloni target iz stare pozicije)
        if og_prethodnik_id and og_sljedbenik_id != prva_id:
            preth_obj = next((v for v in veze if v.pjesmaID == og_prethodnik_id), None)
            sljed_obj = next((v for v in veze if v.pjesmaID == og_sljedbenik_id), None)
            
            if preth_obj:
                preth_obj.pokazivacNaSljedecuPjesmuID = og_sljedbenik_id
                session.add(preth_obj)
            
            if sljed_obj:
                sljed_obj.pokazivacNaPrethodnuPjesmuID = og_prethodnik_id
                session.add(sljed_obj)
        else:
            # Poseban slučaj ako target povezuje zadnju sa prvom
            if og_prethodnik_id:
                preth_obj = next((v for v in veze if v.pjesmaID == og_prethodnik_id), None)
                if preth_obj:
                    preth_obj.pokazivacNaSljedecuPjesmuID = og_sljedbenik_id
                    session.add(preth_obj)
        
        # Ažuriraj zadnju da pokazuje na novu prvu
        if zadnja_id != pjesmaID:
            zadnja_obj = next((v for v in veze if v.pjesmaID == zadnja_id), None)
            if zadnja_obj:
                zadnja_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
                session.add(zadnja_obj)
    
    else:
        print("=== PREMJEŠTANJE IZA ODREĐENE PJESME ===")
        
        pocetna_obj = next((v for v in veze if v.pjesmaID == nova_pozicija_iza_pjesmeID), None)
        if not pocetna_obj:
            print(f"Ciljna pjesma {nova_pozicija_iza_pjesmeID} nije pronađena")
            await session.commit()
            return target_obj
        
        sljedbenik_id = pocetna_obj.pokazivacNaSljedecuPjesmuID
        
        print(f"Stavljam {pjesmaID} iza {nova_pozicija_iza_pjesmeID}, koji pokazuje na {sljedbenik_id}")
        
        # Ako je već na željenoj poziciji
        if sljedbenik_id == pjesmaID:
            print("Već je na željenoj poziciji")
            await session.commit()
            return target_obj
        
        # PRVO: Ukloni pjesmu iz stare pozicije - spoji susjedne pjesme
        print("=== KORAK 1: Uklanjam iz stare pozicije ===")
        if og_prethodnik_id:
            preth_obj = next((v for v in veze if v.pjesmaID == og_prethodnik_id), None)
            if preth_obj:
                print(f"Ažuriram prethodnu {og_prethodnik_id}: next {preth_obj.pokazivacNaSljedecuPjesmuID} -> {og_sljedbenik_id}")
                preth_obj.pokazivacNaSljedecuPjesmuID = og_sljedbenik_id
                session.add(preth_obj)
        
            if og_sljedbenik_id:
                sljed_obj = next((v for v in veze if v.pjesmaID == og_sljedbenik_id), None)

                if sljed_obj:

                    if og_sljedbenik_id == prva_id:
                        print(f"Ažuriram sljedeću {og_sljedbenik_id}: prev -> NULL")
                        sljed_obj.pokazivacNaPrethodnuPjesmuID = None
                    else:
                        print(f"Ažuriram sljedeću {og_sljedbenik_id}: prev {sljed_obj.pokazivacNaPrethodnuPjesmuID} -> {og_prethodnik_id}")
                        sljed_obj.pokazivacNaPrethodnuPjesmuID = og_prethodnik_id

                    session.add(sljed_obj)
        
        # Posebno rukovanje ako je target bila prva pjesma
        if pjesmaID == prva_id and og_sljedbenik_id:
            print(f"Target je bila prva pjesma - postavljam {og_sljedbenik_id} kao novu prvu")
            nova_prva_obj = next((v for v in veze if v.pjesmaID == og_sljedbenik_id), None)
            if nova_prva_obj:
                nova_prva_obj.pokazivacNaPrethodnuPjesmuID = None  # Nova prva pjesma
                session.add(nova_prva_obj)
        
        # DRUGO: Postavi novu pjesmu na novu poziciju
        print("=== KORAK 2: Postavljam na novu poziciju ===")
        print(f"Postavljam pjesmu {pjesmaID}: prev={nova_pozicija_iza_pjesmeID}, next={sljedbenik_id}")
        target_obj.pokazivacNaPrethodnuPjesmuID = nova_pozicija_iza_pjesmeID
        target_obj.pokazivacNaSljedecuPjesmuID = sljedbenik_id
        session.add(target_obj)
        
        # Ažuriraj početnu da pokazuje na target
        print(f"Ažuriram početnu {nova_pozicija_iza_pjesmeID}: next {pocetna_obj.pokazivacNaSljedecuPjesmuID} -> {pjesmaID}")
        pocetna_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
        session.add(pocetna_obj)
        
        # Ažuriraj sljedbenika (ako postoji i nije target)
        if sljedbenik_id and sljedbenik_id != pjesmaID:
            sljed_obj = next((v for v in veze if v.pjesmaID == sljedbenik_id), None)
            if sljed_obj:
                print(f"Ažuriram sljedbenika {sljedbenik_id}: prev {sljed_obj.pokazivacNaPrethodnuPjesmuID} -> {pjesmaID}")
                sljed_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
                session.add(sljed_obj)

    print("=== COMMIT PROMJENA ===")
    await session.commit()
    print("=== ZAVRŠENO ===")
    return target_obj

async def premjesti_na_pocetak(session: AsyncSession, playlistaID: int, pjesmaID: int):
    """Premješta pjesmu na početak playliste - direktna implementacija SQL procedure"""
    print(f"=== PREMJEŠTANJE NA POČETAK ===")
    print(f"Premještam pjesmu {pjesmaID} na početak playliste {playlistaID}")
    
    # Provjere (Validacija)
    broj_pjesama = await prebroj_pjesme(session, playlistaID)
    if broj_pjesama <= 1:
        print("Manje od 2 pjesme - nema mijenjanja")
        return None
    
    prva_id = await pronadji_prvu_pjesmu(session, playlistaID)
    if prva_id == pjesmaID:
        print("Pjesma je već prva - nema promjene")
        return None
    
    if not await postoji_pjesma_u_playlisti(session, playlistaID, pjesmaID):
        print(f"Pjesma {pjesmaID} ne postoji u playlisti")
        return None

    # Dohvati sve veze
    result_all = await session.execute(
        select(PjesmaPlaylistaORM).where(PjesmaPlaylistaORM.playlistaID == playlistaID)
    )
    veze = result_all.scalars().all()
    
    zadnja_id = await pronadji_zadnju_pjesmu(session, playlistaID)
    
    target_obj = next((v for v in veze if v.pjesmaID == pjesmaID), None)
    if not target_obj:
        return None
        
    og_prethodnik_id = target_obj.pokazivacNaPrethodnuPjesmuID
    og_sljedbenik_id = target_obj.pokazivacNaSljedecuPjesmuID
    
    print(f"Stara prva: {prva_id}, zadnja: {zadnja_id}")
    print(f"Target pjesma: prev={og_prethodnik_id}, next={og_sljedbenik_id}")

    # Postavi target kao novu prvu pjesmu
    target_obj.pokazivacNaSljedecuPjesmuID = prva_id
    target_obj.pokazivacNaPrethodnuPjesmuID = None  # KLJUČNO: prva pjesma ima NULL prev
    session.add(target_obj)
    
    # Ažuriraj staru prvu da pokazuje na novu kao prethodnu
    prva_obj = next((v for v in veze if v.pjesmaID == prva_id), None)
    if prva_obj:
        prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
        session.add(prva_obj)
    
    # Spoji susjedne pjesme (ukloni target iz stare pozicije)
    if og_sljedbenik_id != prva_id:
        # Normalni slučaj - target nije bio zadnji
        if og_prethodnik_id:
            preth_obj = next((v for v in veze if v.pjesmaID == og_prethodnik_id), None)
            if preth_obj:
                preth_obj.pokazivacNaSljedecuPjesmuID = og_sljedbenik_id
                session.add(preth_obj)
        
        if og_sljedbenik_id:
            sljed_obj = next((v for v in veze if v.pjesmaID == og_sljedbenik_id), None)
            if sljed_obj:
                sljed_obj.pokazivacNaPrethodnuPjesmuID = og_prethodnik_id
                session.add(sljed_obj)
    else:
        # Target je bio zadnji - posebno rukovanje
        if og_prethodnik_id:
            preth_obj = next((v for v in veze if v.pjesmaID == og_prethodnik_id), None)
            if preth_obj:
                preth_obj.pokazivacNaSljedecuPjesmuID = og_sljedbenik_id
                session.add(preth_obj)
    
    # Ažuriraj zadnju da pokazuje na novu prvu
    if zadnja_id != pjesmaID:
        zadnja_obj = next((v for v in veze if v.pjesmaID == zadnja_id), None)
        if zadnja_obj:
            zadnja_obj.pokazivacNaSljedecuPjesmuID = pjesmaID
            session.add(zadnja_obj)
    
    # Posebno rukovanje za playliste s 2 pjesme
    if broj_pjesama == 2:
        if prva_obj:
            prva_obj.pokazivacNaPrethodnuPjesmuID = pjesmaID
            session.add(prva_obj)
        target_obj.pokazivacNaPrethodnuPjesmuID = None
        session.add(target_obj)

    await session.commit()
    print("=== ZAVRŠENO ===")
    return target_obj

async def dobij_redoslijed_playliste(session: AsyncSession, playlistaID: int) -> list:
    """Vraća listu pjesama u redoslijedu playliste, počevši od prve (koja ima prev=NULL)"""
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
        
        # Ako pokazuje na prvu ili na sebe, završi
        if sljedeca_id == prva_id or sljedeca_id == trenutna_id:
            break
            
        trenutna_id = sljedeca_id

    return redoslijed