export type Statistika = {
korisnikID: number;
pjesmaID: number;
brojReprodukcija: number;
ukupnoTrajanje: number; // u sekundama
zadnjePustanje: Date;
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
