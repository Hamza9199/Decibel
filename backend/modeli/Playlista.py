from sqlalchemy import Column, String, BigInteger, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime
from .Korisnik import Korisnik  

class PlaylistaORM(Base):
    __tablename__ = "playliste"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=True)
    naziv = Column(String(255), nullable=False)
    opis = Column(String(1024), nullable=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)
    javno = Column(Boolean, default=False)
    brojLajkova = Column(BigInteger, default=0)
    putanjaSlika = Column(String(255), nullable=True)
    putanjaGif = Column(String(255), nullable=True)

    korisnik = relationship("KorisnikORM", backref="playliste")


class PlaylistaBase(BaseModel):
    korisnikID: Optional[str]
    naziv: str
    opis: Optional[str]
    kreiranDatumVrijeme: Optional[datetime.datetime]
    javno: Optional[bool] = False
    brojLajkova: Optional[int] = 0
    putanjaSlika: Optional[str]
    putanjaGif: Optional[str]

class PlaylistaCreate(PlaylistaBase):
    pass

class Playlista(PlaylistaBase):
    id: int
    korisnik: Optional["Korisnik"] = None 

    class Config:
        orm_mode = True
        from_attributes = True

Playlista.model_rebuild()
