CREATE DATABASE IF NOT EXISTS decibel;
USE decibel;


CREATE TABLE IF NOT EXISTS korisnici (
    id CHAR(36) PRIMARY KEY,
    ime VARCHAR(50) NOT NULL,
    prezime VARCHAR(50) NOT NULL,
    korisnicko_ime VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    lozinka VARCHAR(100) NOT NULL,
    rola ENUM('admin', 'korisnik', 'izvodac') NOT NULL
);

CREATE TABLE IF NOT EXISTS albumi (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36),
    naziv VARCHAR(255) NOT NULL,
    opis VARCHAR(1024),
    kreiranDatumVrijeme DATETIME,
    odobreno BOOL,
    javno BOOL,
    brojLajkova BIGINT DEFAULT 0,
    putanjaSlika VARCHAR(255),
    putanjaGif VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pjesme (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36),
    albumID BIGINT,
    naziv VARCHAR(255) NOT NULL,
    opis VARCHAR(1024),
    datumObjave DATE NOT NULL,
    trajanjeSekunde INTEGER NOT NULL,
    javno BOOL,
    odobreno BOOL,
    putanjaAudio VARCHAR(255),
    putanjaSlika VARCHAR(255),
    putanjaGif VARCHAR(255),
    brojReprodukcija BIGINT DEFAULT 0,
    brojLajkova BIGINT DEFAULT 0,
    jezikPjesme VARCHAR(50),
    licenca VARCHAR(100),
    eksplicitniSadrzaj BOOL,
    zanr ENUM('pop','rock','hip_hop','jazz','electronic','klasicna','metal','alternativni','rap') NOT NULL,
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (albumID) REFERENCES albumi(id)
);