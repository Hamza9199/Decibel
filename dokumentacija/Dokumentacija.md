# Dokumentacija projekta Decibel

## Sadržaj

1. [Uvod](#uvod)
2. [Arhitektura](#arhitektura)
3. [Backend](#backend)
   - [Tehnologije](#tehnologije-backenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-backend)
   - [Modeli](#modeli)
   - [Rute](#rute)
   - [Kontroleri](#kontroleri)
   - [Baza podataka](#baza-podataka)
   - [Firebase Storage](#firebase-storage)
   - [Pokretanje i razvoj](#pokretanje-i-razvoj)
   - [Deploy](#deploy-backend)
4. [Frontend](#frontend)
   - [Tehnologije](#tehnologije-frontenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-frontend)
   - [Prikaz podataka](#prikaz-podataka)
   - [Audio player](#audio-player)
   - [Deploy](#deploy-frontend)
5. [Mobilna aplikacija](#mobilna-aplikacija)
   - [Tehnologije](#tehnologije-mobilne-aplikacije)
   - [Struktura direktorijuma](#struktura-direktorijuma-mobilna)
   - [MVVM i slojevi](#mvvm-i-slojevi)
   - [Audio player](#audio-player-mobilna)
6. [Dodatno](#dodatno)
7. [Reference](#reference)

---

## 1. Uvod

Decibel je muzička platforma (web + mobilna aplikacija) za upravljanje, prikaz i slušanje pjesama, albuma, plejlista i korisnika. Projekat je razvijen kao diplomski rad i koristi moderne tehnologije za backend, frontend i mobilni deo.

---

## 2. Arhitektura

Aplikacija je podeljena na tri glavna dela:
- **Backend**: FastAPI (Python), MySQL (Aiven Cloud), Firebase Storage
- **Frontend**: React (TypeScript), Vite
- **Mobilna aplikacija**: Android (Kotlin, MVVM)

Komunikacija između frontenda/mobilne aplikacije i backenda se odvija putem REST API-ja.

---

## 3. Backend

### Tehnologije backenda

- **FastAPI** – web framework za Python
- **SQLAlchemy** – ORM za rad sa bazom
- **databases** – async rad sa bazom
- **aiomysql** – async MySQL drajver
- **Alembic** – migracije baze
- **python-dotenv** – rad sa .env fajlovima
- **passlib** – heširanje lozinki
- **requests** – HTTP zahtevi (za Firebase Storage)
- **firebase-admin** (opciono) – rad sa Firebase servisima

### Struktura direktorijuma (backend)

```
backend/
│
├── main.py
├── requirements.txt
├── .env
├── Spacefile
├── alembic/
│   └── ... (migracije)
├── modeli/
│   ├── Korisnik.py
│   ├── Album.py
│   ├── Pjesma.py
│   ├── Playlista.py
│   ├── Komentar.py
│   ├── IzvodjacPjesma.py
│   ├── PjesmaPlaylista.py
│   ├── KorisnikPlaylista.py
│   ├── KorisnikPjesma.py
│   ├── KorisnikAlbum.py
│   ├── PratilacKorisnik.py
│   ├── RedoslijedPjesama.py
│   ├── StatistikaReprodukcije.py
│   ├── HistorijaSlusanja.py
│   ├── Pretplata.py
│   ├── PretplataStatus.py
│   ├── KorisnikPretplata.py
│   ├── ObnovaPretplate.py
│   └── __init__.py
├── kontroleri/
│   ├── KorisnikKontroler.py
│   ├── PjesmaKontroler.py
│   ├── AlbumKontroler.py
│   ├── PlaylistaKontroler.py
│   ├── PratilacKorisnikKontroler.py
│   └── __init__.py
├── rute/
│   ├── KorisnikRuta.py
│   ├── PjesmaRuta.py
│   ├── AlbumRuta.py
│   ├── PlaylistaRuta.py
│   ├── PratilacKorisnikRuta.py
│   └── __init__.py
├── servisi/
│   ├── Baza.py
│   ├── FirebaseStorage.py
│   └── __init__.py
└── ...
```

### Modeli

- **KorisnikORM**: Model korisnika (UUID, ime, prezime, korisničko ime, email, lozinka, rola, status, profilna slika, broj pratilaca)
- **AlbumORM**: Model albuma (ID, korisnikID, naziv, opis, slike, gif, javnost, broj lajkova)
- **PjesmaORM**: Model pjesme (ID, korisnikID, albumID, naziv, opis, datum objave, trajanje, putanje do fajlova, zanr, broj lajkova, broj reprodukcija, eksplicitnost, jezik, licenca)
- **PlaylistaORM**: Model playliste (ID, korisnikID, naziv, opis, slike, gif, javnost, broj lajkova)
- **KomentarORM**: Komentari na pjesme
- **IzvodjacPjesmaORM**: Veza pjesma-izvođač
- **PjesmaPlaylistaORM**: Veza pjesma-playlista (redoslijed)
- **KorisnikPlaylistaORM**: Veza korisnik-playlista (prati)
- **KorisnikPjesmaORM**: Veza korisnik-pjesma (omiljene)
- **KorisnikAlbumORM**: Veza korisnik-album (omiljeni)
- **PratilacKorisnikORM**: Veza korisnik-pratilac
- **RedoslijedPjesamaORM**: Redoslijed pjesama u playlisti
- **StatistikaReprodukcijeORM**: Statistika slušanja pjesama
- **HistorijaSlusanjaORM**: Historija slušanja korisnika
- **PretplataORM**: Model pretplate
- **KorisnikPretplataORM**: Veza korisnik-pretplata
- **ObnovaPretplateORM**: Evidencija obnova pretplate

### Rute

- `/api/korisnici/` – CRUD operacije nad korisnicima (registracija, login, izmena, brisanje, dohvatanje, promena slike)
- `/api/pjesme/` – CRUD operacije nad pjesmama (kreiranje, izmena, brisanje, dohvatanje)
- `/api/albumi/` – CRUD operacije nad albumima
- `/api/playliste/` – CRUD operacije nad playlistama
- `/api/pratioci/` – praćenje korisnika
- ...i ostale rute za sve modele

### Kontroleri

- **KorisnikKontroler.py**: Poslovna logika za korisnike (heširanje lozinki, login, CRUD)
- **PjesmaKontroler.py**: Poslovna logika za pjesme (CRUD)
- **AlbumKontroler.py**: CRUD za albume
- **PlaylistaKontroler.py**: CRUD za playliste
- **PratilacKorisnikKontroler.py**: Praćenje korisnika

### Baza podataka

- **MySQL** (Aiven Cloud)
- Konekcioni stringovi su u `.env` fajlu (`DATABASE_URL_ASYNC`, `DATABASE_URL_SYNC`)
- Migracije se rade Alembic-om (`alembic revision --autogenerate -m "opis"`)
- Svi modeli su pokriveni u `skripta.sql` i migracijama

### Firebase Storage

- Upload i download fajlova (audio, slike, gif) se radi REST API-jem
- Linkovi do fajlova se čuvaju u bazi i šalju frontendu/mobilnoj aplikaciji
- Upload funkcionalnost koristi `servisi/FirebaseStorage.py`

### Pokretanje i razvoj

1. Instaliraj zavisnosti:
   ```
   pip install -r requirements.txt
   ```
2. Pokreni backend:
   ```
   uvicorn main:app --reload
   ```
3. Pokreni migracije:
   ```
   alembic revision --autogenerate -m "opis"
   alembic upgrade head
   ```
4. Podesi `.env` fajl sa konekcionim stringovima i Firebase bucket-om

### Deploy (backend)

- Backend možeš deployovati na Deta Space, Koyeb, Railway, Render, Fly.io, Heroku, Google Cloud Run, itd.
- Preporučuje se korišćenje Alembic migracija za produkciju.

---

## 4. Frontend

### Tehnologije frontenda

- **React** (TypeScript)
- **Vite** – alat za razvoj i build
- **CSS Modules** – stilizacija
- **Axios** – HTTP zahtevi
- **React Router** – rutiranje

### Struktura direktorijuma (frontend)

```
frontend/
│
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   ├── pjesma.types.ts
│   │   ├── album.types.ts
│   │   ├── playlista.types.ts
│   │   ├── korisnik.types.ts
│   │   └── index.ts
│   ├── stranice/
│   │   └── Home/
│   │       ├── Home.tsx
│   │       └── Home.module.css
│   └── komponente/
│       ├── Header/
│       │   ├── Header.tsx
│       │   └── Header.module.css
│       ├── Footer/
│       │   ├── Footer.tsx
│       │   └── Footer.module.css
│       └── AudioPlayer/
│           ├── AudioPlayer.tsx
│           └── AudioPlayer.module.css
└── ...
```

### Prikaz podataka

- Prikaz liste pjesama, albuma, plejlista i korisnika sa slikom, nazivom, opisom i play dugmetom (Spotify stil)
- Responsive dizajn (desktop i mobilni prikaz)
- Prikaz podataka iz API-ja (`.env` koristi VITE_API_BASE_URL)

### Audio player

- Fiksiran na dnu ekrana, u bojama brenda (roze-ljubičasta)
- Prikazuje naziv pjesme i kontrole (play/pause, progress)
- Kontroliše se klikom na play dugme na kartici pjesme

### Deploy (frontend)

- Frontend možeš deployovati na Vercel, Netlify, ili slične servise.
- Podesi promenljive okruženja (`.env`) za produkciju.

---

## 5. Mobilna aplikacija

### Tehnologije mobilne aplikacije

- **Android** (Kotlin)
- **MVVM** arhitektura
- **Jetpack ViewModel, LiveData**
- **Retrofit** za REST API
- **Room** za lokalnu bazu (opciono)
- **Hilt** za dependency injection
- **Coroutines** za asinhroni kod
- **Glide** za slike

### Struktura direktorijuma (mobilna)

```
mobilnaAPP/
│
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/mobilnaapp/
│   │   │   │   ├── data/
│   │   │   │   │   ├── model/
│   │   │   │   │   └── remote/
│   │   │   │   ├── domain/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── home/
│   │   │   │   │   └── player/
│   │   │   │   ├── viewmodel/
│   │   │   │   └── util/
│   │   │   └── res/
│   │   └── test/
│   └── build.gradle.kts
└── ...
```

### MVVM i slojevi

- **data/** – modeli, API servisi, repozitorijumi
- **domain/** – use-case, poslovna logika
- **ui/** – fragmenti, adapteri, custom view (AudioPlayerBar)
- **viewmodel/** – ViewModel klase
- **util/** – pomoćne klase

### Audio player (mobilna)

- Fiksiran na dnu ekrana (`AudioPlayerBar`)
- Prikazuje naziv pjesme i play/pause dugme
- Kontroliše se klikom na pjesmu u listi
- Koristi `MediaPlayer` za puštanje muzike

---

## 6. Dodatno

- CORS je omogućen za frontend-backend komunikaciju.
- Svi poverljivi podaci (konekcioni stringovi, API ključevi) su u `.env` fajlu.
- Za produkciju ograniči CORS i pravila Firebase Storage-a.
- Baza i svi modeli su pokriveni migracijama i SQL skriptom.
- Svi tipovi za frontend su u `src/types`.

---

## 7. Reference

- [FastAPI dokumentacija](https://fastapi.tiangolo.com/)
- [SQLAlchemy dokumentacija](https://docs.sqlalchemy.org/)
- [Alembic dokumentacija](https://alembic.sqlalchemy.org/)
- [Firebase Storage REST API](https://firebase.google.com/docs/storage)
- [React dokumentacija](https://react.dev/)
- [Vite dokumentacija](https://vitejs.dev/)
- [Android dokumentacija](https://developer.android.com/)
- [Kotlin dokumentacija](https://kotlinlang.org/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)

---

*Ova dokumentacija je osnova i biće proširivana tokom razvoja projekta.*
