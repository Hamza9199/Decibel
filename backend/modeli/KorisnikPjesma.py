from sqlalchemy import Column, BigInteger, ForeignKey, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class KorisnikPjesmaORM(Base):
    __tablename__ = "korisnik_pjesma"
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id", ondelete="RESTRICT"), primary_key=True)
    pjesmaID = Column(BigInteger, ForeignKey("pjesme.id", ondelete="RESTRICT"), primary_key=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    korisnik = relationship("KorisnikORM", foreign_keys=[korisnikID])
    pjesma = relationship("PjesmaORM", foreign_keys=[pjesmaID])

# Pydantic modeli

class KorisnikPjesmaBase(BaseModel):
    korisnikID: str
    pjesmaID: int
    kreiranDatumVrijeme: Optional[datetime.datetime]

class KorisnikPjesmaCreate(KorisnikPjesmaBase):
    pass

class KorisnikPjesma(KorisnikPjesmaBase):
    class Config:
        orm_mode = True
