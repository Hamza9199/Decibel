

CREATE PROCEDURE premjesti_pokazivac_na_sljedecu_pjesmu(IN p_playlistaID BIGINT, IN p_naPjesmuID BIGINT, IN p_gdjeJePjesmaID BIGINT)
BEGIN
    UPDATE PjesmaPlayLista
    SET pokazivacNaSljedecuPjesmuID = p_naPjesmuID
    WHERE playlistaID = p_playlistaID AND pjesmaID = p_gdjeJePjesmaID;
END //