from sqlalchemy import Column, String, ForeignKey, DateTime, PrimaryKeyConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class PratilacKorisnikORM(Base):
    __tablename__ = "pratioci"
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id", ondelete="RESTRICT"), primary_key=True)
    pratilacID = Column(CHAR(36), ForeignKey("korisnici.id", ondelete="RESTRICT"), primary_key=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    korisnik = relationship("KorisnikORM", foreign_keys=[korisnikID], backref="pratioci")
    pratilac = relationship("KorisnikORM", foreign_keys=[pratilacID], backref="pratim")

# Pydantic modeli

class PratilacKorisnikBase(BaseModel):
    korisnikID: str
    pratilacID: str
    kreiranDatumVrijeme: Optional[datetime.datetime]

class PratilacKorisnikCreate(PratilacKorisnikBase):
    pass

class PratilacKorisnik(PratilacKorisnikBase):
    class Config:
        orm_mode = True
