from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, Integer, Boolean, String
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime
from .KontekstPustanja import KontekstPustanja
from sqlalchemy.types import Enum as SQLEnum

class HistorijaSlusanjaORM(Base):
    __tablename__ = "historija_slusanja"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=False)
    pjesmaID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=False)
    playlistaID = Column(BigInteger, ForeignKey("playliste.id"), nullable=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)
    trajanje = Column(Integer, nullable=False)
    kontekstPustanjaURL = Column(String(255), nullable=True)
    offline = Column(Boolean, default=False)
    kontekstPustanja = Column(SQLEnum(KontekstPustanja), nullable=True) 

    korisnik = relationship("KorisnikORM", foreign_keys=[korisnikID])
    pjesma = relationship("PjesmaORM", foreign_keys=[pjesmaID])
    playlista = relationship("PlaylistaORM", foreign_keys=[playlistaID])

# Pydantic modeli

class HistorijaSlusanjaBase(BaseModel):
    korisnikID: str
    pjesmaID: int
    playlistaID: Optional[int]
    kreiranDatumVrijeme: Optional[datetime.datetime]
    trajanje: int
    kontekstPustanjaURL: Optional[str]
    offline: Optional[bool] = False
    kontekstPustanja: Optional[KontekstPustanja]

class HistorijaSlusanjaCreate(HistorijaSlusanjaBase):
    pass

class HistorijaSlusanja(HistorijaSlusanjaBase):
    id: int

    class Config:
        orm_mode = True
    id: int

    class Config:
        orm_mode = True
