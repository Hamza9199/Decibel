export type IzvodjacPjesmaVeza = {
    izvodjacID: string;
    pjesmaID: number;
    potvrdjeno?: boolean;
    pjesma?: {
        id: number;
        naziv: string;
        opis?: string;
        putanjaAudio?: string;
        putanjaSlika?: string;
        putanjaGif?: string;
        korisnikID?: string;
        odobreno?: boolean;
        brojLajkova?: number;
        zanr?: string;
        javno?: boolean;
        trajanjeSekunde?: number;
        jezikPjesme?: string;
        albumID?: number;
        licenca?: string;
        eksplicitniSadrzaj?: boolean;
        datumObjave?: string;
        brojReprodukcija?: number;
        korisnik?: {
          id: string;
          korisnicko_ime: string;
          ime?: string;
          prezime?: string;
          putanjaProfilneSlike?: string;

        };
    };
  
  };