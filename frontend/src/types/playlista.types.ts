export type Playlista = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaSlika?: string;
  putanjaGif?: string;
  korisnikID?: string;
  brojLajkova?: number;
  javno?: boolean;
  kreiranDatumVrijeme?: string;
  korisnik?: {
    id: string;
    korisnicko_ime: string;
    ime?: string;
    prezime?: string;
    putanjaProfilneSlike?: string;
  };
};
