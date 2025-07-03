CREATE DATABASE IF NOT EXISTS decibel;
USE decibel;

CREATE TABLE IF NOT EXISTS korisnici (
    id CHAR(36) PRIMARY KEY,
    ime VARCHAR(50) NOT NULL,
    prezime VARCHAR(50) NOT NULL,
    korisnicko_ime VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    lozinka VARCHAR(100) NOT NULL,
    rola ENUM('admin', 'korisnik', 'izvodac') NOT NULL,
    bio VARCHAR(512),
    statusKorisnika ENUM('aktivan', 'neaktivan', 'suspendovan') NOT NULL DEFAULT 'aktivan',
    putanjaProfilneSlike VARCHAR(255),
    datumRegistracije DATETIME DEFAULT CURRENT_TIMESTAMP,
    brojPratilaca BIGINT DEFAULT 0,
    obrisan BOOL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS albumi (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36),
    naziv VARCHAR(255) NOT NULL,
    opis VARCHAR(1024),
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    odobreno BOOL DEFAULT FALSE,
    javno BOOL DEFAULT FALSE,
    brojLajkova BIGINT DEFAULT 0,
    putanjaSlika VARCHAR(255),
    putanjaGif VARCHAR(255),
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id)
);

CREATE TABLE IF NOT EXISTS pjesme (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36),
    albumID BIGINT,
    naziv VARCHAR(255) NOT NULL,
    opis VARCHAR(1024),
    datumObjave DATE NOT NULL,
    trajanjeSekunde INTEGER NOT NULL,
    javno BOOL DEFAULT FALSE,
    odobreno BOOL DEFAULT FALSE,
    putanjaAudio VARCHAR(255),
    putanjaSlika VARCHAR(255),
    putanjaGif VARCHAR(255),
    brojReprodukcija BIGINT DEFAULT 0,
    brojLajkova BIGINT DEFAULT 0,
    jezikPjesme VARCHAR(50),
    licenca VARCHAR(100),
    eksplicitniSadrzaj BOOL DEFAULT FALSE,
    zanr ENUM('pop','rock','hip_hop','jazz','electronic','klasicna','metal','alternativni','rap') NOT NULL,
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (albumID) REFERENCES albumi(id)
);

CREATE TABLE IF NOT EXISTS playliste (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36),
    naziv VARCHAR(255) NOT NULL,
    opis VARCHAR(1024),
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    javno BOOL DEFAULT FALSE,
    brojLajkova BIGINT DEFAULT 0,
    putanjaSlika VARCHAR(255),
    putanjaGif VARCHAR(255),
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id)
);

CREATE TABLE IF NOT EXISTS komentar (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36) NOT NULL,
    pjesmaID BIGINT NOT NULL,
    tekst VARCHAR(1024) NOT NULL,
    vrijemePjesmeSekunde INTEGER NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (pjesmaID) REFERENCES pjesme(id)
);

CREATE TABLE IF NOT EXISTS izvodjac_pjesma (
    izvodjacID CHAR(36) NOT NULL,
    pjesmaID BIGINT NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    potvrdjeno BOOL DEFAULT FALSE,
    udio DECIMAL(5,2) DEFAULT 0.0,
    PRIMARY KEY (izvodjacID, pjesmaID),
    FOREIGN KEY (izvodjacID) REFERENCES korisnici(id),
    FOREIGN KEY (pjesmaID) REFERENCES pjesme(id)
);

CREATE TABLE IF NOT EXISTS pjesma_playlista (
    pjesmaID BIGINT NOT NULL,
    playlistaID BIGINT NOT NULL,
    pokazivacNaSljedecuPjesmuID BIGINT,
    pokazivacNaPrethodnuPjesmuID BIGINT,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pjesmaID, playlistaID),
    FOREIGN KEY (pjesmaID) REFERENCES pjesme(id),
    FOREIGN KEY (playlistaID) REFERENCES playliste(id),
    FOREIGN KEY (pokazivacNaSljedecuPjesmuID) REFERENCES pjesme(id),
    FOREIGN KEY (pokazivacNaPrethodnuPjesmuID) REFERENCES pjesme(id)
);

