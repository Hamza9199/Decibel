
DELIMITER //

CREATE PROCEDURE promjeni_redoslijed (
    IN playlistaID INT,
    IN pjesmaID INT,
    IN pocetnaPjesmaID INT
)
BEGIN
    DECLARE brojPjesama INT DEFAULT 0;
    DECLARE postoji_target INT DEFAULT 0;
    DECLARE postoji_pocetna INT DEFAULT 0;
    DECLARE ogPrethodnikID INT DEFAULT NULL;
    DECLARE ogSljedbenikID INT DEFAULT NULL;
    DECLARE ogPrvaID INT DEFAULT NULL;
    DECLARE sljedbenikID INT DEFAULT NULL;
    DECLARE ogZadnjaID INT DEFAULT NULL;
    DECLARE novaSljedIDOdPjesmaID INT DEFAULT NULL;
    DECLARE novaPretIDOdPjesmaID INT DEFAULT NULL;
    DECLARE noviOgSljedID INT DEFAULT NULL;
    DECLARE noviOgPretID INT DEFAULT NULL;
    DECLARE noviSljedID INT DEFAULT NULL;
    DECLARE noviPretID INT DEFAULT NULL;
    DECLARE drugaPjesmaID INT DEFAULT NULL;

    -- Provjere (Validacija)
    CALL prebroj_pjesme(playlistaID, brojPjesama);
    IF brojPjesama <= 1 THEN
        LEAVE promjeni_redoslijed;
    END IF;

    CALL postoji_pjesma_u_playlisti(playlistaID, pjesmaID, postoji_target);
    CALL postoji_pjesma_u_playlisti(playlistaID, pocetnaPjesmaID, postoji_pocetna);
    IF postoji_target = 0 OR postoji_pocetna = 0 THEN
        LEAVE promjeni_redoslijed;
    END IF;

    -- Bitne varijable radi pozicioniranja pjesama
    CALL pronadji_prvu_pjesmu(playlistaID, ogPrvaID);
    CALL pronadji_zadnju_pjesmu(playlistaID, ogPrvaID, ogZadnjaID);

    SELECT pokazivacNaSljedecuPjesmuID INTO sljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pocetnaPjesmaID;

    SELECT pokazivacNaPrethodnuPjesmuID, pokazivacNaSljedecuPjesmuID
    INTO ogPrethodnikID, ogSljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;

    -- Default vrijednosti pokazivaca
    SELECT pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID
    INTO novaSljedIDOdPjesmaID, novaPretIDOdPjesmaID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;

    SELECT pokazivacNaSljedecuPjesmuID INTO noviOgSljedID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = ogPrethodnikID;

    SELECT pokazivacNaPrethodnuPjesmuID INTO noviOgPretID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = ogSljedbenikID;

    SELECT pokazivacNaSljedecuPjesmuID INTO noviSljedID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pocetnaPjesmaID;

    SELECT pokazivacNaPrethodnuPjesmuID INTO noviPretID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = sljedbenikID;

    -- Logika promjene varijabli pokazivaca
    IF pocetnaPjesmaID = ogZadnjaID THEN
        SELECT pokazivacNaSljedecuPjesmuID INTO drugaPjesmaID
        FROM PjesmaPlayLista
        WHERE playlistaID = playlistaID AND pjesmaID = ogPrvaID;

        IF pjesmaID = ogPrvaID THEN
            SET noviOgPretID = NULL;
            SET noviPretID = pocetnaPjesmaID;
        ELSE
            SET novaSljedIDOdPjesmaID = ogPrvaID;
            SET noviOgSljedID = ogSljedbenikID;
            SET noviOgPretID = ogPrethodnikID;
            SET noviSljedID = pjesmaID;
            SET noviPretID = pocetnaPjesmaID;
        END IF;
    ELSE
        IF pocetnaPjesmaID = ogPrvaID THEN
            IF ogZadnjaID = pjesmaID THEN
                SET novaSljedIDOdPjesmaID = sljedbenikID;
                SET novaPretIDOdPjesmaID = pocetnaPjesmaID;
                SET noviSljedID = pjesmaID;
                SET noviPretID = pjesmaID;
                SET noviOgSljedID = ogPrvaID;
            ELSE
                SET novaSljedIDOdPjesmaID = sljedbenikID;
                SET novaPretIDOdPjesmaID = ogPrvaID;
                SET noviOgPretID = ogPrethodnikID;
                SET noviOgSljedID = ogSljedbenikID;
                SET noviPretID = pjesmaID;
                SET noviSljedID = pjesmaID;
            END IF;
        ELSE
            IF pjesmaID = ogPrvaID THEN
                SELECT pokazivacNaSljedecuPjesmuID INTO drugaPjesmaID
                FROM PjesmaPlayLista
                WHERE playlistaID = playlistaID AND pjesmaID = ogPrvaID;

                SET novaSljedIDOdPjesmaID = sljedbenikID;
                SET novaPretIDOdPjesmaID = pocetnaPjesmaID;
                SET noviPretID = pjesmaID;
                SET noviSljedID = pjesmaID;
                SET noviOgPretID = NULL;

                UPDATE PjesmaPlayLista
                SET pokazivacNaSljedecuPjesmuID = ogSljedbenikID
                WHERE playlistaID = playlistaID AND pjesmaID = ogZadnjaID;
            ELSE
                IF pjesmaID = ogZadnjaID THEN
                    SET noviOgSljedID = ogPrvaID;
                    SET novaSljedIDOdPjesmaID = sljedbenikID;
                    SET novaPretIDOdPjesmaID = pocetnaPjesmaID;
                    SET noviSljedID = pjesmaID;
                    SET noviPretID = pjesmaID;
                ELSE
                    SET noviSljedID = pjesmaID;
                    SET noviPretID = pjesmaID;
                    SET novaSljedIDOdPjesmaID = sljedbenikID;
                    SET novaPretIDOdPjesmaID = pocetnaPjesmaID;
                    SET noviOgSljedID = ogSljedbenikID;
                    SET noviOgPretID = ogPrethodnikID;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Promjene Pokazivaca
    CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, novaSljedIDOdPjesmaID, pjesmaID);
    CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, novaPretIDOdPjesmaID, pjesmaID);
    CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, noviOgSljedID, ogPrethodnikID);
    CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, noviOgPretID, ogSljedbenikID);
    CALL premjesti_pokazivac_na_sljedecu_pjesmu(playlistaID, noviSljedID, pocetnaPjesmaID);
    CALL premjesti_pokazivac_na_prethodnu_pjesmu(playlistaID, noviPretID, sljedbenikID);

