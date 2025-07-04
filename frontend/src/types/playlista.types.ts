export type Playlista = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaSlika?: string;
  korisnikID?: string;
  korisnik?: {
    id: string;
    korisnicko_ime: string;
    ime?: string;
    prezime?: string;
    putanjaProfilneSlike?: string;
  };
};
