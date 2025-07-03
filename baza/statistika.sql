SELECT COUNT(*) AS Broj_Reprodukcija
FROM HistorijaSlusanja
WHERE pjesmaID = 3
  AND trajanje >= 30;

-- Ova skripta koristi T-SQL (SQL Server) sintaksu (TRIGGER, MERGE, go, itd.)
-- MySQL ima drugačiju sintaksu za TRIGGER-e i nema MERGE.
-- Preporuka: Prepiši u MySQL sintaksu.

-- PRIMER MySQL TRIGGER:
-- DELIMITER //
-- CREATE TRIGGER UpdateStatistikaPjesme
-- AFTER INSERT ON HistorijaSlusanja
-- FOR EACH ROW
-- BEGIN
--   -- update logika
-- END //
-- DELIMITER ;

-- Ova skripta neće raditi na MySQL-u bez konverzije!

-- MySQL verzija triggera za ažuriranje statistike reprodukcije pjesme
DELIMITER //
CREATE TRIGGER update_statistika_pjesme
AFTER INSERT ON historija_slusanja
FOR EACH ROW
BEGIN
    IF NEW.trajanje >= 30 THEN
        INSERT INTO statistika_reprodukcije (korisnikID, pjesmaID, brojReprodukcija, ukupnoTrajanje, zadnjePustanje)
        VALUES (NEW.korisnikID, NEW.pjesmaID, 1, NEW.trajanje, NEW.kreiranDatumVrijeme)
        ON DUPLICATE KEY UPDATE
            brojReprodukcija = brojReprodukcija + 1,
            ukupnoTrajanje = ukupnoTrajanje + NEW.trajanje,
            zadnjePustanje = NEW.kreiranDatumVrijeme;
    END IF;
END //
DELIMITER ;