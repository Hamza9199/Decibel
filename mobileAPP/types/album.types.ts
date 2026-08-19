export type Album = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaSlika?: string;
  putanjaGif?: string;
  korisnikID?: string;
  odobreno?: boolean;
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

