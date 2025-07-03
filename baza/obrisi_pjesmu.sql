DELIMITER $$

CREATE PROCEDURE obrisi_pjesmu (IN playlistaID INT,
                               IN pjesmaID INT)
BEGIN
    DECLARE
        postoji INT;
    CALL postoji_pjesma_u_playlisti(playlistaID, pjesmaID, @postoji);
    SELECT @postoji INTO postoji;

    IF
        postoji = -1
        THEN LEAVE obrisi_pjesmu;

    DECLARE
        prethodnaPjesmaID INT;
    DECLARE
        sljedecaPjesmaID INT;
    DECLARE
        prvaPjesmaID INT;

    CALL pronadji_prvu_pjesmu(playlistaID, @prvaPjesmaID);
    SELECT @prvaPjesmaID INTO prvaPjesmaID;

    SELECT pokazivacNaPrethodnuPjesmuID,
           pokazivacNaSljedecuPjesmuID
    INTO prethodnaPjesmaID, sljedecaPjesmaID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = pjesmaID;

    IF
        prethodnaPjesmaID IS NULL
        THEN
            UPDATE PjesmaPlayLista
            SET pokazivacNaPrethodnuPjesmuID = NULL
            WHERE playlistaID = playlistaID
              AND pjesmaID = sljedecaPjesmaID;

            DECLARE
                zadnjaPjesmaID INT;
            SELECT pjesmaID
            INTO zadnjaPjesmaID
            FROM PjesmaPlayLista
            WHERE playlistaID = playlistaID
              AND pokazivacNaSljedecuPjesmuID IS NULL;

            UPDATE PjesmaPlayLista
            SET pokazivacNaSljedecuPjesmuID = sljedecaPjesmaID
            WHERE playlistaID = playlistaID
              AND pjesmaID = zadnjaPjesmaID;
        ELSE
        IF sljedecaPjesmaID = prvaPjesmaID
            THEN
                UPDATE PjesmaPlayLista
                SET pokazivacNaSljedecuPjesmuID = NULL
                WHERE playlistaID = playlistaID
                  AND pjesmaID = prethodnaPjesmaID;

                UPDATE PjesmaPlayLista
                SET pokazivacNaSljedecuPjesmuID = prvaPjesmaID
                WHERE playlistaID = playlistaID
                  AND pjesmaID = prethodnaPjesmaID;
            ELSE
                BEGIN
                    UPDATE PjesmaPlayLista
                    SET pokazivacNaSljedecuPjesmuID = sljedecaPjesmaID
                    WHERE playlistaID = playlistaID
                      AND pjesmaID = prethodnaPjesmaID;

                    UPDATE PjesmaPlayLista
                    SET pokazivacNaPrethodnuPjesmuID = prethodnaPjesmaID
                    WHERE playlistaID = playlistaID
                      AND pjesmaID = sljedecaPjesmaID;
                END;

    DELETE
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID
      AND pjesmaID = pjesmaID;
END$$

DELIMITER ;