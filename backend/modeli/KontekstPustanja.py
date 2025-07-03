from enum import Enum

class KontekstPustanja(str, Enum):
    pretraga = "pretraga"
    album = "album"
    playlista = "playlista"
    korisnik = "korisnik"
    omiljene = "omiljene"
    historija = "historija"
    ostalo = "ostalo"
     