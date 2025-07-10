
export type HistorijaSlusanja = {
        id: number;
        pjesmaID: number;
        korisnikID: string;
        kreiranDatumVrijeme: string | null;
        korisnik?: {
                id: string;
                korisnicko_ime: string;
                ime?: string;
                prezime?: string;
                putanjaProfilneSlike?: string;
        };
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
        }

};