CREATE TABLE IF NOT EXISTS korisnik_playlista (
    korisnikID CHAR(36) NOT NULL,
    playlistaID BIGINT NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (korisnikID, playlistaID),
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (playlistaID) REFERENCES playliste(id)
);

CREATE TABLE IF NOT EXISTS korisnik_pjesma (
    korisnikID CHAR(36) NOT NULL,
    pjesmaID BIGINT NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (korisnikID, pjesmaID),
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (pjesmaID) REFERENCES pjesme(id)
);

CREATE TABLE IF NOT EXISTS korisnik_album (
    korisnikID CHAR(36) NOT NULL,
    albumID BIGINT NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (korisnikID, albumID),
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (albumID) REFERENCES albumi(id)
);

CREATE TABLE IF NOT EXISTS pratioci (
    korisnikID CHAR(36) NOT NULL,
    pratilacID CHAR(36) NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (korisnikID, pratilacID),
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (pratilacID) REFERENCES korisnici(id)
);

CREATE TABLE IF NOT EXISTS redoslijed_pjesama (
    redoslijedPjesama BIGINT AUTO_INCREMENT PRIMARY KEY,
    pjesmaID BIGINT NOT NULL,
    playlistaID BIGINT NOT NULL,
    pokazivacNaSljedecuPjesmuID BIGINT NOT NULL,
    pokazivacNaPrethodnuPjesmuID BIGINT,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pjesmaID) REFERENCES pjesme(id),
    FOREIGN KEY (playlistaID) REFERENCES playliste(id),
    FOREIGN KEY (pokazivacNaSljedecuPjesmuID) REFERENCES pjesme(id),
    FOREIGN KEY (pokazivacNaPrethodnuPjesmuID) REFERENCES pjesme(id)
);

CREATE TABLE IF NOT EXISTS statistika_reprodukcije (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36) NOT NULL,
    pjesmaID BIGINT NOT NULL,
    brojReprodukcija INTEGER DEFAULT 0,
    ukupnoTrajanje INTEGER DEFAULT 0,
    zadnjePustanje DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (pjesmaID) REFERENCES pjesme(id)
);

CREATE TABLE IF NOT EXISTS historija_slusanja (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36) NOT NULL,
    pjesmaID BIGINT NOT NULL,
    playlistaID BIGINT,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    trajanje INTEGER NOT NULL,
    kontekstPustanjaURL VARCHAR(255),
    offline BOOL DEFAULT FALSE,
    kontekstPustanja ENUM('pretraga','album','playlista','korisnik','omiljene','historija','ostalo'),
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (pjesmaID) REFERENCES pjesme(id),
    FOREIGN KEY (playlistaID) REFERENCES playliste(id)
);

CREATE TABLE IF NOT EXISTS pretplate (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    naziv VARCHAR(255) NOT NULL,
    opis VARCHAR(1024) NOT NULL,
    cijena DECIMAL(10,2) NOT NULL,
    dostupno BOOL DEFAULT TRUE,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pretplata_status (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    naziv ENUM('aktivna','neaktivna','pauzirana','istekla') NOT NULL
);

CREATE TABLE IF NOT EXISTS korisnik_pretplata (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikID CHAR(36) NOT NULL UNIQUE,
    pretplataID BIGINT NOT NULL,
    pretplataStatus ENUM('aktivna','neaktivna','pauzirana','istekla') NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    datumVrijemeObnove DATETIME,
    datumIsteka DATETIME,
    FOREIGN KEY (korisnikID) REFERENCES korisnici(id),
    FOREIGN KEY (pretplataID) REFERENCES pretplate(id)
);

CREATE TABLE IF NOT EXISTS obnove_pretplate (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    korisnikPretplataID BIGINT NOT NULL,
    datumObnove DATETIME NOT NULL,
    iznosObnove DECIMAL(10,2) NOT NULL,
    kreiranDatumVrijeme DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (korisnikPretplataID) REFERENCES korisnik_pretplata(id)
);