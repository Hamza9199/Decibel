from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime
from .PretplataStatus import PretplataStatusEnum
from sqlalchemy.types import Enum as SQLEnum

class KorisnikPretplataORM(Base):
    __tablename__ = "korisnik_pretplata"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=False, unique=True)
    pretplataID = Column(BigInteger, ForeignKey("pretplate.id"), nullable=False)
    pretplataStatus = Column(SQLEnum(PretplataStatusEnum), nullable=False)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)
    datumVrijemeObnove = Column(DateTime, nullable=True)
    datumIsteka = Column(DateTime, nullable=True)

    korisnik = relationship("KorisnikORM", foreign_keys=[korisnikID])
    pretplata = relationship("PretplataORM", backref="korisnik_pretplate")

    __table_args__ = (
        UniqueConstraint('korisnikID', name='uq_korisnik_pretplata_korisnikID'),
    )

# Pydantic modeli

class KorisnikPretplataBase(BaseModel):
    korisnikID: str
    pretplataID: int
    pretplataStatus: PretplataStatusEnum
    kreiranDatumVrijeme: Optional[datetime.datetime] = None
    datumVrijemeObnove: Optional[datetime.datetime] = None
    datumIsteka: Optional[datetime.datetime] = None

class KorisnikPretplataCreate(KorisnikPretplataBase):
    pass

class KorisnikPretplata(KorisnikPretplataBase):
    id: int
    pretplata: Optional["Pretplata"] = None  # Dodaj ovo polje

    class Config:
        orm_mode = True

from .Pretplata import Pretplata
KorisnikPretplata.model_rebuild()
