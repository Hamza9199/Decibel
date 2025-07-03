from enum import Enum

class KorisnikStatusEnum(str, Enum):
    aktivan = "aktivan"
    neaktivan = "neaktivan"
    suspendovan = "suspendovan"
               