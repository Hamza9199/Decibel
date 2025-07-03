-- Ova skripta koristi T-SQL (SQL Server) sintaksu (go, EXEC, SET NOCOUNT ON, itd.)
-- MySQL koristi DELIMITER, nema go, koristi drugačiju sintaksu za promenljive i procedure.
-- Preporuka: Prepiši u MySQL sintaksu.

-- Ova skripta neće raditi na MySQL-u bez konverzije!

CREATE PROCEDURE promjeni_redoslijed (IN playlistaID INT,
                                     IN pjesmaID INT,
                                     IN pocetnaPjesmaID INT)
BEGIN
    --===========================================================================--
-- Provjere (Validacija)
    DECLARE brojPjesama INT;

    CALL dbo.prebroj_pjesme (playlistaID, @brojPjesama);
-- Ako playlista sadrzi manje od dvije pjesme, onda je nepotrebno ovako premjestati pjesme
    IF brojPjesama <= 1 THEN
        LEAVE proc;
    END IF;

    DECLARE postoji_target INT;
    DECLARE postoji_pocetna INT;

    CALL dbo.postoji_pjesma_u_playlisti (playlistaID, pjesmaID, @postoji_target);

    CALL dbo.postoji_pjesma_u_playlisti (playlistaID, pocetnaPjesmaID, @postoji_pocetna);
-- Ako ne postoje target pjesma (pjesma koju zelimo premjesiti) ili pocetna pjesma RETURN
    IF postoji_target = -1 OR postoji_pocetna = -1 THEN
        LEAVE proc;
    END IF;

    --===========================================================================--
-- Bitne varijable radi pozicioniranja pjesama
    DECLARE
        ogPrethodnikID INT, -- Originalni prethodnik target pjesme
        ogSljedbenikID INT, -- Originalni sljebenik target pjesme
        ogPrvaID INT, -- Originalna prva pjesma playliste
        sljedbenikID INT, -- Sljedbenik prve pjesme u playlisti
        ogZadnjaID INT; -- Originalna zadnja pjesma playliste

    CALL dbo.pronadji_prvu_pjesmu (playlistaID, @ogPrvaID);

    CALL dbo.pronadji_zadnju_pjesmu (playlistaID, ogPrvaID, @ogZadnjaID);

-- Postavlja sljedbenika originalne prve pjesme u playlisti
    SELECT pokazivacNaSljedecuPjesmuID
    INTO sljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = pocetnaPjesmaID;

-- Postavlja originalne susjede target pjesme
    SELECT pokazivacNaPrethodnuPjesmuID,
           pokazivacNaSljedecuPjesmuID
    INTO ogPrethodnikID, ogSljedbenikID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = pjesmaID;

    --===========================================================================--
-- Varijable koje sadrze promijenjene pokazivace u odnosu na slucajeve, one se mijenjaju
    DECLARE
        -- Odnose se na pokazivace target pjesme (pjesmaID)
        novaSljedIDOdPjesmaID INT DEFAULT NULL, -- @pjesmaID.pokazivacNaSljedecuPjesmuID
        novaPretIDOdPjesmaID INT DEFAULT NULL, -- @pjesmaID.pokazivacNaPrethodnuPjesmuID
-- Odnose se na pokazivace originalnih susjeda target pjesme
        noviOgSljedID INT DEFAULT NULL, -- @ogPrethodnikID.pokazivacNaSljedecuPjesmuID
        noviOgPretID INT DEFAULT NULL, -- @ogSljedbenikID.pokazivacNaPrethodnuPjesmuID
-- Odnose se na pokazivace novih susjeda target pjesme
        noviSljedID INT DEFAULT NULL, -- @pocetnaPjesmaID.pokazivacNaSljedecuPjesmuID
        noviPretID INT DEFAULT NULL; -- @sljedbenikID.pokazivacNaPrethodnuPjesmuID

--===========================================================================--
-- Default vrijednosti pokazivaca, tj, kada bi se izvrsile oparcije UPDATE, tabela bi ostala ista
    SELECT pokazivacNaSljedecuPjesmuID,
           pokazivacNaPrethodnuPjesmuID
    INTO novaSljedIDOdPjesmaID, novaPretIDOdPjesmaID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = pjesmaID;

    SELECT pokazivacNaSljedecuPjesmuID
    INTO noviOgSljedID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = ogPrethodnikID;

    SELECT pokazivacNaPrethodnuPjesmuID
    INTO noviOgPretID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = ogSljedbenikID;

    SELECT pokazivacNaSljedecuPjesmuID
    INTO noviSljedID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = pocetnaPjesmaID;

    SELECT pokazivacNaPrethodnuPjesmuID
    INTO noviPretID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = sljedbenikID;

    --===========================================================================--
-- Logika promjene varijabli pokazivaca

-- Ako je sljedbenik pocetne pjesme prva pjesma, to znaci da je pocetna pjesma zadnja pjesma,
-- i da je slucaj gdje se nova pjesma dodaje na kraj liste
    IF pocetnaPjesmaID = ogZadnjaID THEN
        BEGIN
            DECLARE drugaPjesmaID INT;
            -- Pribavlja originalnu drugu pjesmu u playlisti
            SELECT pokazivacNaSljedecuPjesmuID
            INTO drugaPjesmaID
            FROM PjesmaPlayLista
            WHERE playlistaID = playlistaID
              AND pjesmaID = ogPrvaID;

            -- Ako je trenutna prva pjesma u playlisti ta koju zelimo staviti na kraj
            IF pjesmaID = ogPrvaID THEN
                BEGIN
                    select 'in here 1';
                    SELECT NULL,
                           pocetnaPjesmaID
                    INTO noviOgPretID, noviPretID;
                END;
            ELSE
                BEGIN
                    select 'in here 2';
                    SELECT ogPrvaID,
                           ogSljedbenikID,
                           ogPrethodnikID,
                           pjesmaID
                    INTO novaSljedIDOdPjesmaID, noviOgSljedID, noviOgPretID, noviSljedID;
                END;
            SELECT pocetnaPjesmaID
        END;
    ELSE -- Ako pocetna nije zadnja
        IF pocetnaPjesmaID = ogPrvaID -- Ako pocetna nije zadnja + Ako je pocetna pjesma prva u playlisti
            BEGIN
                IF ogZadnjaID = pjesmaID -- Ako pocetna nije zadnja + Ako je pocetna pjesma prvu u playlisti + ako je target pjesma zadnja
                    BEGIN
                        SELECT 'in here 3';

                        SELECT sljedbenikID,
                               pocetnaPjesmaID,
                               pjesmaID,
                               pjesmaID,
                               ogPrvaID
                        INTO novaSljedIDOdPjesmaID, novaPretIDOdPjesmaID, noviSljedID, noviPretID, noviOgSljedID;
                    END;
                ELSE -- Ako pocetna nije zadnja + Ako je pocetna pjesma prvu u playlisti + ako je target pjesma u sredini
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

