from sqlalchemy import Column, BigInteger, ForeignKey, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class KorisnikPlaylistaORM(Base):
    __tablename__ = "korisnik_playlista"
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id", ondelete="RESTRICT"), primary_key=True)
    playlistaID = Column(BigInteger, ForeignKey("playliste.id", ondelete="RESTRICT"), primary_key=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    korisnik = relationship("KorisnikORM", foreign_keys=[korisnikID])
    playlista = relationship("PlaylistaORM", foreign_keys=[playlistaID])

# Pydantic modeli

class KorisnikPlaylistaBase(BaseModel):
    korisnikID: str
    playlistaID: int
    kreiranDatumVrijeme: Optional[datetime.datetime]

class KorisnikPlaylistaCreate(KorisnikPlaylistaBase):
    pass

class KorisnikPlaylista(KorisnikPlaylistaBase):
    class Config:
        orm_mode = True
