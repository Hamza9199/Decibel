DELIMITER //

CREATE PROCEDURE NEW_SHIFT_SHORT (
    IN playlistaID INT,
    IN pocetnaPjesmaID INT,
    IN pjesmaID INT
)
BEGIN
    DECLARE brojPjesama INT DEFAULT 0;
    DECLARE prvaPjesmaID INT DEFAULT NULL;
    DECLARE postoji_target INT DEFAULT 0;
    DECLARE postoji_pocetna INT DEFAULT 0;
    DECLARE ogPrethodnikID INT DEFAULT NULL;
    DECLARE ogSljedbenikID INT DEFAULT NULL;
    DECLARE ogZadnjaID INT DEFAULT NULL;
    DECLARE sljedbenikID INT DEFAULT NULL;
    DECLARE predzadnjaPjesmaID INT DEFAULT NULL;
    DECLARE drugaPjesmaID INT DEFAULT NULL;

    CALL prebroj_pjesme(playlistaID, brojPjesama);

    IF brojPjesama <= 1 THEN
        LEAVE NEW_SHIFT_SHORT;
    END IF;

    CALL pronadji_prvu_pjesmu(playlistaID, prvaPjesmaID);

    CALL postoji_pjesma_u_playlisti(playlistaID, pjesmaID, postoji_target);
    CALL postoji_pjesma_u_playlisti(playlistaID, pocetnaPjesmaID, postoji_pocetna);

    IF postoji_target = 0 OR postoji_pocetna = 0 THEN
        LEAVE NEW_SHIFT_SHORT;
    END IF;

    CALL pronadji_zadnju_pjesmu(playlistaID, prvaPjesmaID, ogZadnjaID);

    SELECT pokazivacNaPrethodnuPjesmuID, pokazivacNaSljedecuPjesmuID
      INTO ogPrethodnikID, ogSljedbenikID
      FROM PjesmaPlayLista
     WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;

    SELECT pokazivacNaSljedecuPjesmuID
      INTO sljedbenikID
      FROM PjesmaPlayLista
     WHERE playlistaID = playlistaID AND pjesmaID = pocetnaPjesmaID;

    IF sljedbenikID = pjesmaID AND sljedbenikID != prvaPjesmaID THEN
        LEAVE NEW_SHIFT_SHORT;
    END IF;

    IF pocetnaPjesmaID = pjesmaID THEN
        LEAVE NEW_SHIFT_SHORT;
    END IF;

    -- Ako je sljedbenik pocetne pjesme prva pjesma, to znaci da je pocetna pjesma zadnja pjesma
    IF sljedbenikID = prvaPjesmaID THEN
        -- Pribavlja drugu pjesmu u playlisti
        SELECT pokazivacNaSljedecuPjesmuID INTO drugaPjesmaID
        FROM PjesmaPlayLista
        WHERE playlistaID = playlistaID AND pjesmaID = prvaPjesmaID;

        -- Ako je trenutna prva pjesma u playlisti ta koju zelimo staviti na kraj
        IF pjesmaID = prvaPjesmaID THEN
            CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, NULL, drugaPjesmaID);
            CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, drugaPjesmaID, pjesmaID);
        ELSE
            CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, prvaPjesmaID, pjesmaID);
            CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, ogSljedbenikID, ogPrethodnikID);
            CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, pocetnaPjesmaID);
            CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, ogPrethodnikID, ogSljedbenikID);
        END IF;
    ELSE
        -- Ako je pocetna pjesma prva u listi
        IF pocetnaPjesmaID = prvaPjesmaID THEN
            -- Ako je pjesma koju zelimo da promijenimo poziciju originalna zadnja u playlisti
            IF ogZadnjaID = pjesmaID THEN
                CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, pocetnaPjesmaID);
                CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, pocetnaPjesmaID, pjesmaID);
                CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, prvaPjesmaID, ogPrethodnikID);
            ELSE
                CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, prvaPjesmaID);
                CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, ogPrethodnikID, ogSljedbenikID);
                CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, ogSljedbenikID, ogPrethodnikID);
                CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, prvaPjesmaID, pjesmaID);
            END IF;
        ELSE
            -- Pocetna pjesme je u sredini
            IF pjesmaID = prvaPjesmaID THEN
                SELECT pokazivacNaSljedecuPjesmuID INTO drugaPjesmaID
                FROM PjesmaPlayLista
                WHERE playlistaID = playlistaID AND pjesmaID = prvaPjesmaID;

                CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, NULL, drugaPjesmaID);
                CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, drugaPjesmaID, ogZadnjaID);
            ELSE
                IF pjesmaID = ogZadnjaID THEN
                    -- Zelimo prebaciti zadnju pjesmu negdje u sredinu
                    UPDATE PjesmaPlayLista
                    SET pokazivacNaSljedecuPjesmuID = prvaPjesmaID
                    WHERE playlistaID = playlistaID AND pokazivacNaSljedecuPjesmuID = ogZadnjaID;
                ELSE
                    -- Ako je pocetna pjesma && pjesma koju zelimo da premjestimo u sredini
                    CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, ogSljedbenikID, ogPrethodnikID);
                    CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, ogPrethodnikID, ogSljedbenikID);
                END IF;
            END IF;
            CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, pjesmaID, sljedbenikID);
            CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, pocetnaPjesmaID);
            CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, sljedbenikID, pjesmaID);
        END IF;
    END IF;

    CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, pocetnaPjesmaID, pjesmaID);

END //

DELIMITER ;