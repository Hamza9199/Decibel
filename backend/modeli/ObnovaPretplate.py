from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class ObnovaPretplateORM(Base):
    __tablename__ = "obnove_pretplate"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikPretplataID = Column(BigInteger, ForeignKey("korisnik_pretplata.id"), nullable=False)
    datumObnove = Column(DateTime, nullable=False)
    iznosObnove = Column(Numeric(10, 2), nullable=False)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    korisnikPretplata = relationship("KorisnikPretplataORM", foreign_keys=[korisnikPretplataID])

# Pydantic modeli

class ObnovaPretplateBase(BaseModel):
    korisnikPretplataID: int
    datumObnove: datetime.datetime
    iznosObnove: float
    kreiranDatumVrijeme: Optional[datetime.datetime]

class ObnovaPretplateCreate(ObnovaPretplateBase):
    pass

class ObnovaPretplate(ObnovaPretplateBase):
    id: int

    class Config:
        orm_mode = True
