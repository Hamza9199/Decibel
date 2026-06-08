export type Korisnik = {
  id: string;
  korisnicko_ime: string;
  ime?: string;
  prezime?: string;
  putanjaProfilneSlike?: string;
  statusKorisnika?: string;
  rola?: string;
  email?: string;
  brojPratilaca?: number;
  bio?: string;
  obrisan?: boolean;
};
