DELIMITER //
CREATE PROCEDURE NEW_SHIFT_SHORT (IN playlistaID INT,
                                 IN pocetnaPjesmaID INT,
                                 IN pjesmaID INT)
BEGIN
    DECLARE brojPjesama INT;

    CALL dbo.prebroj_pjesme(playlistaID, brojPjesama);

    IF brojPjesama <= 1 THEN
        LEAVE proc;
    END IF;

    DECLARE prvaPjesmaID INT;

    CALL dbo.pronadji_prvu_pjesmu(playlistaID, prvaPjesmaID);

    DECLARE postoji_target INT;
    DECLARE postoji_pocetna INT;

    CALL dbo.postoji_pjesma_u_playlisti(playlistaID, pjesmaID, postoji_target);
    CALL dbo.postoji_pjesma_u_playlisti(playlistaID, pocetnaPjesmaID, postoji_pocetna);

    IF postoji_target = -1 OR postoji_pocetna = -1 THEN
        LEAVE proc;
    END IF;

    DECLARE ogPrethodnikID INT;
    DECLARE ogSljedbenikID INT;
    DECLARE ogZadnjaID INT;

    CALL dbo.pronadji_zadnju_pjesmu(playlistaID, prvaPjesmaID, ogZadnjaID);

    SELECT pokazivacNaPrethodnuPjesmuID, pokazivacNaSljedecuPjesmuID INTO ogPrethodnikID, ogSljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;

    DECLARE sljedbenikID INT;

    SELECT pokazivacNaSljedecuPjesmuID INTO sljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pocetnaPjesmaID;

    -- Ako je nova dodana pjesma vec sljedbenik pocetnoj pjesmi
    IF sljedbenikID = pjesmaID AND sljedbenikID != prvaPjesmaID THEN
        LEAVE proc;
    END IF;

    IF pocetnaPjesmaID = pjesmaID THEN
        LEAVE proc;
    END IF;

    DECLARE predzadnjaPjesmaID INT;

    SELECT @predzadnjaPjesmaID = @pjesmaID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pokazivacNaSljedecuPjesmuID = ogZadnjaID;

    -- Ako je sljedbenik pocetne pjesme prva pjesma, to znaci da je pocetna pjesma zadnja pjesma,
    -- to je slucaj gdje se nova pjesma dodaje na kraj liste
    IF sljedbenikID = prvaPjesmaID THEN
        BEGIN
            DECLARE drugaPjesmaID INT;
            -- Pribavlja drugu pjesmu u playlisti
            SELECT pokazivacNaSljedecuPjesmuID INTO drugaPjesmaID
            FROM PjesmaPlayLista
            WHERE playlistaID = playlistaID AND pjesmaID = prvaPjesmaID;

            -- Ako je trenutna prva pjesma u playlisti ta koju zelimo staviti na kraj
            IF pjesmaID = prvaPjesmaID THEN
                BEGIN
                    CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, NULL, drugaPjesmaID);
                    CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, drugaPjesmaID, pjesmaID);
                END;
            ELSE
                BEGIN
                    CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, prvaPjesmaID, pjesmaID);
                    CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, ogSljedbenikID, ogPrethodnikID);
                    CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, pocetnaPjesmaID);
                    CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, ogPrethodnikID, ogSljedbenikID);
                END;
        END;
    ELSE
        -- Ako je pocetna pjesma prva u listi
        IF pocetnaPjesmaID = prvaPjesmaID THEN
            BEGIN
                -- Ako je pjesma koju zelimo da promijenimo poziciju originalna zadnja u playlisti
                IF ogZadnjaID = pjesmaID THEN
                    BEGIN
                        CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, pocetnaPjesmaID);
                        CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, pocetnaPjesmaID, pjesmaID);
                        CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, prvaPjesmaID, ogPrethodnikID);
                    END;
                ELSE
                    BEGIN
                        CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, prvaPjesmaID);
                        CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, ogPrethodnikID, ogSljedbenikID);
                        CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, ogSljedbenikID, ogPrethodnikID);
                        CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, prvaPjesmaID, pjesmaID);
                    END;
            END;
        ELSE -- Pocetna pjesme je u sredini
            BEGIN
                IF pjesmaID = prvaPjesmaID THEN
                    BEGIN
                        SELECT pokazivacNaSljedecuPjesmuID INTO drugaPjesmaID
                        FROM PjesmaPlayLista
                        WHERE playlistaID = playlistaID AND pjesmaID = prvaPjesmaID;

                        CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, NULL, drugaPjesmaID);
                        CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, drugaPjesmaID, ogZadnjaID);
                    END;
                ELSE
                    BEGIN
                        IF pjesmaID = ogZadnjaID THEN
                            BEGIN
                                -- Zelimo prebaciti zadnju pjesmu negdje u sredinu


                                UPDATE PjesmaPlayLista
                                SET pokazivacNaSljedecuPjesmuID = prvaPjesmaID
                                WHERE playlistaID = playlistaID AND pokazivacNaSljedecuPjesmuID = ogZadnjaID;

                            END;
                        ELSE -- Ako je pocetna pjesma && pjesma koju zelimo da premjestimo u sredini
                            BEGIN
                                CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, ogSljedbenikID, ogPrethodnikID);
                                CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, ogPrethodnikID, ogSljedbenikID);
                            END;
                    END;
                CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, pjesmaID, sljedbenikID);
                CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, pjesmaID, pocetnaPjesmaID);
                CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, sljedbenikID, pjesmaID);
            END;



    CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, pocetnaPjesmaID, pjesmaID);

    LEAVE proc;
END //
DELIMITER ;