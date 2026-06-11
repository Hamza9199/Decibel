from sqlalchemy import Column, String, DateTime
from servisi.Baza import Base
from sqlalchemy.dialects.mysql import CHAR
from pydantic import BaseModel

class DiscordLinkORM(Base):
    __tablename__ = "discord_link"

    kod = Column(String(12), primary_key=True)
    discordID = Column(String(50), nullable=True)
    korisnikID = Column(CHAR(36), nullable=False)
    datumKreiranja = Column(DateTime)


class DiscordLink(BaseModel):
    kod: str
    korisnikID: str
