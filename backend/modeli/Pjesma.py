from enum import Enum  # Za PjesmaZanr
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, ForeignKey, Date
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from .PjesmaZanr import PjesmaZanr
from sqlalchemy.types import Enum as SQLEnum  # Ispravan import za SQLAlchemy Enum
from servisi.Baza import Base
from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
import datetime

class PjesmaORM(Base):
    __tablename__ = "pjesme"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=True)
    albumID = Column(BigInteger, ForeignKey("albumi.id"), nullable=True)
    naziv = Column(String(255), nullable=False)
    opis = Column(String(1024), nullable=True)
    datumObjave = Column(Date, nullable=False)
    trajanjeSekunde = Column(Integer, nullable=False)
    javno = Column(Boolean, default=False)
    odobreno = Column(Boolean, default=False)
    putanjaAudio = Column(String(255), nullable=True)
    putanjaSlika = Column(String(255), nullable=True)
    putanjaGif = Column(String(255), nullable=True)
    brojReprodukcija = Column(BigInteger, default=0)
    brojLajkova = Column(BigInteger, default=0)
    jezikPjesme = Column(String(50), nullable=True)
    licenca = Column(String(100), nullable=True)
    eksplicitniSadrzaj = Column(Boolean, default=False)
    zanr = Column(SQLEnum(PjesmaZanr), nullable=False)  # Ispravno korišćenje Enum-a
    # Relationships
    korisnik = relationship("KorisnikORM", backref="pjesme")
    album = relationship("AlbumORM", back_populates="pjesme")  # ispravi: koristi back_populates

# Pydantic modeli

class PjesmaBase(BaseModel):
    korisnikID: Optional[str]
    albumID: Optional[int]  # Dodaj ovo
    naziv: str
    opis: Optional[str]
    datumObjave: datetime.date  # umesto: str  # ISO format (YYYY-MM-DD)
    trajanjeSekunde: int
    javno: Optional[bool] = False
    odobreno: Optional[bool] = False
    putanjaAudio: Optional[str]
    putanjaSlika: Optional[str]
    putanjaGif: Optional[str]
    brojReprodukcija: Optional[int] = 0
    brojLajkova: Optional[int] = 0
    jezikPjesme: Optional[str]
    licenca: Optional[str]
    eksplicitniSadrzaj: Optional[bool] = False
    zanr: Optional[PjesmaZanr] = None

class PjesmaCreate(PjesmaBase):
    pass

class Pjesma(PjesmaBase):
    id: int

    class Config:
        orm_mode = True