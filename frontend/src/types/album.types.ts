export type Album = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaSlika?: string;
  korisnikID?: string;
  odobreno?: boolean;
  brojLajkova?: number;
  javno?: boolean;
  korisnik?: {
    id: string;
    korisnicko_ime: string;
    ime?: string;
    prezime?: string;
    putanjaProfilneSlike?: string;
  };
};

