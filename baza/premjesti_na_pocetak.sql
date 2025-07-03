DELIMITER $$

CREATE PROCEDURE premjesti_na_pocetak (IN playlistaID INT, IN pjesmaID INT)
BEGIN
    DECLARE brojPjesama INT;

    CALL prebroj_pjesme(playlistaID, @brojPjesama);
    SELECT @brojPjesama INTO brojPjesama;

    IF brojPjesama <= 1 THEN
        LEAVE premjesti_na_pocetak;
    END IF;

    DECLARE prvaPjesmaID INT;

    CALL pronadji_prvu_pjesmu(playlistaID, @prvaPjesmaID);
    SELECT @prvaPjesmaID INTO prvaPjesmaID;

    IF prvaPjesmaID = pjesmaID THEN
        LEAVE premjesti_na_pocetak;
    END IF;

    DECLARE postoji INT;

    CALL postoji_pjesma_u_playlisti(playlistaID, pjesmaID, @postoji);
    SELECT @postoji INTO postoji;

    IF postoji = -1 THEN
        LEAVE premjesti_na_pocetak;
    END IF;

    DECLARE ogPrethodnikID INT;
    DECLARE ogSljedbenikID INT;
    DECLARE ogZadnjaID INT;

    CALL pronadji_zadnju_pjesmu(playlistaID, prvaPjesmaID, @ogZadnjaID);
    SELECT @ogZadnjaID INTO ogZadnjaID;

    SELECT pokazivacNaPrethodnuPjesmuID, pokazivacNaSljedecuPjesmuID
    INTO ogPrethodnikID, ogSljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = pjesmaID;


    UPDATE PjesmaPlayLista
    SET pokazivacNaSljedecuPjesmuID  = prvaPjesmaID,
        pokazivacNaPrethodnuPjesmuID = NULL
    WHERE playlistaID = playlistaID
      AND pjesmaID = pjesmaID;


    UPDATE PjesmaPlayLista
    SET pokazivacNaPrethodnuPjesmuID = pjesmaID
    WHERE playlistaID = playlistaID
      AND pjesmaID = prvaPjesmaID;


    IF ogSljedbenikID != prvaPjesmaID THEN
        BEGIN
            UPDATE PjesmaPlayLista
            SET pokazivacNaSljedecuPjesmuID = ogSljedbenikID
            WHERE playlistaID = playlistaID
              AND pjesmaID = ogPrethodnikID;

            UPDATE PjesmaPlayLista
            SET pokazivacNaPrethodnuPjesmuID = ogPrethodnikID
            WHERE playlistaID = playlistaID
              AND pjesmaID = ogSljedbenikID;
        END;
    ELSE
        BEGIN
            UPDATE PjesmaPlayLista
            SET pokazivacNaPrethodnuPjesmuID = pjesmaID
            WHERE playlistaID = playlistaID
              AND pjesmaID = ogSljedbenikID;
        END;

    IF ogZadnjaID != pjesmaID THEN
        BEGIN
            UPDATE PjesmaPlayLista
            SET pokazivacNaSljedecuPjesmuID = pjesmaID
            WHERE playlistaID = playlistaID
              AND pjesmaID = ogZadnjaID;
        END;

    IF brojPjesama = 2 THEN
        BEGIN
            UPDATE PjesmaPlayLista
            SET pokazivacNaPrethodnuPjesmuID = pjesmaID
            WHERE playlistaID = playlistaID
              AND pjesmaID = prvaPjesmaID;

            UPDATE PjesmaPlayLista
            SET pokazivacNaPrethodnuPjesmuID = NULL
            WHERE playlistaID = playlistaID
              AND pjesmaID = pjesmaID;
        END;
END$$

DELIMITER ;
END;
go

