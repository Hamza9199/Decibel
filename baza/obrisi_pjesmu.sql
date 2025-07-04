

CREATE PROCEDURE obrisi_pjesmu (IN playlistaID BIGINT, IN pjesmaID BIGINT)
BEGIN
    DECLARE postoji INT DEFAULT 0;
    DECLARE prethodnaPjesmaID BIGINT DEFAULT NULL;
    DECLARE sljedecaPjesmaID BIGINT DEFAULT NULL;
    DECLARE prvaPjesmaID BIGINT DEFAULT NULL;
    DECLARE zadnjaPjesmaID BIGINT DEFAULT NULL;

    CALL postoji_pjesma_u_playlisti(playlistaID, pjesmaID, postoji);
    IF postoji = 0 THEN
        LEAVE obrisi_pjesmu;
    END IF;

    CALL pronadji_prvu_pjesmu(playlistaID, prvaPjesmaID);

    SELECT pokazivacNaPrethodnuPjesmuID, pokazivacNaSljedecuPjesmuID
    INTO prethodnaPjesmaID, sljedecaPjesmaID
    FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;

    IF prethodnaPjesmaID IS NULL THEN
        UPDATE PjesmaPlayLista
        SET pokazivacNaPrethodnuPjesmuID = NULL
        WHERE playlistaID = playlistaID AND pjesmaID = sljedecaPjesmaID;

        SELECT pjesmaID INTO zadnjaPjesmaID
        FROM PjesmaPlayLista
        WHERE playlistaID = playlistaID AND pokazivacNaSljedecuPjesmuID IS NULL
        LIMIT 1;

        UPDATE PjesmaPlayLista
        SET pokazivacNaSljedecuPjesmuID = sljedecaPjesmaID
        WHERE playlistaID = playlistaID AND pjesmaID = zadnjaPjesmaID;
    ELSE
        IF sljedecaPjesmaID = prvaPjesmaID THEN
            UPDATE PjesmaPlayLista
            SET pokazivacNaSljedecuPjesmuID = NULL
            WHERE playlistaID = playlistaID AND pjesmaID = prethodnaPjesmaID;

            UPDATE PjesmaPlayLista
            SET pokazivacNaSljedecuPjesmuID = prvaPjesmaID
            WHERE playlistaID = playlistaID AND pjesmaID = prethodnaPjesmaID;
        ELSE
            UPDATE PjesmaPlayLista
            SET pokazivacNaSljedecuPjesmuID = sljedecaPjesmaID
            WHERE playlistaID = playlistaID AND pjesmaID = prethodnaPjesmaID;

            UPDATE PjesmaPlayLista
            SET pokazivacNaPrethodnuPjesmuID = prethodnaPjesmaID
            WHERE playlistaID = playlistaID AND pjesmaID = sljedecaPjesmaID;
        END IF;
    END IF;

    DELETE FROM PjesmaPlayLista
    WHERE playlistaID = playlistaID AND pjesmaID = pjesmaID;
END //
DELIMITER ;