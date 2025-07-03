from sqlalchemy import Column, BigInteger, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from servisi.Baza import Base
from typing import Optional
from pydantic import BaseModel
import datetime

class RedoslijedPjesamaORM(Base):
    __tablename__ = "redoslijed_pjesama"
    redoslijedPjesama = Column(BigInteger, primary_key=True, autoincrement=True)
    pjesmaID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=False)
    playlistaID = Column(BigInteger, ForeignKey("playliste.id"), nullable=False)
    pokazivacNaSljedecuPjesmuID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=False)
    pokazivacNaPrethodnuPjesmuID = Column(BigInteger, ForeignKey("pjesme.id"), nullable=True)
    kreiranDatumVrijeme = Column(DateTime, default=datetime.datetime.utcnow)

    pjesma = relationship("PjesmaORM", foreign_keys=[pjesmaID])
    playlista = relationship("PlaylistaORM", foreign_keys=[playlistaID])
    sljedecaPjesma = relationship("PjesmaORM", foreign_keys=[pokazivacNaSljedecuPjesmuID])
    prethodnaPjesma = relationship("PjesmaORM", foreign_keys=[pokazivacNaPrethodnuPjesmuID])

# Pydantic modeli

class RedoslijedPjesamaBase(BaseModel):
    pjesmaID: int
    playlistaID: int
    pokazivacNaSljedecuPjesmuID: int
    pokazivacNaPrethodnuPjesmuID: Optional[int]
    kreiranDatumVrijeme: Optional[datetime.datetime]

class RedoslijedPjesamaCreate(RedoslijedPjesamaBase):
    pass

class RedoslijedPjesama(RedoslijedPjesamaBase):
    redoslijedPjesama: int

    class Config:
        orm_mode = True
