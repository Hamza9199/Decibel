from sqlalchemy import Column, BigInteger, ForeignKey, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class KorisnikAlbumORM(Base):
    __tablename__ = "korisnik_album"
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id", ondelete="RESTRICT"), primary_key=True)
    albumID = Column(BigInteger, ForeignKey("albumi.id", ondelete="RESTRICT"), primary_key=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    korisnik = relationship("KorisnikORM", foreign_keys=[korisnikID])
    album = relationship("AlbumORM", foreign_keys=[albumID])

# Pydantic modeli

class KorisnikAlbumBase(BaseModel):
    korisnikID: str
    albumID: int
    kreiranDatumVrijeme: Optional[datetime.datetime]

class KorisnikAlbumCreate(KorisnikAlbumBase):
    pass

class KorisnikAlbum(KorisnikAlbumBase):
    class Config:
        orm_mode = True
