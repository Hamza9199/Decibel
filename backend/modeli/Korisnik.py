from sqlalchemy import Column, String, Enum, Boolean, DateTime, BigInteger
from sqlalchemy.dialects.mysql import CHAR
from servisi.Baza import Base
import uuid
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import datetime

from .KorisnikRole import KorisnikRole
from .KorisnikStatus import KorisnikStatusEnum

class KorisnikORM(Base):
    __tablename__ = "korisnici"
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ime = Column(String(50), nullable=False)
    prezime = Column(String(50), nullable=False)
    korisnicko_ime = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    lozinka = Column(String(100), nullable=False)
    rola = Column(Enum(KorisnikRole), nullable=False)
    bio = Column(String(512), nullable=True)
    statusKorisnika = Column(Enum(KorisnikStatusEnum), nullable=False, default=KorisnikStatusEnum.aktivan)
    putanjaProfilneSlike = Column(String(255), nullable=True)
    datumRegistracije = Column(DateTime, default=datetime.datetime.utcnow)
    brojPratilaca = Column(BigInteger, default=0)
    obrisan = Column(Boolean, default=False)

class KorisnikCreate(BaseModel):
    ime: str
    prezime: str
    korisnicko_ime: str
    email: str
    lozinka: str
    rola: Optional[KorisnikRole] = KorisnikRole.korisnik
    bio: Optional[str] = None
    statusKorisnika: Optional[KorisnikStatusEnum] = KorisnikStatusEnum.aktivan
    putanjaProfilneSlike: Optional[str] = None
    datumRegistracije: Optional[datetime.datetime] = None
    brojPratilaca: Optional[int] = 0
    obrisan: Optional[bool] = False

class Korisnik(KorisnikCreate):
    id: Optional[UUID]

    class Config:
        from_attributes = True  

class KorisnikLogin(BaseModel):
    email: str
    lozinka: str
