from sqlalchemy import Column, String, Integer, Table, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from servisi.Baza import Base  # Umesto: Base = declarative_base()
import uuid
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from .KorisnikRole import KorisnikRole  # Importuj Enum

class KorisnikORM(Base):
    __tablename__ = "korisnici"
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ime = Column(String(50), nullable=False)
    prezime = Column(String(50), nullable=False)
    korisnicko_ime = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    lozinka = Column(String(100), nullable=False)
    rola = Column(Enum(KorisnikRole), nullable=False)  # Enum tip

class KorisnikCreate(BaseModel):
    ime: str
    prezime: str
    korisnicko_ime: str
    email: str
    lozinka: str
    rola: KorisnikRole

class Korisnik(KorisnikCreate):
    id: Optional[UUID]

    class Config:
        orm_mode = True

class KorisnikLogin(BaseModel):
    email: str
    lozinka: str
