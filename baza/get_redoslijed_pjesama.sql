DELIMITER //

CREATE PROCEDURE get_redoslijed_pjesama(IN p_playlistaID BIGINT)
BEGIN
    -- Kreiraj privremenu tabelu za redoslijed
    CREATE TEMPORARY TABLE IF NOT EXISTS redoslijed (
        redoslijedPjesama INT AUTO_INCREMENT PRIMARY KEY,
        pjesmaID BIGINT,
        playlistaID BIGINT,
        pokazivacNaSljedecuPjesmuID BIGINT,
        pokazivacNaPrethodnuPjesmuID BIGINT,
        kreiranDatumVrijeme DATETIME
    );

    -- Prva pjesma (ona koja nema prethodnika)
    INSERT INTO redoslijed (pjesmaID, playlistaID, pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID, kreiranDatumVrijeme)
    SELECT pjesmaID, playlistaID, pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID, kreiranDatumVrijeme
    FROM PjesmaPlayLista
    WHERE playlistaID = p_playlistaID AND pokazivacNaPrethodnuPjesmuID IS NULL;

    -- Dodaj ostale pjesme po redu
    WHILE EXISTS (
        SELECT 1 FROM PjesmaPlayLista p
        LEFT JOIN redoslijed r ON p.pjesmaID = r.pjesmaID
        WHERE r.pjesmaID IS NULL AND p.playlistaID = p_playlistaID
    ) DO
        INSERT INTO redoslijed (pjesmaID, playlistaID, pokazivacNaSljedecuPjesmuID, pokazivacNaPrethodnuPjesmuID, kreiranDatumVrijeme)
        SELECT p.pjesmaID, p.playlistaID, p.pokazivacNaSljedecuPjesmuID, p.pokazivacNaPrethodnuPjesmuID, p.kreiranDatumVrijeme
        FROM PjesmaPlayLista p
        INNER JOIN redoslijed r ON p.pokazivacNaPrethodnuPjesmuID = r.pjesmaID
        WHERE p.playlistaID = p_playlistaID
        AND NOT EXISTS (SELECT 1 FROM redoslijed r2 WHERE r2.pjesmaID = p.pjesmaID);
    END WHILE;

    -- Vrati rezultat
    SELECT * FROM redoslijed ORDER BY redoslijedPjesama;

    -- Očisti privremenu tabelu
    DROP TEMPORARY TABLE IF EXISTS redoslijed;
END //

DELIMITER ;
               p.pokazivacNaPrethodnuPjesmuID = op.pjesmaID
      WHERE p.playlistaID = playlistaID
        AND NOT EXISTS
          (SELECT 1
           FROM redoslijed o
           WHERE o.pjesmaID = p.pjesmaID);
  END WHILE;

  SELECT *
  FROM redoslijed
  ORDER BY redoslijedPjesama;

  DROP TEMPORARY TABLE redoslijed;
END //
DELIMITER ;
    DROP TABLE
        #redoslijed;

    SET NOCOUNT OFF;
END;
go

