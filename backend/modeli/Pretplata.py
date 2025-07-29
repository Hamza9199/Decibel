from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Numeric
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class PretplataORM(Base):
    __tablename__ = "pretplate"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    naziv = Column(String(255), nullable=False)
    opis = Column(String(1024), nullable=False)
    cijena = Column(Numeric(10, 2), nullable=False)
    dostupno = Column(Boolean, default=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)


class PretplataBase(BaseModel):
    naziv: str
    opis: str
    cijena: float
    dostupno: Optional[bool] = True
    kreiranDatumVrijeme: Optional[datetime.datetime]

class PretplataCreate(PretplataBase):
    pass

class Pretplata(PretplataBase):
    id: int

    class Config:
        orm_mode = True
