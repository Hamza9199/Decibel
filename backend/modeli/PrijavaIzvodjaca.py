from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.mysql import CHAR
from servisi.Baza import Base
import datetime
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class PrijavaIzvodjacaORM(Base):
    __tablename__ = "prijave_izvodjaca"
    id = Column(CHAR(36), primary_key=True)
    korisnikID = Column(CHAR(36), ForeignKey("korisnici.id"), nullable=False)
    poruka = Column(Text, nullable=False)
    datum = Column(DateTime, default=datetime.datetime.utcnow)

class PrijavaIzvodjacaCreate(BaseModel):
    korisnikID: str
    poruka: str
    datum: Optional[datetime.datetime] = None

class PrijavaIzvodjaca(PrijavaIzvodjacaCreate):
    id: Optional[UUID]

    class Config:
        orm_mode = True
