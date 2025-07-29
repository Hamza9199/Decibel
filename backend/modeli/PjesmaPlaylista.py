from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class PjesmaPlaylistaORM(Base):
    __tablename__ = "pjesma_playlista"
    pjesmaID = Column(BigInteger, ForeignKey("pjesme.id"), primary_key=True)
    playlistaID = Column(BigInteger, ForeignKey("playliste.id"), primary_key=True)
    pokazivacNaSljedecuPjesmuID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=True)
    pokazivacNaPrethodnuPjesmuID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    pjesma = relationship("PjesmaORM", foreign_keys=[pjesmaID])
    playlista = relationship("PlaylistaORM", foreign_keys=[playlistaID])
    sljedecaPjesma = relationship("PjesmaORM", foreign_keys=[pokazivacNaSljedecuPjesmuID])
    prethodnaPjesma = relationship("PjesmaORM", foreign_keys=[pokazivacNaPrethodnuPjesmuID])


class PjesmaPlaylistaBase(BaseModel):
    pjesmaID: int
    playlistaID: int
    pokazivacNaSljedecuPjesmuID: Optional[int]
    pokazivacNaPrethodnuPjesmuID: Optional[int]
    kreiranDatumVrijeme: Optional[datetime.datetime]

class PjesmaPlaylistaCreate(PjesmaPlaylistaBase):
    pass

class PjesmaPlaylista(PjesmaPlaylistaBase):
    class Config:
        orm_mode = True