END //

DELIMITER ;
                    BEGIN
                        SELECT 'in here 4';

                        SELECT sljedbenikID,
                               ogPrvaID,
                               ogPrethodnikID,
                               ogSljedbenikID,
                               pjesmaID,
                               pjesmaID
                        INTO novaSljedIDOdPjesmaID, novaPretIDOdPjesmaID, noviOgPretID, noviOgSljedID, noviPretID, noviSljedID;
                    END;
            END;
        ELSE -- Ako pocetna nije zadnja + Pocetna pjesme je u sredini
            BEGIN
                IF pjesmaID = ogPrvaID -- Ako pocetna nije zadnja + Pocetna pjesme je u sredini + ako je target pjesma prva pjesma u playlisti
                    BEGIN
                        SELECT 'in here 5';

                        SELECT sljedbenikID,
                               pocetnaPjesmaID,
                               pjesmaID,
                               pjesmaID,
                               NULL
                        INTO novaSljedIDOdPjesmaID, novaPretIDOdPjesmaID, noviPretID, noviSljedID, noviOgPretID;

                        UPDATE
                            PjesmaPlayLista
                        SET pokazivacNaSljedecuPjesmuID = ogSljedbenikID
                        WHERE playlistaID = playlistaID
                          AND pjesmaID = ogZadnjaID;
                    END;
                ELSE -- Ako pocetna nije zadnja + Pocetna pjesme je u sredini + ako nije target pjesma prva pjesma u playlisti
                    IF pjesmaID = ogZadnjaID -- Ako pocetna nije zadnja + Pocetna pjesme je u sredini + ako nije target pjesma prva pjesma u playlisti + ako je target zadnja pjesma u playlisti
                        BEGIN
                            -- Zelimo prebaciti zadnju pjesmu negdje u sredinu
                            SELECT 'in here 6';

                            SELECT ogPrvaID,
                                   sljedbenikID,
                                   pocetnaPjesmaID,
                                   pjesmaID,
                                   pjesmaID
                            INTO noviOgSljedID, novaSljedIDOdPjesmaID, novaPretIDOdPjesmaID, noviSljedID, noviPretID
                        END;
                    ELSE -- Ako pocetna nije zadnja + Pocetna pjesme je u sredini + ako nije target pjesma prva pjesma u playlisti + ako nije target zadnja pjesma u playlisti
                        BEGIN
                            SELECT 'in here 7';

                            SELECT pjesmaID,
                                   pjesmaID,
                                   sljedbenikID,
                                   pocetnaPjesmaID,
                                   ogSljedbenikID,
                                   ogPrethodnikID
                            INTO noviSljedID, noviPretID, novaSljedIDOdPjesmaID, novaPretIDOdPjesmaID, noviOgSljedID, noviOgPretID
                        END;
            END;

    --===========================================================================--
-- Promjene Pokazivaca

-- Promjena pokazivaca sljedece pjesme target pjesme, tj. pjesme cijoj mjenjamo poziciju -> pjesmaID.pokazivacNaSljedecuPjesmuID
    CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu (playlistaID, novaSljedIDOdPjesmaID, pjesmaID);
-- Promjena pokazivaca prethodne pjesme target pjesme, tj. pjesme cijoj mjenjamo poziciju -> pjesmaID.pokazivacNaPrethodnuPjesmuID
    CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu (playlistaID, novaPretIDOdPjesmaID, pjesmaID);
-- Promjena pokazivaca originalnog prethodnika pjesmeID, tj. prethodnik pjesme cija je pozicija promijenjena prije promjene -> ogPrethodnikID.pokazivacNaSljedecuPjesmuID
    CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu (playlistaID, noviOgSljedID, ogPrethodnikID);
-- Promjena pokazivaca originalnog sljedbenika pjesmeID, tj. prethodnik pjesme cija je pozicija promijenjena prije promjene -> ogSljedbenikID.pokazivacNaPrethodnuPjesmuID
    CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu (playlistaID, noviOgPretID, ogSljedbenikID);
-- Promjena pokazivaca novog prethodnika pjesmeID -> @pocetnaPjesmaID.pokazivacNaSljedecuPjesmuID
    CALL dbo.premjesti_pokazivac_na_sljedecu_pjesmu (playlistaID, noviSljedID, pocetnaPjesmaID);
-- Promjena pokazivaca novog sljedbenika pjesmeID -> @sljedbenikID.pokazivacNaPrethodnuPjesmuID
    CALL dbo.premjesti_pokazivac_na_prethodnu_pjesmu (playlistaID, noviPretID, sljedbenikID);

    END$$

DELIMITER ;

