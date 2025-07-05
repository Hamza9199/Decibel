import { Pretplata } from "./pretplata.types";

export type KorisnikPretplata = {
  id: number;
  korisnikID: string;
  pretplataID: number;
  pretplataStatus: string;
  datumIsteka?: string;
  pretplata?: Pretplata;
};