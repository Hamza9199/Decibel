SELECT COUNT(*) AS Broj_Reprodukcija
FROM HistorijaSlusanja
WHERE pjesmaID = 3
  AND trajanje >= 30;
  
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