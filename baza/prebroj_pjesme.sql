DELIMITER //
CREATE PROCEDURE prebroj_pjesme(IN p_playlistaID BIGINT, OUT p_broj INT)
BEGIN
    SELECT COUNT(pjesmaID) INTO p_broj
    FROM PjesmaPlayLista
    WHERE playlistaID = p_playlistaID;
END //
DELIMITER ;