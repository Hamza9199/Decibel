

CREATE PROCEDURE dodaj_pjesmu_na_kraj_liste (IN pjesmaID BIGINT, IN playlistaID BIGINT)
BEGIN
    DECLARE velicinaListe INT DEFAULT 0;
    DECLARE prvaPjesmaID BIGINT DEFAULT NULL;
    DECLARE zadnjaPjesmaID BIGINT DEFAULT NULL;

    CALL prebroj_pjesme(playlistaID, velicinaListe);
    CALL pronadji_prvu_pjesmu(playlistaID, prvaPjesmaID);
    CALL pronadji_zadnju_pjesmu(playlistaID, prvaPjesmaID, zadnjaPjesmaID);

    IF velicinaListe = 0 THEN
        INSERT INTO PjesmaPlayLista (pjesmaID, playlistaID, pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID)
        VALUES (pjesmaID, playlistaID, pjesmaID, NULL);
    ELSE
        INSERT INTO PjesmaPlayLista (pjesmaID, playlistaID, pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID)
        VALUES (pjesmaID, playlistaID, prvaPjesmaID, zadnjaPjesmaID);

        UPDATE PjesmaPlayLista
        SET pokazivacNaSljedecuPjesmuID = pjesmaID
        WHERE pjesmaID = zadnjaPjesmaID AND playlistaID = playlistaID;
    END IF;