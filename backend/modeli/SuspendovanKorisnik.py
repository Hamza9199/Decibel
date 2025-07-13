from sqlalchemy import Column, String, DateTime, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class SuspendovanKorisnikORM(Base):
    __tablename__ = "suspendovani_korisnici"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    korisnikID = Column(String(36), ForeignKey("korisnici.id"), nullable=False)
    vrijemeDo = Column(DateTime, nullable=False)
    poruka = Column(String(512), nullable=True)

    korisnik = relationship("KorisnikORM", backref="suspendovan_info")

# Pydantic modeli

class SuspendovanKorisnikBase(BaseModel):
    korisnikID: str
    vrijemeDo: datetime.datetime
    poruka: Optional[str] = None

class SuspendovanKorisnikCreate(SuspendovanKorisnikBase):
    pass

class SuspendovanKorisnik(SuspendovanKorisnikBase):
    id: int

    class Config:
        orm_mode = True
