DELIMITER //
CREATE PROCEDURE postoji_pjesma_u_playlisti(IN p_playlistaID BIGINT, IN p_pjesmaID BIGINT, OUT p_postoji INT)
BEGIN
    SELECT COUNT(*) INTO p_postoji
    FROM PjesmaPlayLista
    WHERE playlistaID = p_playlistaID AND pjesmaID = p_pjesmaID;
END //
DELIMITER ;

    SELECT
        @pjesma = COUNT(pjesmaID)
    FROM
        PjesmaPlayLista
    WHERE
        playlistaID = @playlistaID
    AND
        pjesmaID = @pjesmaID

    SET NOCOUNT OFF;

    IF @pjesma = 0
        RETURN -1;
    ELSE
        RETURN 1;
END;
go

