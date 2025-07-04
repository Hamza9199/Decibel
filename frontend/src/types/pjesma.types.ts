export type Pjesma = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaAudio?: string;
  putanjaSlika?: string;
  putanjaGif?: string;
  korisnikID?: string;
  korisnik?: {
    id: string;
    korisnicko_ime: string;
    ime?: string;
    prezime?: string;
    putanjaProfilneSlike?: string;
  };
};
