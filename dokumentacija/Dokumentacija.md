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
   - [Sigurnost i autentikacija](#sigurnost-i-autentikacija)
   - [Testiranje](#testiranje-backenda)
   - [Primjeri API poziva](#primjeri-api-poziva)
4. [Frontend](#frontend)
   - [Tehnologije](#tehnologije-frontenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-frontend)
   - [Prikaz podataka](#prikaz-podataka)
   - [Audio player](#audio-player)
   - [Deploy](#deploy-frontend)
   - [Testiranje](#testiranje-frontenda)
   - [Primjeri UI/UX](#primjeri-ui-ux)
5. [Mobilna aplikacija](#mobilna-aplikacija)
   - [Tehnologije](#tehnologije-mobilne-aplikacije)
   - [Struktura direktorijuma](#struktura-direktorijuma-mobilna)
   - [MVVM i slojevi](#mvvm-i-slojevi)
   - [Audio player](#audio-player-mobilna)
   - [Testiranje](#testiranje-mobilne-aplikacije)
   - [Distribucija APK](#distribucija-apk)
6. [Dodatno](#dodatno)
   - [CORS i sigurnost](#cors-i-sigurnost)
   - [Okruženja i konfiguracija](#okruzenja-i-konfiguracija)
   - [CI/CD](#ci-cd)
   - [Monitoring i logovanje](#monitoring-i-logovanje)
   - [SEO i PWA](#seo-i-pwa)
7. [Reference](#reference)

---

## 1. Uvod

Decibel je moderna muzička platforma (web + mobilna aplikacija) za upravljanje, prikaz i slušanje pjesama, albuma, plejlista i korisnika. Projekat je razvijen kao diplomski rad i koristi moderne tehnologije za backend, frontend i mobilni deo. Platforma omogućava korisnicima da otkrivaju novu muziku, prate izvođače, kreiraju i uređuju playliste, komentarišu pjesme, prate statistiku slušanja i još mnogo toga.

---

## 2. Arhitektura

Aplikacija je podeljena na tri glavna dela:
- **Backend**: FastAPI (Python), MySQL (Aiven Cloud), Firebase Storage
- **Frontend**: React (TypeScript), Vite
- **Mobilna aplikacija**: Android (Kotlin, MVVM)

Komunikacija između frontenda/mobilne aplikacije i backenda se odvija putem REST API-ja. Svi servisi su nezavisni i mogu se deployovati odvojeno.

---

## 3. Backend

### Tehnologije backenda

- **FastAPI** – web framework za Python, brz i tipiziran
- **SQLAlchemy** – ORM za rad sa bazom
- **databases** – async rad sa bazom
- **aiomysql** – async MySQL drajver
- **Alembic** – migracije baze
- **python-dotenv** – rad sa .env fajlovima
- **passlib** – heširanje lozinki
- **requests** – HTTP zahtevi (za Firebase Storage)
- **firebase-admin** (opciono) – rad sa Firebase servisima
- **Uvicorn** – ASGI server za FastAPI

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

- **KorisnikORM**: Model korisnika (UUID, ime, prezime, korisničko ime, email, lozinka, rola, status, profilna slika, broj pratilaca, bio, datum registracije, obrisan)
- **AlbumORM**: Model albuma (ID, korisnikID, naziv, opis, slike, gif, javnost, broj lajkova, odobrenje)
- **PjesmaORM**: Model pjesme (ID, korisnikID, albumID, naziv, opis, datum objave, trajanje, putanje do fajlova, zanr, broj lajkova, broj reprodukcija, eksplicitnost, jezik, licenca, odobreno)
- **PlaylistaORM**: Model playliste (ID, korisnikID, naziv, opis, slike, gif, javnost, broj lajkova)
- **KomentarORM**: Komentari na pjesme (ID, korisnikID, pjesmaID, tekst, vrijeme pjesme, datum)
- **IzvodjacPjesmaORM**: Veza pjesma-izvođač (potvrdjeno, udio)
- **PjesmaPlaylistaORM**: Veza pjesma-playlista (redoslijed, pokazivači na prethodnu/sljedeću pjesmu)
- **KorisnikPlaylistaORM**: Veza korisnik-playlista (prati)
- **KorisnikPjesmaORM**: Veza korisnik-pjesma (omiljene)
- **KorisnikAlbumORM**: Veza korisnik-album (omiljeni)
- **PratilacKorisnikORM**: Veza korisnik-pratilac
- **RedoslijedPjesamaORM**: Redoslijed pjesama u playlisti
- **StatistikaReprodukcijeORM**: Statistika slušanja pjesama (broj reprodukcija, ukupno trajanje, zadnje puštanje)
- **HistorijaSlusanjaORM**: Historija slušanja korisnika (kontekst, offline, trajanje)
- **PretplataORM**: Model pretplate (naziv, opis, cijena, dostupnost)
- **KorisnikPretplataORM**: Veza korisnik-pretplata (status, datumi)
- **ObnovaPretplateORM**: Evidencija obnova pretplate

### Rute

- `/api/korisnici/` – CRUD operacije nad korisnicima (registracija, login, izmena, brisanje, dohvatanje, promena slike)
- `/api/pjesme/` – CRUD operacije nad pjesmama (kreiranje, izmena, brisanje, dohvatanje)
- `/api/albumi/` – CRUD operacije nad albumima
- `/api/playliste/` – CRUD operacije nad playlistama
- `/api/pratioci/` – praćenje korisnika
- `/api/izvodjac_pjesma/` – izvođači za pjesmu
- `/api/pjesma_playlista/` – pjesme u playlisti (redoslijed)
- `/api/komentari/` – komentari na pjesme
- `/api/statistika_reprodukcije/` – statistika slušanja
- `/api/historija_slusanja/` – historija slušanja korisnika
- `/api/pretplate/` – ponude pretplata
- `/api/korisnik_pretplata/` – korisničke pretplate
- `/api/obnove_pretplate/` – obnove pretplate
- `/api/redoslijed_pjesama/` – redoslijed pjesama u playlisti
- ...i ostale rute za sve modele

### Kontroleri

- **KorisnikKontroler.py**: Poslovna logika za korisnike (heširanje lozinki, login, CRUD)
- **PjesmaKontroler.py**: Poslovna logika za pjesme (CRUD, odobravanje, filtriranje)
- **AlbumKontroler.py**: CRUD za albume
- **PlaylistaKontroler.py**: CRUD za playliste
- **PratilacKorisnikKontroler.py**: Praćenje korisnika
- **StatistikaReprodukcijeKontroler.py**: Statistika slušanja
- **HistorijaSlusanjaKontroler.py**: Historija slušanja korisnika

### Baza podataka

- **MySQL** (Aiven Cloud, može i lokalno)
- Konekcioni stringovi su u `.env` fajlu (`DATABASE_URL_ASYNC`, `DATABASE_URL_SYNC`)
- Migracije se rade Alembic-om (`alembic revision --autogenerate -m "opis"`)
- Svi modeli su pokriveni u `skripta.sql` i migracijama
- Složenije procedure za redoslijed pjesama u playlisti (SQL stored procedures)

### Firebase Storage

- Upload i download fajlova (audio, slike, gif) se radi REST API-jem
- Linkovi do fajlova se čuvaju u bazi i šalju frontendu/mobilnoj aplikaciji
- Upload funkcionalnost koristi `servisi/FirebaseStorage.py`
- Bucket može biti privatan ili javan (token u URL-u)

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
5. Testiraj API na `http://localhost:8000/docs`

### Deploy (backend)

- Backend možeš deployovati na Deta Space, Koyeb, Railway, Render, Fly.io, Heroku, Google Cloud Run, itd.
- Preporučuje se korišćenje Alembic migracija za produkciju.
- Keep-alive thread za besplatne servise (sprečava gašenje instance).

### Sigurnost i autentikacija

- Lozinke se heširaju sa bcrypt (passlib).
- CORS je omogućen za frontend i mobilnu aplikaciju.
- Za produkciju koristi HTTPS i ograniči CORS.
- JWT autentikacija se može lako dodati (FastAPI ima podršku).

### Testiranje (backend)

- Testiraj API rute pomoću Postman-a ili Swagger UI (`/docs`).
- Piši unit testove za kontrolere i modele.
- Testiraj upload fajlova i integraciju sa Firebase Storage-om.

### Primjeri API poziva

- **Registracija korisnika**:
  ```http
  POST /api/korisnici/register
  {
    "ime": "Ajdin",
    "prezime": "Test",
    "korisnicko_ime": "ajdin123",
    "email": "ajdin@example.com",
    "lozinka": "tajna123",
    "rola": "korisnik"
  }
  ```
- **Kreiraj pjesmu**:
  ```http
  POST /api/pjesme/
  Content-Type: multipart/form-data
  (audio, slika, gif, naziv, opis, ...)
  ```
- **Dohvati sve pjesme**:
  ```http
  GET /api/pjesme/
  ```

---

## 4. Frontend

### Tehnologije frontenda

- **React** (TypeScript)
- **Vite** – alat za razvoj i build
- **CSS Modules** – stilizacija
- **Axios** – HTTP zahtevi
- **React Router** – rutiranje
- **react-chartjs-2** i **chart.js** – grafovi za statistiku
- **Jest** i **React Testing Library** (opciono za testove)

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
│   │   ├── Home/
│   │   ├── Pjesma/
│   │   ├── Album/
│   │   ├── Playlista/
│   │   ├── SvePjesme/
│   │   ├── SviAlbumi/
│   │   ├── SvePlayliste/
│   │   ├── SviKorisnici/
│   │   ├── AdminPanel/
│   │   ├── Statistika/
│   │   ├── Pretplata/
│   │   ├── UrediProfil/
│   │   ├── Postavke/
│   │   ├── Login/
│   │   ├── Register/
│   │   └── ...
│   └── komponente/
│       ├── Header/
│       ├── Footer/
│       ├── Sidebar/
│       ├── AudioPlayer/
│       ├── Loading/
│       └── ...
└── ...
```

### Prikaz podataka

- Prikaz liste pjesama, albuma, plejlista i korisnika sa slikom, nazivom, opisom i play dugmetom (Spotify stil)
- Responsive dizajn (desktop i mobilni prikaz)
- Prikaz podataka iz API-ja (`.env` koristi VITE_API_BASE_URL)
- Detaljan prikaz pjesme, albuma, playliste sa svim metapodacima i akcijama (lajk, play, repeat, dodavanje u playlistu, komentari, izvođači, preporučene pjesme)
- Admin panel za upravljanje sadržajem i korisnicima

### Audio player

- Fiksiran na dnu ekrana, u bojama brenda (roze-ljubičasta)
- Prikazuje naziv pjesme, izvođača, sliku/gif i kontrole (play/pause, progress, repeat, brzina, mute)
- Minimizirani prikaz (mini player)
- Kontroliše se klikom na play dugme na kartici pjesme ili iz detalja pjesme/album/playliste
- Emituje custom eventove za promjenu pozadine i globalni play

### Deploy (frontend)

- Frontend možeš deployovati na Vercel, Netlify, ili slične servise.
- Podesi promenljive okruženja (`.env`) za produkciju.
- Build komanda: `npm run build`

### Testiranje (frontend)

- Testiraj UI ručno i automatski (Jest, React Testing Library)
- Testiraj integraciju sa backendom (mockuj API)
- Testiraj responsivnost na različitim uređajima

### Primjeri UI/UX

- Home stranica sa horizontalnim scrollom za pjesme, albume, plejlistu i izvođače
- Detaljna stranica pjesme sa izvođačima, play dugmetom, komentarima i preporukama
- Stranica albuma sa svim pjesmama, play all, repeat, lajk, dodavanje pjesme u playlistu
- Stranica playliste sa redoslijedom pjesama, play, repeat, lajk
- Statistika sa grafovima (top pjesme, albumi, plejlistu, izvođači, žanrovi)
- Admin panel za odobravanje pjesama/albuma, uređivanje korisnika

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
- **MediaPlayer** za audio

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
- Prikaz slike pjesme, napredak, repeat, mute, brzina

### Testiranje mobilne aplikacije

- Testiraj API integraciju (Retrofit, mock server)
- Testiraj UI sa Espresso
- Testiraj MediaPlayer i lifecycle
- Testiraj offline režim (ako koristiš Room)

### Distribucija APK

- Generiši APK: `./gradlew assembleDebug`
- Pošalji APK prijateljima (Google Drive, WeTransfer, direktno)
- Instalacija: dozvoli "Unknown sources" na Androidu
- Za iOS nije moguće bez TestFlight-a

---

## 6. Dodatno

### CORS i sigurnost

- CORS je omogućen za frontend-backend komunikaciju.
- Svi poverljivi podaci (konekcioni stringovi, API ključevi) su u `.env` fajlu.
- Za produkciju ograniči CORS i pravila Firebase Storage-a.
- Lozinke su heširane, nema plain-text lozinki.

### Okruženja i konfiguracija

- `.env` fajl za backend i frontend (različiti API base URL-ovi)
- Različiti Firebase bucket-ovi za razvoj i produkciju
- Promjenljive za keep-alive, debugging, logging

### CI/CD

- Preporučuje se korišćenje GitHub Actions za automatski build i deploy
- Automatsko testiranje i build za frontend i backend
- Deploy na Vercel/Netlify (frontend), Koyeb/Render (backend)

### Monitoring i logovanje

- Logovanje svih API poziva i grešaka (FastAPI logging)
- Monitoring performansi (opciono: Sentry, Datadog)
- Praćenje broja korisnika, pjesama, albuma, plejlista

### SEO i PWA

- Frontend je optimizovan za SEO (React Helmet, meta tagovi)
- Može se proširiti u PWA (Progressive Web App) za offline podršku

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
- [Chart.js](https://www.chartjs.org/)
- [Jest](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/)

---

*Ova dokumentacija je osnova i biće proširivana tokom razvoja projekta. Za sva pitanja i dopune, kontaktiraj autora ili pogledaj GitHub repozitorijum.*
