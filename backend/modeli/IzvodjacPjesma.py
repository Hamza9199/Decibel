from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, Boolean, Numeric
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class IzvodjacPjesmaORM(Base):
    __tablename__ = "izvodjac_pjesma"
    izvodjacID = Column(CHAR(36), ForeignKey("korisnici.id", ondelete="RESTRICT"), primary_key=True)
    pjesmaID = Column(BigInteger, ForeignKey("pjesme.id", ondelete="RESTRICT"), primary_key=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)
    potvrdjeno = Column(Boolean, default=False)
    udio = Column(Numeric(5, 2), default=0.0)

    izvodjac = relationship("KorisnikORM", foreign_keys=[izvodjacID])
    pjesma = relationship("PjesmaORM", foreign_keys=[pjesmaID])

# Pydantic modeli

class IzvodjacPjesmaBase(BaseModel):
    izvodjacID: str
    pjesmaID: int
    kreiranDatumVrijeme: Optional[datetime.datetime]
    potvrdjeno: Optional[bool] = False
    udio: Optional[float] = 0.0

class IzvodjacPjesmaCreate(IzvodjacPjesmaBase):
    pass

class IzvodjacPjesma(IzvodjacPjesmaBase):
    class Config:
        orm_mode = True
