
CREATE PROCEDURE postoji_pjesma_u_playlisti(IN p_playlistaID BIGINT, IN p_pjesmaID BIGINT, OUT p_postoji INT)
BEGIN
    SELECT COUNT(*) INTO p_postoji
    FROM PjesmaPlayLista
    WHERE playlistaID = p_playlistaID AND pjesmaID = p_pjesmaID;
END //