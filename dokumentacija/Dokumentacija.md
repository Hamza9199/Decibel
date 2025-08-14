# Dokumentacija projekta Decibel

## Sadržaj

0. [Šta je novo (2025-08)](#sta-je-novo-2025-08)
1. [Uvod](#uvod)
   - [Brzi start (lokalni razvoj)](#brzi-start-lokalni-razvoj)
2. [Arhitektura](#arhitektura)
   - [API verzionisanje i deprecijacija](#api-verzionisanje-i-deprecijacija)
   - [Tok zahtjeva i observability](#tok-zahtjeva-i-observability)
   - [Cross-cutting: middleware, validacija i standardni odgovori](#cross-cutting-middleware-validacija-i-standardni-odgovori)
3. [Backend](#backend)
   - [Tehnologije](#tehnologije-backenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-backend)
   - [Konvencije i standardi](#konvencije-i-standardi-backend)
   - [Modeli](#modeli)
   - [Standardi API-ja](#standardi-api-ja)
   - [Rute](#rute)
   - [Kontroleri](#kontroleri)
   - [Streaming, keširanje i CDN](#streaming-kesiranje-i-cdn)
   - [Upload i obrada medija](#upload-i-obrada-medija)
   - [Baza podataka](#baza-podataka)
   - [Firebase Storage](#firebase-storage)
   - [Pokretanje i razvoj](#pokretanje-i-razvoj)
   - [Docker](#docker-backend)
   - [Deploy](#deploy-backend)
   - [Sigurnost i autentikacija](#sigurnost-i-autentikacija)
   - [Logovanje i metrike](#logovanje-i-metrike)
   - [Background poslovi](#background-poslovi)
   - [Testiranje](#testiranje-backenda)
   - [Primjeri API poziva](#primjeri-api-poziva)
   - [Napredne funkcionalnosti](#napredne-funkcionalnosti)
   - [Noviteti](#noviteti)
4. [Frontend](#frontend)
   - [Tehnologije](#tehnologije-frontenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-frontend)
   - [Arhitekturni principi](#arhitekturni-principi-frontend)
   - [Konvencije i standardi](#konvencije-i-standardi-frontend)
   - [Konfiguracija i build](#konfiguracija-i-build-frontend)
   - [Prikaz podataka i audio player](#prikaz-podataka-i-audio-player)
   - [Performanse i PWA](#performanse-i-pwa)
   - [Deploy](#deploy-frontend)
   - [Testiranje](#testiranje-frontenda)
   - [Napredne funkcionalnosti](#napredne-funkcionalnosti-frontend)
   - [Noviteti](#noviteti-frontend)
5. [Mobilna aplikacija](#mobilna-aplikacija)
   - [Tehnologije](#tehnologije-mobilne-aplikacije)
   - [Struktura direktorijuma](#struktura-direktorijuma-mobilna)
   - [Konvencije i standardi](#konvencije-i-standardi-mobilna)
   - [Konfiguracija i build](#konfiguracija-i-build-mobilna)
   - [React Native komponente](#react-native-komponente)
   - [Audio player](#audio-player-mobilna)
   - [Offline režim](#offline-rezim-mobilna)
   - [Push, background i deep linkovi](#push-background-i-deep-linkovi)
   - [Dozvole](#dozvole)
   - [Testiranje](#testiranje-mobilne-aplikacije)
   - [Distribucija APK](#distribucija-apk)
   - [Noviteti](#noviteti-mobilna)
6. [Dodatno](#dodatno)
   - [CORS i sigurnost](#cors-i-sigurnost)
   - [Okruženja i konfiguracija](#okruzenja-i-konfiguracija)
   - [CI/CD](#ci-cd)
   - [Monitoring i logovanje](#monitoring-i-logovanje)
   - [SEO i PWA](#seo-i-pwa)
   - [Pravila i migracije baze](#pravila-i-migracije-baze)
   - [Pravila za komentare, historiju i pretplate](#pravila-za-komentare-historiju-i-pretplate)
   - [Automatizacija i AI](#automatizacija-i-ai)
   - [Politika verzionisanja i deprecijacije](#politika-verzionisanja-i-deprecijacije)
   - [Privatnost i zaštita podataka](#privatnost-i-zastita-podataka)
   - [Stil i konvencije](#stil-i-konvencije)
7. [Appendix](#appendix)
   - [Matrica okruženja](#matrica-okruzenja)
   - [Katalog grešaka](#katalog-gresaka)
   - [Mapiranje API ruta](#mapiranje-api-ruta)
   - [Referenca .env varijabli (sažeto)](#referenca-env-varijabli-sazeto)
   - [Primjeri sigurnosnih zaglavlja](#primjeri-sigurnosnih-zaglavlja)
8. [Troubleshooting](#troubleshooting)
9. [Reference](#reference)
10. [Changelog](#changelog)
11. [FAQ](#faq)

---

## 0. Šta je novo (2025-08)

- Standardizovan API envelope (data/meta/traceId) i dosljedni error format sa traceId za korelaciju.
- Verzija API-ja /api/v1 ostaje default; uveden jasan plan deprecijacije (6–12 mjeseci) i changelog.
- Paginacija, filtriranje i sortiranje usklađeni između web i mobilne aplikacije (isti parametri i ponašanje).
- Proširena sigurnost: rate limiting preporuke (SlowAPI), sigurnosna zaglavlja, validacija upload-a (MIME/veličina) i hard‑limit za audio/slike.
- Streaming i performanse: podrška za Range zaglavlja, ETag/Cache-Control, preporuka za CDN pred frontend.
- Observability: strukturisano JSON logovanje sa request-id/traceId, /healthz i /readyz endpointi; preporuka za Prometheus/Grafana i Sentry.
- CI/CD: gate-ovi (lint/test), automatske migracije prije deploy-a, matrica (backend Koyeb, frontend Vercel, mobilna EAS).
- Mobilna: detaljniji offline režim (limit keša, LRU čišćenje, putanja fajlova), background audio, FCM push, cleanup hook-ovi.
- I18n: konsolidovana struktura prevoda (BS/EN/DE) i uputstvo za dodavanje novih jezika.
- Dodatne smjernice: pristupačnost (a11y), performanse (LCP/TTI budžeti), pravila za commit poruke (Conventional Commits), stil kodiranja.
- Expo Router standardizovan na mobilnoj aplikaciji (dinamičke rute npr. app/pjesma/[pjesmaId].tsx, tabovi u app/(tabs)).
- Novo: referentni primjeri sigurnosnih zaglavlja, primjer GitHub Actions CI za backend i frontend, i proširen Troubleshooting.

---

## 1. Uvod

Decibel je moderna muzička platforma (web + mobilna aplikacija) za upravljanje, prikaz i slušanje pjesama, albuma, plejlista i korisnika. Projekat koristi moderne tehnologije za backend (FastAPI), frontend (React + Vite) i mobilnu aplikaciju (React Native + Expo). 

Najvažnije mogućnosti:
- Offline režim (mobilna), napredna pretraga, historija slušanja sa unique constraintom
- Napredni filteri/sort, paginacija i lazy loading
- Notifikacije (push/email), suspendovanje korisnika, prijava izvođača
- Statistika (grafovi, top liste), automatska obnova pretplate
- Napredni audio player (web & mobilni) sa background play
- Komentari sa uređivanjem, globalni state, centralizovana konfiguracija
- CI/CD, i18n (BS/EN/DE), Dark/Light tema, QR kodovi, Firebase Storage, backup baze

### Brzi start (lokalni razvoj)

- Backend
  - `cd backend && pip install -r requirements.txt`
  - U .env postaviti DATABASE_URL_ASYNC i DATABASE_URL_SYNC; pokrenuti: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- Frontend (Vite)
  - `cd frontend && npm i && echo VITE_API_URL=http://localhost:8000 >> .env && npm run dev`
- Mobilna (Expo)
  - `cd mobilnaAPP && npm i && echo EXPO_PUBLIC_API_URL=http://localhost:8000 >> .env && npx expo start`
- Preporuka: pokrenuti backend prije klijentskih aplikacija; provjeriti Swagger na http://localhost:8000/docs

---

## 2. Arhitektura

Aplikacija je podijeljena na tri dijela:
- Backend: FastAPI (Python), MySQL (Aiven Cloud), Firebase Storage
- Frontend: React (TypeScript), Vite, CSS Modules
- Mobilna: React Native (Expo), TypeScript, Expo AV

Komunikacija: REST API. Servisi su nezavisni i deployuju se odvojeno. 

Novi pristup:
- Environment-based konfiguracija (.env)
- Centralizovani API klijenti (tipizirani), React Query/AudioContext za state
- Unified error handling i standardizovan odgovor
- Automatsko testiranje i deploy (CI/CD)
- Verzije API-ja: /api/v1, plan deprecijacije 6–12 mjeseci uz changelog

### API verzionisanje i deprecijacija
- Aktivna verzija: /api/v1
- Deprecijacija: release note + HTTP Warning + Sunset datum
- Održavanje: stare verzije samo sigurnosne ispravke; funkcionalne promjene idu u novu verziju
- Klijenti čitaju base URL iz env (VITE_API_URL / EXPO_PUBLIC_API_URL)

### Tok zahtjeva i observability
- Klijent može poslati X-Request-Id; backend kreira traceId ako nije poslan
- Logovi (JSON) uključuju: metoda, putanja, status, trajanje ms, userId (ako postoji), traceId
- Health endpointi: /healthz (liveness), /readyz (readiness), opcioni /metrics

### Cross-cutting: middleware, validacija i standardni odgovori
- Middleware dodaje/propagira traceId, normalizuje CORS i sigurnosna zaglavlja
- Svi uspješni odgovori: `{ data, meta?, traceId }`
- Greške: `{ error: { code, message, details? }, traceId }`
- Pydantic validacija inputa i izlaza; katalog kodova grešaka u Appendix-u

---

## 3. Backend

### Tehnologije backenda

- FastAPI, SQLAlchemy (async), databases, aiomysql, Alembic
- python-dotenv, passlib[bcrypt], firebase-admin, uvicorn, python-multipart, pytest

### Struktura direktorijuma (backend)

```plaintext
backend/
├── main.py
├── requirements.txt
├── .env
├── alembic/
├── modeli/ ...
├── kontroleri/ ...
├── rute/ ...
└── servisi/ ...
```

### Konvencije i standardi (backend)

- Imenovanje: snake_case (DB), PascalCase (ORM), camelCase (JSON)
- Datumi/vrijeme: ISO 8601 (UTC), sufiksi At/Do
- Paginacija: limit (≤100), offset; total u meta (opcionalno)
- Sort: `?sort=polje,-drugo`
- Filtriranje: `q` + specifični filteri (zanr, jezik, javno, korisnikId...)
- Greške (JSON): vidi standardni odgovor i katalog kodova

### Modeli

- KorisnikORM, PjesmaORM, AlbumORM, PlaylistaORM, KomentarORM
- IzvodjacPjesmaORM, PjesmaPlaylistaORM, KorisnikPlaylistaORM, KorisnikPjesmaORM
- KorisnikPretplataORM, PretplataORM, ObnovaPretplateORM, PretplataStatus
- StatistikaReprodukcijeORM, HistorijaSlusanjaORM (unique korisnik+pjesma)
- RedoslijedPjesamaORM (redoslijed u playlisti)

Napomene:
- Indeksi na često filtriranim poljima (npr. korisnikId, createdAt)
- FK i on delete pravila; validacija unique constraint-a na aplikativnom sloju

### Standardi API-ja

- Prefiks: /api/v1
- Uspjeh:
```json
{
  "data": [],
  "meta": {"count": 20, "offset": 0, "total": 135},
  "traceId": "req-123"
}
```
- Greška:
```json
{
  "error": {"code": "RESOURCE_NOT_FOUND", "message": "Pjesma nije pronađena"},
  "traceId": "req-123"
}
```
- OpenAPI tagovi: Korisnici, Pjesme, Albumi, Playliste, Komentari, Statistika, Pretplate

### Rute

- `/api/v1/korisnici`, `/api/v1/pjesme`, `/api/v1/albumi`, `/api/v1/playliste`, `/api/v1/komentari`
- `/api/v1/statistika`, `/api/v1/historija`, `/api/v1/qr`
- Pretplate: `/api/v1/korisnik_pretplata`, `/api/v1/obnove_pretplate`
- Operativno: `/healthz`, `/readyz`, `/openapi.json`, `/redoc` (+ opcioni `/metrics`)

### Kontroleri

- Try/except uz mapiranje izuzetaka u katalog kodova (VALIDATION_ERROR, NOT_FOUND, CONFLICT...)
- Relationship loading (selectinload/joinedload) radi prevencije N+1
- Multipart upload za slike/audio; provjere MIME i veličine
- Scheduler/cron za automatizovane procese (pretplate, čišćenja)

### Streaming, keširanje i CDN

- Audio streaming: Range zaglavlja (206 Partial Content), Content-Range, Content-Length, Accept-Ranges
- Keširanje: ETag i/ili Last-Modified; Cache-Control za javne resurse
- Rekonekcija i resume: poštovati byte-range zahtjeve klijenta
- Preporuka: CDN ispred frontend-a i Firebase Storage-a gdje je moguće

### Upload i obrada medija

- Validacija: Content-Type whitelist, veličina (audio ≤ 20MB, slika ≤ 5MB – konfigurabilno)
- Sigurno ime fajla; čuvanje metapodataka (trajanje, dimenzije, veličina)
- Generisanje signed URL-ova sa rokom trajanja
- Opcionalno AV skeniranje (pre-deploy/worker)

### Baza podataka

- MySQL (Aiven). Alembic migracije izvor istine
- Indeksi: `(korisnik_id, datum)`, `(pjesma_id)`, `(playlista_id, poredak)`
- Backup: dnevno, retention 30 dana; restore procedura dokumentovana

### Firebase Storage

- Upload/download za slike/audio/gif
- Signed URL-ovi; periodično čišćenje privremenih fajlova

### Pokretanje i razvoj

1) Instalacija
```bash
pip install -r requirements.txt
```
2) Lokalni razvoj
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
3) Migracije
```bash
alembic revision --autogenerate -m "opis"
alembic upgrade head
```
4) .env primjer
```
DATABASE_URL_ASYNC=mysql+aiomysql://user:pass@host/db
DATABASE_URL_SYNC=mysql+pymysql://user:pass@host/db
FIREBASE_BUCKET_NAME=your-bucket
ALLOWED_ORIGINS=https://frontend.example.com,https://app.example.com
MAX_UPLOAD_MB_AUDIO=20
MAX_UPLOAD_MB_IMAGE=5
RATE_LIMIT_PER_MINUTE=120
SECURITY_HEADERS_ENABLED=true
```
5) Swagger: http://localhost:8000/docs

### Docker (backend)

Minimalni Dockerfile:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

docker-compose (API + MySQL):
```yaml
services:
  db:
    image: mysql:8
    environment:
      MYSQL_DATABASE: decibel
      MYSQL_ROOT_PASSWORD: root
    ports: ["3306:3306"]
  api:
    build: .
    environment:
      DATABASE_URL_ASYNC: mysql+aiomysql://root:root@db:3306/decibel
      DATABASE_URL_SYNC: mysql+pymysql://root:root@db:3306/decibel
    ports: ["8000:8000"]
    depends_on: [db]
```

### Deploy (backend)

- Koyeb: build & run; `alembic upgrade head` prije starta
- CORS iz .env; Health check `/healthz`; Readiness nakon konekcije na bazu
- Backup i rotacija logova; tajne kroz Secret management

### Sigurnost i autentikacija

- Lozinke: bcrypt + per-user salt; nikad plain tekst
- CORS: ALLOWED_ORIGINS; metode GET/POST/PUT/DELETE/OPTIONS
- Upload: Content-Type/veličina; whitelist ekstenzija
- RBAC: korisnik/izvođač/admin; provjera vlasništva
- JWT (opciono): access 15min, refresh 7–30 dana, rotacija i blacklist/whitelist
- Rate limiting: SlowAPI ili na proxy sloju (Cloudflare, Nginx)
- Sigurnosna zaglavlja: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- HTTPS u produkciji; bez mixed content-a
- Tokeni: Bearer u Authorization; refresh u secure storage (mobilna) ili httpOnly cookie

Brzi JWT primjer (FastAPI):
```python
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt, datetime as dt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/korisnici/login")
SECRET = "change-me"

def create_access(user_id: int):
    return jwt.encode({"sub": user_id, "exp": dt.datetime.utcnow()+dt.timedelta(minutes=15)}, SECRET, algorithm="HS256")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="INVALID_TOKEN")
```

### Logovanje i metrike

- JSON logovi sa: metoda, putanja, status, ms, userId, traceId
- Zaglavlja: X-Request-Id (opciono); traceId vraćen u tijelu
- `/healthz`, `/readyz`, opcioni `/metrics` (Prometheus)
- Sentry (opciono) za error tracking

### Background poslovi

- Čišćenje: stari signed URL-ovi, privremeni fajlovi
- Pretplate: dnevna provjera isteka i auto-obnova
- Statistika: preagregacija top-lista/grafova

### Testiranje (backend)

- Pytest: unit/integration; fixtures
- Postman/Swagger za ručno testiranje
- Load test (k6/Locust) za kritične rute
- Coverage cilj: ≥ 70% na kritičnim domainima

### Primjeri API poziva

```http
POST /api/v1/korisnici/register
Content-Type: application/json
{
  "ime": "Marko",
  "prezime": "Petrović",
  "korisnicko_ime": "marko123",
  "email": "marko@example.com",
  "lozinka": "sigurna123",
  "rola": "korisnik"
}

POST /api/v1/pjesme
Content-Type: multipart/form-data
naziv=Moja Pjesma
opis=Opis pjesme
zanr=Pop
file_audio=audio.mp3
file_slika=slika.jpg

GET /api/v1/statistika/top-songs
```

### Napredne funkcionalnosti

- Auto-obnova pretplate; suspendovanje korisnika; statistika sa embed objektima
- Offline režim (preuzimanje pjesama); QR kodovi; AI preporuke (eksperimentalno)

### Noviteti

- Offline tokeni i čišćenje starih fajlova; fuzzy/autocomplete pretraga
- Push/email notifikacije (FCM/SMTP); QR generacija/validacija; Admin panel endpointi

---

## 4. Frontend

### Tehnologije frontenda

- React 18 + TypeScript, Vite, CSS Modules
- Axios, React Router, React Query, i18next
- Jest/Cypress

### Struktura direktorijuma (frontend)

```plaintext
frontend/
├── src/
│   ├── api/           (Axios instance, hooks)
│   ├── components/    (UI komponente)
│   ├── pages/         (stranice)
│   ├── hooks/         (custom hooks)
│   ├── locales/       (prevodi)
│   ├── styles/        (globalni stilovi)
│   └── types/         (tipovi)
├── public/
├── .env
└── package.json
```

### Arhitekturni principi (frontend)

- „By feature“ grupisanje gdje ima smisla; shared u `components/`
- Tipizirani API sloj (ApiResponse<T>); interceptori i globalni error handler
- React Query za data fetching sa cache keyevima po domenu (npr. ['songs', params])

### Konvencije i standardi (frontend)

- Axios instance sa baseURL=`VITE_API_URL`; interceptori (auth, error)
- i18n: default iz `VITE_I18N_DEFAULT_LANG`; lazy load prevoda
- ESLint/Prettier; a11y (semantika, ARIA za player kontrole)

Axios primjer:
```ts
import axios from 'axios'
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })
api.interceptors.response.use(r=>r, e=>Promise.reject(e))
```

### Konfiguracija i build (frontend)

- .env (VITE_ prefiks); `npm run dev/build/preview`
- QueryClient centralizovan (config)
- CSP preporuka: `default-src 'self'; connect-src 'self' API_URL; img-src 'self' data: Firebase;`

### Prikaz podataka i audio player

- Kartice (Spotify-style), responsive grid, infinite scroll
- Skeleton loading, error boundaries
- Player fiksiran na dnu: play/pause, progress, repeat/shuffle, brzina, volume, mini-player
- Range streaming (seek preko Range zaglavlja)

### Performanse i PWA

- Budžeti: LCP < 2.5s (p75); TTI < 3.5s; code splitting i lazy routes
- PWA: manifest + service worker; offline cache za statiku i liste (stale-while-revalidate)
- No-store za osjetljive rute/podatke

### Deploy (frontend)

- Vercel: auto-build iz main; env varijable; CDN; custom domain

### Testiranje (frontend)

- Jest + RTL; Cypress E2E; opcioni Storybook

### Napredne funkcionalnosti (frontend)

- Dynamic backgrounds; suspendovan/obrisan screen
- i18n (BS/EN/DE); QR kodovi; web push (opciono)

### Noviteti (frontend)

- PWA offline; fuzzy/autocomplete search; AI preporuke

---

## 5. Mobilna aplikacija

### Tehnologije mobilne aplikacije

- React Native (Expo), TypeScript, expo-av, expo-image, React Navigation, Async Storage, React Query

### Struktura direktorijuma (mobilna)

```plaintext
mobilnaAPP/
├── app/          (router, ekrani)
├── komponente/   (UI i player)
├── hooks/        (mreža, cleanup, push)
├── context/      (AudioContext)
├── config/       (queryClient, api)
├── locales/      (prevodi)
├── .env
└── app.config.js
```

### Konvencije i standardi (mobilna)

- `EXPO_PUBLIC_` prefiks za varijable okruženja
- Centralizovan QueryClient; i18n u `locales/`
- `useScreenCleanup` za sprječavanje curenja listenera
- Secure storage (preporuka) za osjetljive tokene; retry/backoff mrežnih poziva

### Konfiguracija i build (mobilna)

- Dev: `npx expo start`
- EAS build: preview/production profili; OTA updates (opciono)
- FCM: `google-services.json`; `hooks/usePushNotifications.ts`
- Deep linkovi: scheme `decibel://` (npr. `decibel://pjesma/123`)

### React Native komponente

- AudioPlayer (expo-av; progress/volume slider, repeat/shuffle, background play)
- Header, Sidebar/Tabs, Home, Biblioteka, Omiljeno, Detalji (pjesma/album/playlista/izvođač)

### Audio player (mobilna)

- `expo-av` + `onPlaybackStatusUpdate`; background mode
- Cleanup na unmount + `useScreenCleanup`
- Range/seek; pauza na poziv/slušalice; media notification (Android)

### Offline režim (mobilna)

- Fajlovi: `expo-file-system` u `FileSystem.documentDirectory`
- Limit keša: preporuka 1GB; LRU brisanje najstarijih fajlova
- Feature flag: `EXPO_PUBLIC_FEATURE_OFFLINE`
- Primjer preuzimanja:
```ts
import * as FileSystem from 'expo-file-system'
await FileSystem.downloadAsync(remoteUrl, FileSystem.documentDirectory + 'audio/123.mp3')
```

### Push, background i deep linkovi

- FCM token → backend; slanje po useru ili topicu
- Background fetch (opciono) za sinhronizaciju omiljenih/historije
- Deep linkovi: otvaranje ekrana prema scheme i parametru

### Dozvole

- Android: POST_NOTIFICATIONS (13+), INTERNET; (Expo automatski rukuje skladištem)
- iOS: Notifications, Background audio

### Testiranje mobilne aplikacije

- Expo Go i fizički uređaji; razni audio formati i mrežni uslovi (offline/slow)

### Distribucija APK

- EAS build (Android), TestFlight (iOS), OTA updates (opciono)

### Noviteti (mobilna)

- Offline preuzimanje/brisanje; real-time pretraga; FCM; QR skeniranje; AI preporuke

---

## 6. Dodatno

### CORS i sigurnost

- CORS iz .env; HTTPS u produkciji
- Rate limiting; input validacija; SQL injection prevencija (SQLAlchemy); JWT (opciono)

### Okruženja i konfiguracija

- Backend (.env primjer)
  - `DATABASE_URL_ASYNC`, `DATABASE_URL_SYNC`
  - `FIREBASE_BUCKET_NAME`
  - `ALLOWED_ORIGINS`
  - `MAX_UPLOAD_MB_AUDIO`, `MAX_UPLOAD_MB_IMAGE`
  - `RATE_LIMIT_PER_MINUTE`
  - `SECURITY_HEADERS_ENABLED`
- Frontend (Vite .env)
  - `VITE_API_URL`
  - `VITE_I18N_DEFAULT_LANG`
- Mobilna (Expo .env)
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_FEATURE_OFFLINE`

Preporuka: tajne čuvati kroz platformu (Vercel/Koyeb/EAS Secrets); ne komitovati u repozitorij.

### CI/CD

- Backend (Koyeb): lint/test → migrate → deploy; health check
- Frontend (Vercel): build iz main, per-environment varijable
- Mobilna (EAS): build profili, OTA updates

Primjer GitHub Actions (sažeto):
```yaml
name: ci
on: [push]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt
      - run: pytest -q
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run build
```

### Monitoring i logovanje

- FastAPI logging + Sentry (opciono), Web Vitals, GA
- Prometheus/Grafana (opciono)

### SEO i PWA

- React Helmet, sitemap, manifest, service worker, Lighthouse

### Pravila i migracije baze

- Alembic za sve promjene; unique/FK; optimizacija indeksa; backup procedure

### Pravila za komentare, historiju i pretplate

- Komentari: uređivanje vlasniku, brisanje vlasnik/admin; real-time update
- Historija: unique korisnik+pjesma, najnovije prvo, paginacija
- Pretplate: jedna aktivna, auto-obnova, evidencija obnova

### Automatizacija i AI

- AI preporuke (eksperimentalno); automatski backup; testiranje u CI; čišćenje starih fajlova

### Politika verzionisanja i deprecijacije

- SemVer za SDK; API prefiksi (/api/v1) po verziji; Deprecation header + sunset; dokumentovan migration path

### Privatnost i zaštita podataka

- Minimizacija podataka u logovima; nikad ne logovati lozinke/tokene
- Šifrirani backupi; ograničen pristup; GDPR principi (ako primjenjivo)

### Stil i konvencije

- Python: black/isort; TypeScript: ESLint/Prettier
- Commit poruke: Conventional Commits (feat/fix/chore/docs/refactor/test/build)

---

## 7. Appendix

### Matrica okruženja

- Dev: lokalni DB/Docker, debug logging, seed podaci
- Staging: kopija produkcije sa anonimizovanim podacima
- Prod: skalabilno okruženje, backup i monitoring uključeni

### Katalog grešaka

- AUTH_INVALID_CREDENTIALS (401)
- AUTH_INVALID_TOKEN (401)
- RESOURCE_NOT_FOUND (404)
- VALIDATION_ERROR (422)
- CONFLICT (409)
- RATE_LIMITED (429)
- SERVER_ERROR (500)

### Mapiranje API ruta

- Korisnici: `/api/v1/korisnici` (register, login, me, update, suspend)
- Pjesme: `/api/v1/pjesme` (CRUD, upload, search, recommend)
- Albumi: `/api/v1/albumi` (CRUD)
- Playliste: `/api/v1/playliste` (CRUD, redoslijed)
- Komentari: `/api/v1/komentari` (CRUD)
- Statistika: `/api/v1/statistika` (top-songs, top-artists, grafovi)
- Historija: `/api/v1/historija` (list, add, delete)
- Pretplate: `/api/v1/korisnik_pretplata`, `/api/v1/obnove_pretplate`
- QR: `/api/v1/qr` (generate, validate)

### Referenca .env varijabli (sažeto)

- Backend:
  - DATABASE_URL_ASYNC, DATABASE_URL_SYNC
  - FIREBASE_BUCKET_NAME
  - ALLOWED_ORIGINS (CSV)
  - MAX_UPLOAD_MB_AUDIO, MAX_UPLOAD_MB_IMAGE
  - RATE_LIMIT_PER_MINUTE, SECURITY_HEADERS_ENABLED
- Frontend (Vite):
  - VITE_API_URL
  - VITE_I18N_DEFAULT_LANG (bs|en|de)
- Mobilna (Expo):
  - EXPO_PUBLIC_API_URL
  - EXPO_PUBLIC_FEATURE_OFFLINE=true|false

### Primjeri sigurnosnih zaglavlja

Preporučena zaglavlja (za produkciju):
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), geolocation=(), microphone=()
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https://api.example.com; style-src 'self' 'unsafe-inline'; script-src 'self'
```

---

## 8. Troubleshooting

- CORS greška: provjeriti ALLOWED_ORIGINS, protokol (https) i OPTIONS preflight
- Upload odbijen: veličina/MIME; MAX_UPLOAD_MB_* i validatori
- Offline ne radi (mobilna): dozvole, `expo-file-system`, očistiti keš
- 500 na /api/*: backend logovi (traceId), konekcija na bazu, `alembic upgrade head`
- Push ne stižu: FCM token/permission; reinstal + re-registracija
- JWT 401: istekao token; refresh ili re-login; clock drift
- Prazne liste: limit/offset/sort; indeksi u bazi
- 206/seek ne radi: Range/Content-Range/Content-Length i Accept-Ranges
- Player staje u background-u (mobilna): background audio permisije i cleanup hook-ovi
- Deep link ne otvara ekran: scheme u `app.config.js` i format linka (npr. `decibel://pjesma/123`)
- i18n ne učitava (mobilna): `locales/` i inicijalizacija u `i18n.ts`
- PWA ne kešira: validacija service workera i cache strategije
- Rate limited (429): smanjiti frekvenciju; provjeriti RATE_LIMIT_PER_MINUTE

---

## 9. Reference

- FastAPI, SQLAlchemy, React, React Native, Expo, TypeScript, Vite, Firebase Storage
- Vercel, Koyeb, EAS, Chart.js, React Hook Form, React Query, Jest, RTL, Cypress

## 10. Changelog

- 2025-08
  - Dodan Brzi start (lokalni razvoj)
  - Prošireni operativni endpointi (/openapi.json, /redoc)
  - Dokumentovana Expo Router struktura (mobilna)
  - Pojašnjen request-id/traceId obrazac u logovima
  - Ažurirana sekcija okruženja sa konkretnim .env primjerima
  - Dodani primjeri GitHub Actions CI, sigurnosna zaglavlja i proširen Troubleshooting

## 11. FAQ

- P: Koji je base URL API-ja u lokalnom okruženju?
  - O: http://localhost:8000
- P: Gdje mijenjam API URL za web?
  - O: U `frontend/.env` kroz `VITE_API_URL`.
- P: Kako osvježiti migracije?
  - O: `alembic revision --autogenerate -m "opis" && alembic upgrade head`.
- P: Kako omogućiti offline na mobilnoj?
  - O: `EXPO_PUBLIC_FEATURE_OFFLINE=true` i koristiti ekran Offline; fajlovi se čuvaju u `FileSystem.documentDirectory`.
- P: Kako uključiti sigurnosna zaglavlja?
  - O: Postaviti `SECURITY_HEADERS_ENABLED=true` i konfigurirati proxy/server (Nginx/Cloudflare) prema preporukama iz Appendix-a.


