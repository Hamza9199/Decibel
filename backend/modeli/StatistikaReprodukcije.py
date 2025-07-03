from sqlalchemy import Column, BigInteger, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class StatistikaReprodukcijeORM(Base):
    __tablename__ = "statistika_reprodukcije"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=False)
    pjesmaID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=False)
    brojReprodukcija = Column(Integer, default=0)
    ukupnoTrajanje = Column(Integer, default=0)
    zadnjePustanje = Column(DateTime, default=datetime.datetime.utcnow)

    pjesma = relationship("PjesmaORM", foreign_keys=[pjesmaID])

# Pydantic modeli

class StatistikaReprodukcijeBase(BaseModel):
    korisnikID: str
    pjesmaID: int
    brojReprodukcija: Optional[int] = 0
    ukupnoTrajanje: Optional[int] = 0
    zadnjePustanje: Optional[datetime.datetime]

class StatistikaReprodukcijeCreate(StatistikaReprodukcijeBase):
    pass

class StatistikaReprodukcije(StatistikaReprodukcijeBase):
    id: int

    class Config:
        orm_mode = True
