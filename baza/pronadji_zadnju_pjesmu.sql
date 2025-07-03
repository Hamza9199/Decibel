DELIMITER //
CREATE PROCEDURE pronadji_zadnju_pjesmu(IN p_playlistaID BIGINT, IN p_prvaPjesmaID BIGINT, OUT p_zadnjaPjesmaID BIGINT)
BEGIN
    SELECT pjesmaID INTO p_zadnjaPjesmaID
    FROM PjesmaPlayLista
    WHERE playlistaID = p_playlistaID AND pokazivacNaSljedecuPjesmuID = p_prvaPjesmaID
    LIMIT 1;
END //
DELIMITER ;

