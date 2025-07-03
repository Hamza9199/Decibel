from enum import Enum

class PretplataStatusEnum(str, Enum):
    aktivna = "aktivna"
    neaktivna = "neaktivna"
    pauzirana = "pauzirana"
    istekla = "istekla"
                