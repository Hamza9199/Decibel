from sqlalchemy import Column, String, BigInteger, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional, List
from pydantic import BaseModel
import datetime

class AlbumORM(Base):
    __tablename__ = "albumi"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=True)
    naziv = Column(String(255), nullable=False)
    opis = Column(String(1024), nullable=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)
    odobreno = Column(Boolean, default=False)
    javno = Column(Boolean, default=False)
    brojLajkova = Column(BigInteger, default=0)
    putanjaSlika = Column(String(255), nullable=True)
    putanjaGif = Column(String(255), nullable=True)

    korisnik = relationship("KorisnikORM", backref="albumi")
    pjesme = relationship("PjesmaORM", back_populates="album")  # ispravi: koristi back_populates  

# Pydantic modeli

class AlbumBase(BaseModel):
    korisnikID: Optional[str]
    naziv: str
    opis: Optional[str]
    kreiranDatumVrijeme: Optional[datetime.datetime]
    odobreno: Optional[bool] = False
    javno: Optional[bool] = False
    brojLajkova: Optional[int] = 0
    putanjaSlika: Optional[str]
    putanjaGif: Optional[str]

class AlbumCreate(AlbumBase):
    pass

class Album(AlbumBase):
    id: int
    PjesmeIDs: Optional[List[int]] = None  # Samo u response modelu

    class Config:
        orm_mode = True
