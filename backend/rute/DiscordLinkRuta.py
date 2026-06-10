from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, delete


from modeli.Korisnik import KorisnikORM, Korisnik


from modeli.DiscordLink import DiscordLinkORM, DiscordLink
from kontroleri.DiscordLinkKontroler import (
    get_all_discord_links,
    get_discord_link_by_kod,
    create_discord_link,
    delete_discord_link,
    generate_discord_code,
    get_korisnik_by_discord_id,
    link_discord_account,
    unlink_discord_account,
)

router = APIRouter(prefix="/api/discordlink", tags=["DiscordLink"])

load_dotenv()
ASYNC_DATABASE_URL = os.getenv("DATABASE_URL_ASYNC")

engine = create_async_engine(
    ASYNC_DATABASE_URL, echo=True, future=True
)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

from typing import AsyncGenerator

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/", response_model=List[DiscordLink])
async def read_links(session: AsyncSession = Depends(get_session)):
    return await get_all_discord_links(session)

@router.get("/{discord_id}", response_model=Korisnik)
async def read_korisnik_by_discord(
    discord_id: str, session: AsyncSession = Depends(get_session)
):
    
    korisnik = await get_korisnik_by_discord_id(session, discord_id)
    if not korisnik:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Korisnik nije povezan s Discord računom",
        )
    return korisnik


@router.post("/", response_model=DiscordLink, status_code=status.HTTP_201_CREATED)
async def create_link(link: DiscordLink, session: AsyncSession = Depends(get_session)):
    return await create_discord_link(session, link)

@router.post("/link")
async def link_discord(
    kod: str,
    discord_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        korisnik = await link_discord_account(
            session,
            kod,
            discord_id
        )

        if not korisnik:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Neispravan kod za povezivanje",
            )

        return {
            "message": "Discord račun uspješno povezan"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    

@router.delete("/unlink/{korisnik_id}")
async def unlink_discord(
    korisnik_id: str,
    session: AsyncSession = Depends(get_session)
):
    korisnik = await unlink_discord_account(
        session,
        korisnik_id
    )

    if not korisnik:
        raise HTTPException(
            status_code=404,
            detail="Korisnik nije pronađen"
        )

    return {
        "message": "Discord račun odvezan"
    }    


@router.post("/generate/{korisnik_id}")
async def generate_link(
    korisnik_id: str,
    session: AsyncSession = Depends(get_session)
):
    return await generate_discord_code(
        session,
        korisnik_id
    )


