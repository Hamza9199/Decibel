from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from modeli.DiscordLink import DiscordLinkORM, DiscordLink
import string, random
from typing import Optional
import datetime


from modeli.Korisnik import KorisnikORM, Korisnik



async def get_all_discord_links(session: AsyncSession):
    result = await session.execute(select(DiscordLinkORM))
    return result.scalars().all()


async def get_discord_link_by_kod(session: AsyncSession, kod: str):
    result = await session.execute(select(DiscordLinkORM).where(DiscordLinkORM.kod == kod))
    return result.scalar_one_or_none()


async def create_discord_link(session: AsyncSession, discord_link: DiscordLink):
   
    db_link = DiscordLinkORM(**discord_link.dict())
    session.add(db_link)
    await session.commit()
    await session.refresh(db_link)
    return db_link

async def generate_discord_code(session: AsyncSession,    korisnik_id: str, length: int = 8):

    korisnik = await session.get(
    KorisnikORM,
    korisnik_id
    )

    if korisnik and korisnik.discordID:
        raise Exception(
            "Discord račun je već povezan"
        )
            
    for _ in range(5):
        kod = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
        existing = await session.execute(select(DiscordLinkORM).where(DiscordLinkORM.kod == kod))
        if not existing.scalar_one_or_none():
            break
    else:
        raise Exception("Failed to generate unique Discord link code")

    await session.execute(
        delete(DiscordLinkORM).where(
            DiscordLinkORM.korisnikID == korisnik_id
        )
    )   

    db_link = DiscordLinkORM(
        kod=kod,
        korisnikID=korisnik_id,
        datumKreiranja=datetime.datetime.utcnow()
    )
    session.add(db_link)
    await session.commit()
    await session.refresh(db_link)
    return db_link


async def delete_discord_link(session: AsyncSession, kod: str):
    
    link = await get_discord_link_by_kod(session, kod)
    if not link:
        return None
    await session.delete(link)
    await session.commit()
    return link



async def get_korisnik_by_discord_id(
    session: AsyncSession, discord_id: str
) -> Optional[KorisnikORM]:
    
    result = await session.execute(
        select(KorisnikORM).where(KorisnikORM.discordID == discord_id)
    )
    return result.scalar_one_or_none()


async def link_discord_account(
    session: AsyncSession,
    kod: str,
    discord_id: str,
):
    link = await get_discord_link_by_kod(session, kod)

    if not link:
        return None

    existing = await session.execute(
        select(KorisnikORM).where(
            KorisnikORM.discordID == discord_id
        )
    )

    if existing.scalar_one_or_none():
        raise Exception("Discord račun je već povezan")

    result = await session.execute(
        select(KorisnikORM).where(
            KorisnikORM.id == link.korisnikID
        )
    )

    korisnik = result.scalar_one_or_none()

    if not korisnik:
        raise Exception("Korisnik nije pronađen")

    korisnik.discordID = discord_id

    await session.delete(link)

    await session.commit()

    return korisnik


async def unlink_discord_account(
    session: AsyncSession,
    korisnik_id: str,
):
    korisnik = await session.get(
        KorisnikORM,
        korisnik_id
    )

    if not korisnik:
        return None

    korisnik.discordID = None

    await session.commit()

    return korisnik