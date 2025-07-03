DELIMITER //
CREATE PROCEDURE pronadji_prvu_pjesmu(IN p_playlistaID BIGINT, OUT p_prvaPjesmaID BIGINT)
BEGIN
    SELECT pjesmaID INTO p_prvaPjesmaID
    FROM PjesmaPlayLista
    WHERE playlistaID = p_playlistaID AND pokazivacNaPrethodnuPjesmuID IS NULL
    LIMIT 1;
END //
DELIMITER ;
    FROM PjesmaPlayLista
    WHERE playlistaID = @playlistaID
      AND pokazivacNaPrethodnuPjesmuID IS NULL;

    SET NOCOUNT ON;

    RETURN @prvaPjesma;
END
go

