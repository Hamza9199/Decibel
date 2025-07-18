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
4. [Frontend](#frontend)
   - [Tehnologije](#tehnologije-frontenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-frontend)
   - [Prikaz podataka](#prikaz-podataka)
   - [Audio player](#audio-player)
   - [Deploy](#deploy-frontend)
   - [Testiranje](#testiranje-frontenda)
   - [Primjeri UI/UX](#primjeri-ui-ux)
   - [Napredne funkcionalnosti](#napredne-funkcionalnosti-frontend)
5. [Mobilna aplikacija](#mobilna-aplikacija)
   - [Tehnologije](#tehnologije-mobilne-aplikacije)
   - [Struktura direktorijuma](#struktura-direktorijuma-mobilna)
   - [React Native komponente](#react-native-komponente)
   - [Audio player](#audio-player-mobilna)
   - [Testiranje](#testiranje-mobilne-aplikacije)
   - [Distribucija APK](#distribucija-apk)
6. [Dodatno](#dodatno)
   - [CORS i sigurnost](#cors-i-sigurnost)
   - [Okruženja i konfiguracija](#okruzenja-i-konfiguracija)
   - [CI/CD](#ci-cd)
   - [Monitoring i logovanje](#monitoring-i-logovanje)
   - [SEO i PWA](#seo-i-pwa)
   - [Pravila i migracije baze](#pravila-i-migracije-baze)
   - [Pravila za komentare, historiju i pretplate](#pravila-za-komentare-historiju-i-pretplate)
7. [Reference](#reference)

---

## 1. Uvod

Decibel je moderna muzička platforma (web + mobilna aplikacija) za upravljanje, prikaz i slušanje pjesama, albuma, plejlista i korisnika. Projekat je razvijen kao diplomski rad i koristi moderne tehnologije za backend, frontend i mobilnu aplikaciju (React Native). Platforma omogućava korisnicima da otkrivaju novu muziku, prate izvođače, kreiraju i uređuju playliste, komentarišu pjesme, prate statistiku slušanja i još mnogo toga.

**Najnovije implementirane funkcionalnosti:**

### Backend funkcionalnosti:
- **Centralizovana API konfiguracija** sa environment varijablama
- **Poboljšana error handling** sa try-catch blokovima
- **Optimizovani kontroleri** za update operacije sa podmrškom za multipart/form-data
- **Prijave izvođača** sa CRUD operacijama
- **Suspendovanje korisnika** sa porukom i vremenom
- **Napredna statistika** sa top 10 listama i grafovima
- **Pretplate i obnova** sa automatskim upravljanjem

### Frontend funkcionalnosti:
- **Dinamičke pozadine** bazirane na trenutnoj pjesmi (GIF/slika)
- **Napredni audio player** sa progress bar-om, volume kontrolom i brzinom
- **Suspendovan/obrisan screen** za korisnike
- **Responzivni dizajn** za desktop i mobilni
- **Historija slušanja** sa akcijama (play, like, dodaj u playlistu)
- **Komentari** sa uređivanjem i privilegijama vlasnika
- **Statistika** sa grafovima i top listama
- **Pretplate** sa kupovinom i obnjavanjem

### Mobilna aplikacija (React Native):
- **Expo framework** za cross-platform razvoj
- **TypeScript** za type safety
- **Centralizovana API konfiguracija**
- **AudioContext** za globalno upravljanje audio stanjem
- **Napredni audio player** sa progress kontrolom, volume sliderom i brzinom
- **Expo Audio** za native audio playback
- **React Native slajderi** za progress i volume
- **Responzivni dizajn** sa mobile-first pristupom

---

## 2. Arhitektura

Aplikacija je podeljena na tri glavna dela:
- **Backend**: FastAPI (Python), MySQL (Aiven Cloud), Firebase Storage
- **Frontend**: React (TypeScript), Vite, CSS Modules
- **Mobilna aplikacija**: React Native (Expo), TypeScript, Expo Audio

Komunikacija između frontenda/mobilne aplikacije i backenda se odvija putem REST API-ja. Svi servisi su nezavisni i mogu se deployovati odvojeno.

**Novi pristup arhitekturi:**
- **Environment-based konfiguracija**: Svi URL-ovi i konfiguracija se čuvaju u .env fajlovima
- **Centralizovani API klijenti**: Pojednostavljeni pristup API pozivima
- **Globalni state management**: AudioContext za mobilnu aplikaciju
- **Unified error handling**: Konzistentno rukovanje greškama kroz sve slojeve

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
- **requests** – HTTP zahtevi (za Firebase Storage)
- **firebase-admin** (opciono) – rad sa Firebase servisima
- **Uvicorn** – ASGI server za FastAPI
- **python-multipart** – za file upload podršku

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

- **KorisnikORM**: Model korisnika sa podrška za suspendovanje (statusKorisnika: aktivan/suspendovan/neaktivan)
- **PrijavaIzvodjacaORM**: Model prijava za izvođače (UUID, korisnikID, poruka, datum)
- **SuspendovaniKorisnikORM**: Model suspendovanja (korisnikID, poruka, vrijemeDo)
- **PjesmaORM**: Poboljšan model sa embed korisnik objektom
- **KorisnikPretplataORM**: Model pretplate sa automatskim upravljanjem obnove
- **ObnovaPretplateORM**: Evidencija obnova sa iznosom i datumom
- **KomentarORM**: Model komentara sa mogućnošću uređivanja
- **StatistikaReprodukcijeORM**: Model statistike sa embed pjesma objektom
- **HistorijaSlusanjaORM**: Model historije sa jedinstvenim ograničenjima

### Rute

Sve rute su proširene sa boljim error handling-om i async podrškom:

- `/api/korisnici/` – CRUD operacije, registracija, login, promjena slike
- `/api/korisnici/slika/{korisnik_id}` – Upload profilne slike
- `/api/pjesme/` – CRUD sa multipart/form-data podrškom
- `/api/albumi/` – CRUD sa file upload podrškom
- `/api/playliste/` – CRUD sa redoslijedom pjesama
- `/api/prijave_izvodjaca/` – CRUD prijava izvođača
- `/api/suspendovani/` – Upravljanje suspendovanim korisnicima
- `/api/korisnik_pretplata/` – Upravljanje pretplatama sa automatskom obnově
- `/api/obnove_pretplate/` – Evidencija obnova pretplate
- `/api/komentari/` – CRUD komentara sa privilegijama vlasnika
- `/api/statistika/` – Statistika sa embed objektima
- `/api/historija/` – Historija slušanja sa unique constraint-ima

### Kontroleri

Svi kontroleri su poboljšani sa:
- **Async/await** podrška
- **Error handling** sa try-catch blokovima
- **Type safety** sa Pydantic modelima
- **Relationship loading** sa selectinload/joinedload
- **Unique constraint** validacija
- **File upload** podrška

### Baza podataka

- **MySQL** sa async podrškom
- **Unique constraint-i** na historiji slušanja i pretplatama
- **Foreign key** relationship-i između svih modela
- **Index-i** za performanse
- **Migracije** kroz Alembic sa --autogenerate
- **Backup i restore** proceduri

### Firebase Storage

- **REST API** upload i download
- **Temporary files** sa automatskim clean-up
- **Multiple file types** (audio, slike, gif)
- **Error handling** sa retry logikom
- **Secure URLs** sa token-ima

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

### Sigurnost i autentikacija

- **bcrypt** heširanje lozinki
- **CORS** ograničenja
- **SQL injection** zaštita sa SQLAlchemy
- **File upload** validacija
- **Rate limiting** (opciono)
- **HTTPS** za produkciju

### Testiranje (backend)

- **Swagger UI** za API testiranje
- **Postman** kolekcije
- **Unit tests** za kontrolere
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

- **Automatska obnova pretplate** sa validacijom
- **Suspendovanje korisnika** sa porukom i vremenom
- **Statistika sa embed objektima** za frontend
- **Unique constraint-i** sa error handling
- **File upload** sa temporary files
- **Async database operations** za performanse
- **Relationship loading** za optimizaciju

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
- **React Query** (opciono) – server state management
- **i18next** – internacionalizacija

### Struktura direktorijuma (frontend)

```
frontend/
│
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── types/
│   │   └── index.ts
│   ├── stranice/
│   │   ├── Home/
│   │   │   ├── Home.tsx
│   │   │   └── Home.module.css
│   │   ├── Pjesma/
│   │   ├── Album/
│   │   ├── Playlista/
│   │   ├── Izvodjac/
│   │   ├── AdminPanel/
│   │   ├── Statistika/
│   │   ├── Historija/
│   │   ├── Omiljeno/
│   │   ├── Pretplata/
│   │   └── ...
│   ├── komponente/
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   └── Header.module.css
│   │   ├── AudioPlayer/
│   │   │   ├── AudioPlayer.tsx
│   │   │   └── AudioPlayer.module.css
│   │   ├── Footer/
│   │   ├── Sidebar/
│   │   ├── Search/
│   │   └── Loading/
│   ├── locales/
│   │   ├── bs/
│   │   │   └── translation.json
│   │   ├── en/
│   │   └── de/
│   └── ...
├── public/
│   ├── logo.gif
│   ├── favicon.ico
│   └── ...
├── .env
├── .env.production
├── package.json
├── tsconfig.json
├── vite.config.ts
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

### Audio player

**Desktop verzija:**
- **Fiksiran na dnu** sa gradient pozadinom
- **Kontrole**: play/pause, progress, repeat, brzina, volume
- **Metapodaci**: slika, naziv, izvođač, vrijeme
- **Akcije**: lajk, dodaj u playlistu, komentari
- **Minimizacija** u floating button

**Mobilna verzija:**
- **Kompaktni layout** sa tri reda
- **Touch-friendly** kontrole
- **Gestures** podrška
- **Responsive** font sizes
- **Optimizovani** za male ekrane

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

**Home stranica:**
- Hero sekcija sa logo-om
- Horizontalni scroll za kategorije
- Random shuffle algoritam
- Play all funkcionalnost

**Detalj pjesme:**
- Veliki cover art
- Izvođači sa linkovima
- Komentari sa real-time update
- Preporučene pjesme
- Statistika reprodukcija

**Audio player:**
- Smooth animacije
- Progress bar sa seeking
- Volume control sa slider
- Repeat modes (one/all)
- Speed control (0.5x - 2x)

### Napredne funkcionalnosti (frontend)

- **Dynamic backgrounds**: Automatska promjena pozadine bazirane na trenutnoj pjesmi
- **Suspendovan/obrisan screen**: Specijalni UI za suspendovane/obrisane korisnike
- **Audio player upgrades**: Progress seeking, volume slider, speed control
- **Internationalization**: Podrška za više jezika (BS, EN, DE)
- **Responsive design**: Optimizovano za desktop i mobilne uređaje
- **Error handling**: Graceful degradation i user-friendly error messages
- **Performance optimizations**: Lazy loading, code splitting, memoization

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

### Struktura direktorijuma (mobilna)

```
mobilnaAPP/
│
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   └── _layout.tsx
│   ├── _layout.tsx
│   └── ...
├── components/
│   ├── AudioPlayer/
│   │   ├── AudioPlayer.tsx
│   │   └── AudioPlayer.styles.ts
│   ├── Header/
│   │   ├── Header.tsx
│   │   └── Header.styles.ts
│   └── ...
├── screens/
│   ├── Home/
│   │   ├── Home.tsx
│   │   └── Home.styles.ts
│   └── ...
├── context/
│   └── AudioContext.tsx
├── config/
│   └── api.ts
├── types/
│   └── index.ts
├── .env
├── .env.example
├── app.config.js
├── package.json
├── tsconfig.json
└── ...
```

### React Native komponente

**AudioPlayer komponenta:**
- **Three-row layout**: Slika/meta, kontrole/progress, volume/opcije
- **Native audio**: Expo Audio sa streaming podrškom
- **Slider controls**: Progress seeking i volume control
- **Playback speed**: 0.5x - 2x brzina
- **Repeat modes**: Jedna pjesma ili sve
- **Error handling**: Retry logika za network probleme

**Header komponenta:**
- **Responsive design**: Desktop i mobilni layout
- **User avatar**: Profilna slika korisnika
- **Search bar**: Placeholder za pretragu
- **Logout functionality**: Async Storage cleanup

**Home komponenta:**
- **Horizontal lists**: Pjesme, albumi, playliste, izvođači
- **Pull-to-refresh**: Native refresh kontrola
- **Loading states**: Skeleton loader
- **Error handling**: User-friendly error messages

### Audio player (mobilna)

**Funkcionalnosti:**
- **Native audio playback** sa Expo Audio
- **Streaming support** za Firebase URLs
- **Progress seeking** sa real-time update
- **Volume control** sa slider
- **Playback speed** sa buttons
- **Repeat modes** (one/all)
- **Minimized state** sa floating button
- **Error recovery** sa retry logikom

**Optimizacije:**
- **Audio caching** za bolje performanse
- **Memory management** sa proper cleanup
- **Battery optimization** sa background handling
- **Network resilience** sa retry logikom

### Testiranje mobilne aplikacije

- **Expo Go** za development testing
- **Physical devices** za real-world testing
- **Audio playback** testing sa različitim formatima
- **Network conditions** testing (slow/fast/offline)
- **Battery usage** optimization testing

### Distribucija APK

**Development:**
```bash
npx expo install
npx expo start
```

**Production build:**
```bash
npx expo build:android
npx expo build:ios
```

**Testing:**
- **Expo Go** za development
- **TestFlight** za iOS beta testing
- **APK sharing** za Android testing
- **Over-the-air updates** sa Expo Updates

---

## 6. Dodatno

### CORS i sigurnost

- **CORS configuration** za frontend i mobilnu
- **Environment variables** za sve sensitive podatke
- **API key management** za Firebase
- **Rate limiting** za API endpoints
- **Input validation** na frontendu i backendu
- **SQL injection** prevention sa SQLAlchemy

### Okruženja i konfiguracija

**Backend (.env):**
```
DATABASE_URL_ASYNC=mysql+aiomysql://...
DATABASE_URL_SYNC=mysql+pymysql://...
FIREBASE_BUCKET_NAME=bucket-name
```

**Frontend (.env):**
```
VITE_API_BASE_URL=https://api.decibel.app/api
```

**Mobilna (.env):**
```
EXPO_PUBLIC_API_BASE_URL=https://api.decibel.app/api
```

### CI/CD

- **GitHub Actions** za automatski build
- **Vercel** za frontend deployment
- **Koyeb** za backend deployment
- **Expo EAS** za mobilnu aplikaciju
- **Automated testing** na svakom commit-u
- **Environment-based deployments** (dev/prod)

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
- **Service worker** za offline podrška
- **Lighthouse** optimizacija

### Pravila i migracije baze

- **Alembic migrations** za sve promjene
- **Unique constraints** sa proper error handling
- **Foreign key relationships** između svih modela
- **Index optimization** za performanse
- **Backup procedures** za podatke

### Pravila za komentare, historiju i pretplate

**Komentari:**
- Vlasnikov komentar uvijek na vrhu
- Uređivanje dozvoljeno samo vlasniku
- Brisanje dozvoljeno vlasniku i adminu
- Real-time update (opciono)

**Historija:**
- Unique constraint per korisnik+pjesma
- Najnovije prvo sortiranje
- Automatsko brisanje starih duplikata
- Paginacija za velike liste

**Pretplate:**
- Jedna aktivna pretplata po korisniku
- Automatska obnova sa validacijom
- Status tracking (aktivna/neaktivna/istekla)
- Obnova evidencija sa amount tracking

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

### Servisi i platforme

- [Aiven MySQL](https://aiven.io/)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Vercel](https://vercel.com/)
- [Koyeb](https://www.koyeb.com/)
- [Expo Application Services](https://expo.dev/eas)

### Biblioteke i alati

- [Chart.js](https://www.chartjs.org/)
- [React Hook Form](https://react-hook-form.com/)
- [React Query](https://tanstack.com/query)
- [Jest](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/)
- [Cypress](https://www.cypress.io/)

---

*Ova dokumentacija je ažurirana sa svim novim funkcionalnostima i poboljšanjima. Projekat je u potpunosti funkcionalan sa web i mobilnom aplikacijom. Za dodatne informacije ili podrška, kontaktirajte autora.*
