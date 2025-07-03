from sqlalchemy import Column, BigInteger, ForeignKey, String, Integer, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class KomentarORM(Base):
    __tablename__ = "komentari"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=False)
    pjesmaID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=False)
    tekst = Column(String(1024), nullable=False)
    vrijemePjesmeSekunde = Column(Integer, nullable=False)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    korisnik = relationship("KorisnikORM", foreign_keys=[korisnikID])
    pjesma = relationship("PjesmaORM", foreign_keys=[pjesmaID])

# Pydantic modeli

class KomentarBase(BaseModel):
    korisnikID: str
    pjesmaID: int
    tekst: str
    vrijemePjesmeSekunde: int
    kreiranDatumVrijeme: Optional[datetime.datetime]

class KomentarCreate(KomentarBase):
    pass

class Komentar(KomentarBase):
    id: int

    class Config:
        orm_mode = True
