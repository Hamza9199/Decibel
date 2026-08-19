
export type StatistikaReprodukcije = {
  id: number;
  korisnikID: string;
  pjesmaID: number;
  brojReprodukcija: number;
  ukupnoTrajanje: number;
  zadnjePustanje?: string; // ISO string
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


