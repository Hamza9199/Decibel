DELIMITER $$

CREATE PROCEDURE dodaj_pjesmu_na_kraj_liste (IN pjesmaID INT, IN playlistaID INT)
BEGIN
    DECLARE velicinaListe INT;
    DECLARE prvaPjesmaID INT;
    DECLARE zadnjaPjesmaID INT;

    SET NOCOUNT ON;

    CALL prebroj_pjesme(playlistaID, @velicinaListe);
    SET velicinaListe = @velicinaListe;

    CALL pronadji_prvu_pjesmu(playlistaID, @prvaPjesmaID);
    SET prvaPjesmaID = @prvaPjesmaID;

    CALL pronadji_zadnju_pjesmu(playlistaID, prvaPjesmaID, @zadnjaPjesmaID);
    SET zadnjaPjesmaID = @zadnjaPjesmaID;

    IF velicinaListe = 0 THEN
        INSERT INTO PjesmaPlayLista (pjesmaID, playlistaID, pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID)
        VALUES (pjesmaID, playlistaID, pjesmaID, NULL);
    ELSE
        INSERT INTO PjesmaPlayLista (pjesmaID, playlistaID, pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID)
        VALUES (pjesmaID, playlistaID, prvaPjesmaID, zadnjaPjesmaID);

        UPDATE PjesmaPlayLista
        SET pokazivacNaSljedecuPjesmuID = pjesmaID
        WHERE pjesmaID = zadnjaPjesmaID;
    END IF;

    SET NOCOUNT OFF;
END$$

DELIMITER ;
END;
go

