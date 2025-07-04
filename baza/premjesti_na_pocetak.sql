DELIMITER //

CREATE PROCEDURE premjesti_na_pocetak(IN playlistaID INT, IN pjesmaID INT)
BEGIN
    DECLARE brojPjesama INT DEFAULT 0;
    DECLARE prvaPjesmaID INT DEFAULT NULL;
    DECLARE postoji INT DEFAULT 0;
    DECLARE ogPrethodnikID INT DEFAULT NULL;
    DECLARE ogSljedbenikID INT DEFAULT NULL;
    DECLARE ogZadnjaID INT DEFAULT NULL;

    -- Prebroj pjesme
    CALL prebroj_pjesme(playlistaID, brojPjesama);

    IF brojPjesama <= 1 THEN
        LEAVE premjesti_na_pocetak;
    END IF;

    -- Prva pjesma
    CALL pronadji_prvu_pjesmu(playlistaID, prvaPjesmaID);

    IF prvaPjesmaID = pjesmaID THEN
        LEAVE premjesti_na_pocetak;
    END IF;

    -- Provjeri postoji li pjesma
    CALL postoji_pjesma_u_playlisti(playlistaID, pjesmaID, postoji);

    IF postoji = 0 THEN
        LEAVE premjesti_na_pocetak;
    END IF;

    -- Zadnja pjesma
    CALL pronadji_zadnju_pjesmu(playlistaID, prvaPjesmaID, ogZadnjaID);

    -- Dohvati originalne susjede
    SELECT pokazivacNaPrethodnuPjesmuID, pokazivacNaSljedecuPjesmuID
    INTO ogPrethodnikID, ogSljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;

    -- Postavi pjesmu na početak
    UPDATE PjesmaPlayLista
    SET pokazivacNaSljedecuPjesmuID = prvaPjesmaID,
        pokazivacNaPrethodnuPjesmuID = NULL
    WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;

    UPDATE PjesmaPlayLista
    SET pokazivacNaPrethodnuPjesmuID = pjesmaID
    WHERE playlistaID = playlistaID AND pjesmaID = prvaPjesmaID;

    IF ogSljedbenikID != prvaPjesmaID THEN
        UPDATE PjesmaPlayLista
        SET pokazivacNaSljedecuPjesmuID = ogSljedbenikID
        WHERE playlistaID = playlistaID AND pjesmaID = ogPrethodnikID;

        UPDATE PjesmaPlayLista
        SET pokazivacNaPrethodnuPjesmuID = ogPrethodnikID
        WHERE playlistaID = playlistaID AND pjesmaID = ogSljedbenikID;
    ELSE
        UPDATE PjesmaPlayLista
        SET pokazivacNaPrethodnuPjesmuID = pjesmaID
        WHERE playlistaID = playlistaID AND pjesmaID = ogSljedbenikID;
    END IF;

    IF ogZadnjaID != pjesmaID THEN
        UPDATE PjesmaPlayLista
        SET pokazivacNaSljedecuPjesmuID = pjesmaID
        WHERE playlistaID = playlistaID AND pjesmaID = ogZadnjaID;
    END IF;

    IF brojPjesama = 2 THEN
        UPDATE PjesmaPlayLista
        SET pokazivacNaPrethodnuPjesmuID = pjesmaID
        WHERE playlistaID = playlistaID AND pjesmaID = prvaPjesmaID;

        UPDATE PjesmaPlayLista
        SET pokazivacNaPrethodnuPjesmuID = NULL
        WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;
    END IF;
END //

DELIMITER ;
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

