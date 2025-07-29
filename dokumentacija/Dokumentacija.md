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
   - [Napredne funkcionalnosti](#napredne-funkcionalnosti)
   - [Noviteti 2025](#noviteti-2025)
4. [Frontend](#frontend)
   - [Tehnologije](#tehnologije-frontenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-frontend)
   - [Prikaz podataka](#prikaz-podataka)
   - [Audio player](#audio-player)
   - [Deploy](#deploy-frontend)
   - [Testiranje](#testiranje-frontenda)
   - [Primjeri UI/UX](#primjeri-ui-ux)
   - [Napredne funkcionalnosti](#napredne-funkcionalnosti-frontend)
   - [Noviteti 2025](#noviteti-2025-frontend)
5. [Mobilna aplikacija](#mobilna-aplikacija)
   - [Tehnologije](#tehnologije-mobilne-aplikacije)
   - [Struktura direktorijuma](#struktura-direktorijuma-mobilna)
   - [React Native komponente](#react-native-komponente)
   - [Audio player](#audio-player-mobilna)
   - [Testiranje](#testiranje-mobilne-aplikacije)
   - [Distribucija APK](#distribucija-apk)
   - [Noviteti 2025](#noviteti-2025-mobilna)
6. [Dodatno](#dodatno)
   - [CORS i sigurnost](#cors-i-sigurnost)
   - [Okruženja i konfiguracija](#okruzenja-i-konfiguracija)
   - [CI/CD](#ci-cd)
   - [Monitoring i logovanje](#monitoring-i-logovanje)
   - [SEO i PWA](#seo-i-pwa)
   - [Pravila i migracije baze](#pravila-i-migracije-baze)
   - [Pravila za komentare, historiju i pretplate](#pravila-za-komentare-historiju-i-pretplate)
   - [Automatizacija i AI](#automatizacija-i-ai)
7. [Reference](#reference)

---

## 1. Uvod

Decibel je moderna muzička platforma (web + mobilna aplikacija) za upravljanje, prikaz i slušanje pjesama, albuma, plejlista i korisnika. Projekat je razvijen kao diplomski rad i koristi moderne tehnologije za backend, frontend i mobilnu aplikaciju (React Native). Platforma omogućava korisnicima da otkrivaju novu muziku, prate izvođače, kreiraju i uređuju playliste, komentarišu pjesme, prate statistiku slušanja, koriste napredni audio player i još mnogo toga.

**Najnovije implementirane funkcionalnosti (2024):**

- **Offline režim** za mobilnu aplikaciju (preuzimanje pjesama, offline slušanje)
- **Napredna pretraga** (multi-field, fuzzy, autocomplete, real-time search)
- **Historija slušanja** sa jedinstvenim constraintima i automatskim ažuriranjem
- **Napredni filteri** i sortiranje na svim listama (po datumu, lajkovima, trajanju, žanru)
- **Paginacija i lazy loading** za velike liste (infinite scroll, server-side paginacija)
- **Notifikacije** (push i email) za važne događaje (komentari, lajkovi, nove pjesme)
- **Suspendovanje korisnika** sa porukom i trajanjem, automatsko reaktiviranje
- **Prijava za izvođača** sa automatskim odobravanjem i admin panelom
- **Statistika platforme** sa grafovima, top listama i embed objektima
- **Automatska obnova pretplate** sa validacijom i evidencijom obnova
- **Napredni audio player** (web & mobilni): repeat, shuffle, brza promjena, volume, progress bar, mini-player, background play
- **Komentari sa uređivanjem** i privilegijama vlasnika/admina
- **Globalni state management** (AudioContext, React Query)
- **Centralizovana konfiguracija i environment-based setup**
- **CI/CD pipeline** sa automatskim buildom i deployem
- **AI preporuke** za pjesme i albume (eksperimentalno)
- **Podrška za više jezika** (BS, EN, DE)
- **Dark/light tema** (web & mobilni)
- **QR kodovi** za dijeljenje pjesama i plejlista
- **Firebase Storage** za slike, audio i gif fajlove
- **Automatski backup baze** i logova

---

## 2. Arhitektura

Aplikacija je podijeljena na tri glavna dijela:
- **Backend**: FastAPI (Python), MySQL (Aiven Cloud), Firebase Storage
- **Frontend**: React (TypeScript), Vite, CSS Modules
- **Mobilna aplikacija**: React Native (Expo), TypeScript, Expo Audio

Komunikacija između frontenda/mobilne aplikacije i backenda se odvija putem REST API-ja. Svi servisi su nezavisni i mogu se deployovati odvojeno.

**Novi pristup arhitekturi:**
- **Environment-based konfiguracija**: Svi URL-ovi i konfiguracija se čuvaju u .env fajlovima
- **Centralizovani API klijenti**: Pojednostavljen i tipiziran pristup API pozivima
- **Globalni state management**: AudioContext za mobilnu aplikaciju i React Query za server state
- **Unified error handling**: Konzistentno rukovanje greškama kroz sve slojeve
- **Automatsko testiranje i deploy** (CI/CD)

---

## 3. Backend

### Tehnologije backenda

- **FastAPI** – web framework za Python, brz i tipiziran
- **SQLAlchemy** – ORM za rad sa bazom (sa async podrškom)
- **databases** – async rad sa bazom
- **aiomysql** – async MySQL drajver
- **Alembic** – migracije baze
- **python-dotenv** – rad sa .env fajlovima
- **passlib** – heširanje lozinki
- **firebase-admin** – rad sa Firebase servisima
- **Uvicorn** – ASGI server za FastAPI
- **python-multipart** – za file upload podršku
- **pytest** – testiranje

### Struktura direktorijuma (backend)

```plaintext
backend/
│
├── main.py
├── requirements.txt
├── .env
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
│   ├── PrijavaIzvodjaca.py
│   ├── SuspendovaniKorisnik.py
│   └── __init__.py
├── kontroleri/
│   ├── KorisnikKontroler.py
│   ├── PjesmaKontroler.py
│   ├── AlbumKontroler.py
│   ├── PlaylistaKontroler.py
│   ├── PratilacKorisnikKontroler.py
│   ├── KomentarKontroler.py
│   ├── StatistikaReprodukcijeKontroler.py
│   ├── HistorijaSlusanjaKontroler.py
│   ├── KorisnikPretplataKontroler.py
│   ├── PrijavaIzvodjacaKontroler.py
│   └── __init__.py
├── rute/
│   ├── KorisnikRuta.py
│   ├── PjesmaRuta.py
│   ├── AlbumRuta.py
│   ├── PlaylistaRuta.py
│   ├── PratilacKorisnikRuta.py
│   ├── KomentarRuta.py
│   ├── StatistikaReprodukcijeRuta.py
│   ├── HistorijaSlusanjaRuta.py
│   ├── PretplataRuta.py
│   ├── KorisnikPretplataRuta.py
│   ├── ObnovaPretplateRuta.py
│   ├── PrijavaIzvodjacaRuta.py
│   └── __init__.py
├── servisi/
│   ├── Baza.py
│   ├── FirebaseStorage.py
│   ├── PlaylistaRedoslijed.py
│   └── __init__.py
└── ...
```

### Modeli

- **KorisnikORM**: Model korisnika sa podrškom za suspendovanje (statusKorisnika: aktivan/suspendovan/neaktivan), rola (korisnik/izvođač/admin), profilna slika, email, bio.
- **PjesmaORM**: Model pjesme sa embed korisnik objektom, podrška za više izvođača (veza), slike, gif, audio, žanr, jezik, licenca, eksplicitni sadržaj, odobrenje od admina.
- **AlbumORM**: Model albuma sa embed korisnik objektom, slike, gif, javnost, broj lajkova, status.
- **PlaylistaORM**: Model playliste sa embed korisnik objektom, slike, gif, javnost, redoslijed pjesama.
- **KomentarORM**: Komentari sa uređivanjem, embed korisnik objektom, privilegijama vlasnika/admina.
- **IzvodjacPjesmaORM**: Veza između pjesama i izvođača (više izvođača po pjesmi, potvrda vlasnika).
- **KorisnikPretplataORM**: Model pretplate sa automatskim upravljanjem obnove, datumi, status, embed pretplata.
- **ObnovaPretplateORM**: Evidencija obnova sa iznosom i datumom.
- **SuspendovaniKorisnikORM**: Model suspendovanja (korisnikID, poruka, vrijemeDo).
- **PrijavaIzvodjacaORM**: Model prijava za izvođače (UUID, korisnikID, poruka, datum).
- **StatistikaReprodukcijeORM**: Model statistike sa embed pjesma objektom.
- **HistorijaSlusanjaORM**: Model historije sa jedinstvenim constraintima po korisniku i pjesmi, automatsko brisanje duplikata.
- **RedoslijedPjesamaORM**: Redoslijed pjesama u playlisti.

**Noviteti 2024:**
- **Offline podrška** (lokalno čuvanje pjesama za slušanje bez interneta)
- **Notifikacije** (push/email)
- **QR kodovi** za dijeljenje
- **AI preporuke** (eksperimentalno, integracija sa vanjskim AI servisom)
- **Napredna statistika** (embed objekti, grafovi, top 10, paginacija)
- **Automatska obnova pretplate** (sa validacijom i evidencijom)

### Rute

Sve rute su proširene sa boljim error handlingom, async podrškom i embed objektima:

- `/api/korisnici/` – CRUD, registracija, login, promjena slike, suspendovanje, embed profilna slika
- `/api/pjesme/` – CRUD sa multipart/form-data, više izvođača, embed korisnik, AI preporuke
- `/api/albumi/` – CRUD sa file upload, embed korisnik
- `/api/playliste/` – CRUD sa redoslijedom pjesama, embed korisnik
- `/api/prijave_izvodjaca/` – CRUD prijava izvođača, admin panel
- `/api/suspendovani/` – Upravljanje suspendovanim korisnicima
- `/api/korisnik_pretplata/` – Upravljanje pretplatama, automatska obnova, embed pretplata
- `/api/obnove_pretplate/` – Evidencija obnova pretplate
- `/api/komentari/` – CRUD komentara sa privilegijama vlasnika/admina, uređivanje
- `/api/statistika/` – Statistika sa embed objektima, top liste, grafovi
- `/api/historija/` – Historija slušanja sa unique constraintima, automatsko brisanje duplikata
- `/api/qr/` – Generisanje i validacija QR kodova za pjesme i playliste (novitet)

### Kontroleri

Svi kontroleri su poboljšani sa:
- **Async/await** podrška
- **Error handling** sa try-catch blokovima
- **Type safety** sa Pydantic modelima
- **Relationship loading** sa selectinload/joinedload
- **Unique constraint** validacija
- **File upload** podrška (audio, slike, gif)
- **Embed objekti** za frontend/mobilnu
- **Automatska obnova pretplate** (validacija i evidencija)
- **Offline podrška** (API endpointi za preuzimanje pjesama)
- **QR kod generacija** (za dijeljenje pjesama/playlisti)

### Baza podataka

- **MySQL** sa async podrškom (Aiven Cloud)
- **Unique constrainti** na historiji slušanja i pretplatama
- **Foreign key** relationshipi između svih modela
- **Indexi** za performanse
- **Migracije** kroz Alembic sa --autogenerate
- **Backup i restore procedure**
- **Automatski backup** (cron job)

### Firebase Storage

- **REST API** upload i download (audio, slike, gif)
- **Temporary files** sa automatskim clean-up
- **Multiple file types** (audio, slike, gif)
- **Error handling** sa retry logikom
- **Secure URLs** sa tokenima
- **Offline download** endpointi

### Pokretanje i razvoj

1. **Instaliraj zavisnosti**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Pokreni backend**:
   ```bash
   uvicorn main:app --reload
   ```

3. **Pokreni migracije**:
   ```bash
   alembic revision --autogenerate -m "opis_promjene"
   alembic upgrade head
   ```

4. **Podesi .env fajl**:
   ```
   DATABASE_URL_ASYNC=mysql+aiomysql://user:pass@host/db
   DATABASE_URL_SYNC=mysql+pymysql://user:pass@host/db
   FIREBASE_BUCKET_NAME=your-bucket-name
   ```

5. **Testiraj API**:
   ```
   http://localhost:8000/docs
   ```

### Deploy (backend)

- **Koyeb** deployment sa Spacefile
- **Keep-alive** thread za sprečavanje spavanja
- **Environment variables** za produkciju
- **Alembic migrations** za bazu
- **CORS** konfiguracija za frontend/mobilnu
- **Health check** endpoint
- **Automatski backup** (cron job, cloud storage)

### Sigurnost i autentikacija

- **bcrypt** heširanje lozinki
- **CORS** ograničenja
- **SQL injection** zaštita sa SQLAlchemy
- **File upload** validacija (tip, veličina)
- **Rate limiting** (opciono)
- **HTTPS** za produkciju
- **JWT autentikacija** (eksperimentalno)

### Testiranje (backend)

- **Swagger UI** za API testiranje
- **Postman** kolekcije
- **Unit tests** za kontrolere (pytest)
- **Integration tests** za API endpoints
- **Load testing** za performanse

### Primjeri API poziva

```http
POST /api/korisnici/register
Content-Type: application/json
{
  "ime": "Marko",
  "prezime": "Petrović",
  "korisnicko_ime": "marko123",
  "email": "marko@example.com",
  "lozinka": "sigurna123",
  "rola": "korisnik"
}

POST /api/pjesme/
Content-Type: multipart/form-data
naziv=Moja Pjesma
opis=Opis pjesme
zanr=Pop
file_audio=audio.mp3
file_slika=slika.jpg

GET /api/statistika/top-songs
Response: [
  {
    "pjesma": { "id": 1, "naziv": "Hit", "korisnik": {...} },
    "brojReprodukcija": 1500
  }
]
```

### Napredne funkcionalnosti

- **Automatska obnova pretplate** sa validacijom i evidencijom
- **Suspendovanje korisnika** sa porukom i vremenom
- **Statistika sa embed objektima** za frontend
- **Unique constrainti** sa proper error handling
- **File upload** sa temporary files
- **Async database operations** za performanse
- **Relationship loading** za optimizaciju
- **Offline režim** (preuzimanje pjesama)
- **QR kodovi** za dijeljenje pjesama/playlisti
- **AI preporuke** (eksperimentalno)

### Noviteti 2025

- **Offline režim**: Endpointi za preuzimanje pjesama, offline tokeni, automatsko brisanje starih fajlova
- **Napredna pretraga**: Fuzzy search, autocomplete, multi-field search
- **Push/email notifikacije**: Integracija sa Firebase Cloud Messaging i SMTP serverom
- **QR kodovi**: Generisanje, validacija, dijeljenje linkova za pjesme/plejliste
- **AI preporuke**: Preporučivanje pjesama i albuma na osnovu historije slušanja (integracija sa AI servisom)
- **Paginacija i lazy loading**: Na svim endpointima sa velikim listama
- **Jedinstvena historija slušanja**: Unique constraint po korisniku i pjesmi, automatsko brisanje duplikata
- **Admin panel**: Endpointi za upravljanje korisnicima, prijavama, suspendovanjem, statistikama
- **Embed objekti**: Svuda gdje je potrebno za frontend/mobilnu (npr. korisnik u pjesmi, albumu, playlisti)
- **Automatski backup baze i logova**: Cron job, cloud storage

---

## 4. Frontend

### Tehnologije frontenda

- **React 18** sa TypeScript
- **Vite** – build tool i dev server
- **CSS Modules** – scoped styling
- **Axios** – HTTP klijent
- **React Router** – SPA routing
- **react-chartjs-2** – grafovi za statistiku
- **React Hook Form** – form handling
- **React Query** – server state management
- **i18next** – internacionalizacija
- **Jest/Cypress** – testiranje

### Struktura direktorijuma (frontend)

```plaintext
frontend/
│
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── types/
│   ├── stranice/
│   ├── komponente/
│   ├── locales/
│   └── ...
├── public/
├── .env
├── package.json
└── ...
```

### Prikaz podataka

- **Spotify-style** kartice za pjesme, albume, playliste
- **Hover effects** sa play dugmetom
- **Responsive grid** layout
- **Infinite scroll** za velike liste
- **Loading states** sa skeletons
- **Error boundaries** za error handling
- **Dynamic backgrounds** bazirane na trenutnoj pjesmi
- **Napredni filteri i sortiranje** (po datumu, lajkovima, žanru, trajanju)
- **Paginacija** (server-side i client-side)

### Audio player

**Desktop verzija:**
- **Fiksiran na dnu** sa gradient pozadinom
- **Kontrole**: play/pause, progress, repeat, shuffle, brzina, volume
- **Metapodaci**: slika, naziv, izvođač, vrijeme
- **Akcije**: lajk, dodaj u playlistu, komentari
- **Minimizacija** u floating button
- **Background play** (PWA)
- **Offline support** (PWA cache)

### Deploy (frontend)

- **Vercel** deployment sa automatskim build-om
- **Environment variables** za API URL
- **Static site generation** za SEO
- **CDN** za brže učitavanje
- **Custom domain** podrška

### Testiranje (frontend)

- **Jest** za unit tests
- **React Testing Library** za component tests
- **Cypress** za E2E tests
- **Storybook** za component dokumentaciju
- **Visual regression** testing

### Primjeri UI/UX

- **Home stranica**: Hero sekcija, horizontalni scroll, shuffle, play all
- **Detalj pjesme**: Veliki cover art, izvođači, komentari, preporučene pjesme, statistika
- **Audio player**: Smooth animacije, progress bar, volume, repeat, shuffle, speed control

### Napredne funkcionalnosti (frontend)

- **Dynamic backgrounds**: Automatska promjena pozadine bazirane na trenutnoj pjesmi
- **Suspendovan/obrisan screen**: Specijalni UI za suspendovane/obrisane korisnike
- **Audio player upgrades**: Progress seeking, volume slider, speed control, mini-player
- **Internationalization**: Podrška za više jezika (BS, EN, DE)
- **Responsive design**: Optimizovano za desktop i mobilne uređaje
- **Error handling**: Graceful degradation i user-friendly error messages
- **Performance optimizations**: Lazy loading, code splitting, memoization
- **Offline podrška**: PWA cache za pjesme i slike
- **QR kodovi**: Dijeljenje pjesama/playlisti
- **Push notifikacije**: Web push za komentare, lajkove, nove pjesme

### Noviteti 2025 (frontend)

- **Offline režim**: PWA cache za pjesme, slike, osnovne podatke
- **Napredna pretraga**: Fuzzy, autocomplete, multi-field
- **Notifikacije**: Web push integracija
- **QR kodovi**: Generisanje i skeniranje
- **AI preporuke**: Prikaz na home stranici i detaljima pjesme/albumu
- **Napredna statistika**: Grafovi, embed objekti, top liste
- **Admin panel**: Upravljanje korisnicima, prijavama, suspendovanjem, statistikama
- **Dark/light tema**: Automatsko prepoznavanje iz OS-a, ručno biranje
- **Jedinstvena historija slušanja**: UI za prikaz, brisanje, filtriranje

---

## 5. Mobilna aplikacija

### Tehnologije mobilne aplikacije

- **React Native** sa Expo SDK
- **TypeScript** za type safety
- **Expo Audio** za native audio playback
- **Expo Image** za optimizovane slike
- **React Navigation** za navigaciju
- **Async Storage** za lokalno čuvanje
- **React Native Slider** za kontrole
- **Axios** za HTTP zahteve
- **React Native Vector Icons** za ikone
- **React Query** za server state

### Struktura direktorijuma (mobilna)

```plaintext
mobilnaAPP/
│
├── app/
├── components/
├── screens/
├── context/
├── config/
├── types/
├── .env
├── app.config.js
├── package.json
└── ...
```

### React Native komponente

- **AudioPlayer**: Three-row layout, native audio, progress/volume slider, repeat, shuffle, mini-player, background play
- **Header**: Responsive, profilna, search bar, logout
- **Home**: Horizontal lists, pull-to-refresh, skeleton loader, error handling
- **Biblioteka**: Filteri (pratim, pjesme, albumi, playliste), lazy loading, paginacija, offline prikaz
- **Omiljeno**: Lajkovane pjesme/albumi/plejliste, dodavanje/uklanjanje, dodaj u playlistu
- **Detalji**: Pjesma, album, playlista, izvođač – embed objekti, komentari, statistika
- **Offline**: Lista preuzetih pjesama, brisanje, puštanje bez interneta

### Audio player (mobilna)

- **Native audio playback** sa Expo Audio
- **Streaming support** za Firebase URLs
- **Progress seeking** sa real-time update
- **Volume control** sa slider
- **Playback speed** sa buttons
- **Repeat/shuffle modes**
- **Minimized state** sa floating button
- **Error recovery** sa retry logikom
- **Offline play**: Preuzete pjesme dostupne bez interneta

### Testiranje mobilne aplikacije

- **Expo Go** za development
- **Physical devices** za real-world testing
- **Audio playback** testing sa različitim formatima
- **Network conditions** testing (slow/fast/offline)
- **Battery usage** optimization testing

### Distribucija APK

- **Expo Go** za development
- **TestFlight** za iOS beta testing
- **APK sharing** za Android testing
- **EAS Build** za produkciju
- **Over-the-air updates** sa Expo Updates

### Noviteti 2025 (mobilna)

- **Offline režim**: Preuzimanje pjesama, lokalno čuvanje, offline play
- **Napredna pretraga**: Real-time, fuzzy, multi-field
- **Push notifikacije**: Integracija sa FCM
- **QR kodovi**: Skeniranje i dijeljenje
- **AI preporuke**: Prikaz na home i detaljima
- **Dark/light tema**: Automatsko prepoznavanje i ručno biranje
- **Jedinstvena historija slušanja**: UI za prikaz, brisanje, filtriranje
- **Napredna statistika**: Grafovi, top liste, embed objekti
- **Admin panel**: Osnovne admin funkcije za mobilnu (suspendovanje, prijave, statistika)
- **Automatska sinhronizacija**: Kada se korisnik ponovo poveže na internet

---

## 6. Dodatno

### CORS i sigurnost

- **CORS configuration** za frontend i mobilnu
- **Environment variables** za sve sensitive podatke
- **API key management** za Firebase
- **Rate limiting** za API endpoints
- **Input validation** na frontendu i backendu
- **SQL injection** prevention sa SQLAlchemy
- **JWT autentikacija** (eksperimentalno)

### Okruženja i konfiguracija

- **Backend (.env)**: DB, Firebase, API keys
- **Frontend (.env)**: API URL, feature toggles
- **Mobilna (.env)**: API URL, feature toggles

### CI/CD

- **GitHub Actions** za automatski build i testiranje
- **Vercel** za frontend deployment
- **Koyeb** za backend deployment
- **Expo EAS** za mobilnu aplikaciju
- **Automated testing** na svakom commit-u

### Monitoring i logovanje

- **FastAPI logging** za backend
- **Console logging** za frontend/mobilnu
- **Error tracking** sa Sentry (opciono)
- **Performance monitoring** sa Web Vitals
- **Usage analytics** sa Google Analytics

### SEO i PWA

- **React Helmet** za meta tags
- **Sitemap generation** za SEO
- **PWA manifest** za desktop install
- **Service worker** za offline podršku
- **Lighthouse** optimizacija

### Pravila i migracije baze

- **Alembic migrations** za sve promjene
- **Unique constraints** sa proper error handling
- **Foreign key relationships** između svih modela
- **Index optimization** za performanse
- **Backup procedures** za podatke

### Pravila za komentare, historiju i pretplate

- **Komentari**: Vlasnikov komentar uvijek na vrhu, uređivanje samo vlasniku, brisanje vlasniku/adminu, real-time update
- **Historija**: Jedinstven par korisnik+pjesma, najnovije prvo, automatsko brisanje duplikata, paginacija
- **Pretplate**: Jedna aktivna pretplata po korisniku, automatska obnova, status tracking, evidencija obnova

### Automatizacija i AI

- **AI preporuke**: Eksperimentalna integracija sa AI servisom za preporuku pjesama/albumima
- **Automatski backup**: Cron job za backup baze i logova
- **Automatsko testiranje**: CI/CD pipeline
- **Automatsko čišćenje starih fajlova**: Offline storage, Firebase

---

## 7. Reference

### Dokumentacija i resursi

- [FastAPI dokumentacija](https://fastapi.tiangolo.com/)
- [SQLAlchemy dokumentacija](https://docs.sqlalchemy.org/)
- [React dokumentacija](https://react.dev/)
- [React Native dokumentacija](https://reactnative.dev/)
- [Expo dokumentacija](https://docs.expo.dev/)
- [TypeScript dokumentacija](https://www.typescriptlang.org/)
- [Vite dokumentacija](https://vitejs.dev/)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Vercel](https://vercel.com/)
- [Koyeb](https://www.koyeb.com/)
- [Expo Application Services](https://expo.dev/eas)
- [Chart.js](https://www.chartjs.org/)
- [React Hook Form](https://react-hook-form.com/)
- [React Query](https://tanstack.com/query)
- [Jest](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/)
- [Cypress](https://www.cypress.io/)

---


