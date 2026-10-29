# Decibel Project Documentation

## Table of Contents

1. [Introduction](#1-introduction)
   - [Quick start (local development)](#quick-start-local-development)
1.1. [Main modules — quick overview](#main-modules--quick-overview)
1.2. [Discord Bot](#discord-bot)
1.3. [Desktop](#desktop)
2. [Architecture](#2-architecture)
   - [API versioning and deprecation](#api-versioning-and-deprecation)
   - [Request flow and observability](#request-flow-and-observability)
   - [Cross-cutting: middleware, validation and standard responses](#cross-cutting-middleware-validation-and-standard-responses)
3. [Backend](#3-backend)
   - [Backend technologies](#backend-technologies)
   - [Directory structure (backend)](#directory-structure-backend)
   - [Conventions and standards (backend)](#conventions-and-standards-backend)
   - [Models](#models)
   - [API standards](#api-standards)
   - [Routes](#routes)
   - [Controllers](#controllers)
   - [Streaming, caching and CDN](#streaming-caching-and-cdn)
   - [Upload and media processing](#upload-and-media-processing)
   - [Database](#database)
   - [Firebase Storage](#firebase-storage)
   - [Running and development](#running-and-development)
   - [Docker (backend)](#docker-backend)
   - [Deploy (backend)](#deploy-backend)
   - [Security and authentication](#security-and-authentication)
   - [Logging and metrics](#logging-and-metrics)
   - [Background jobs](#background-jobs)
   - [Testing (backend)](#testing-backend)
   - [API call examples](#api-call-examples)
   - [Advanced features](#advanced-features)
   - [What's new](#whats-new)
4. [Frontend](#4-frontend)
   - [Frontend technologies](#frontend-technologies)
   - [Directory structure (frontend)](#directory-structure-frontend)
   - [Architectural principles (frontend)](#architectural-principles-frontend)
   - [Conventions and standards (frontend)](#conventions-and-standards-frontend)
   - [Configuration and build (frontend)](#configuration-and-build-frontend)
   - [Data display and audio player](#data-display-and-audio-player)
   - [Performance and PWA](#performance-and-pwa)
   - [Deploy (frontend)](#deploy-frontend)
   - [Testing (frontend)](#testing-frontend)
   - [Advanced features (frontend)](#advanced-features-frontend)
   - [What's new (frontend)](#whats-new-frontend)
5. [Mobile application](#5-mobile-application)
   - [Mobile application technologies](#mobile-application-technologies)
   - [Directory structure (mobile)](#directory-structure-mobile)
   - [Conventions and standards (mobile)](#conventions-and-standards-mobile)
   - [Configuration and build (mobile)](#configuration-and-build-mobile)
   - [React Native components](#react-native-components)
   - [Audio player (mobile)](#audio-player-mobile)
   - [Offline mode (mobile)](#offline-mode-mobile)
   - [Push, background and deep links](#push-background-and-deep-links)
   - [Permissions](#permissions)
   - [Testing the mobile application](#testing-the-mobile-application)
   - [APK distribution](#apk-distribution)
   - [What's new (mobile)](#whats-new-mobile)
6. [Additional](#6-additional)
   - [CORS and security](#cors-and-security)
   - [Environments and configuration](#environments-and-configuration)
   - [CI/CD](#ci-cd)
   - [Monitoring and logging](#monitoring-and-logging)
   - [SEO and PWA](#seo-and-pwa)
   - [Database rules and migrations](#database-rules-and-migrations)
   - [Rules for comments, history and subscriptions](#rules-for-comments-history-and-subscriptions)
   - [Automation and AI](#automation-and-ai)
   - [Versioning and deprecation policy](#versioning-and-deprecation-policy)
   - [Privacy and data protection](#privacy-and-data-protection)
   - [Style and conventions](#style-and-conventions)
7. [Appendix](#7-appendix)
   - [Environment matrix](#environment-matrix)
   - [Error catalog](#error-catalog)
   - [API route mapping](#api-route-mapping)
   - [.env variable reference (summary)](#env-variable-reference-summary)
   - [Security header examples](#security-header-examples)
8. [Troubleshooting](#8-troubleshooting)
9. [References](#9-references)
10. [Changelog](#10-changelog)
11. [FAQ](#11-faq)
12. [Technical, file-by-file overview](#12-technical-file-by-file-overview-detailed)
13. [Frontend file level](#13-frontend--file-level-reference)
14. [Mobile application file level](#14-mobile-application--file-level-reference-detailed)




## 1. Introduction

Decibel is a modern music platform (web + mobile application) for managing, displaying and listening to songs, albums, playlists and users. The project uses modern technologies for the backend (FastAPI), frontend (React + Vite) and mobile application (React Native + Expo).

Key features:
- Offline mode (mobile), advanced search, listening history with a unique constraint
- Advanced filters/sorting, pagination and lazy loading
- Notifications (push/email), user suspension, artist application
- Statistics (charts, top lists), automatic subscription renewal
- Advanced audio player (web & mobile) with background play
- Comments with editing, global state, centralized configuration
- CI/CD, i18n (BS/EN/DE), Dark/Light theme, QR codes, Firebase Storage, database backup

### Quick start (local development)

- Backend
  - `cd backend && pip install -r requirements.txt`
  - Set DATABASE_URL_ASYNC and DATABASE_URL_SYNC in .env; run: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- Frontend (Vite)
  - `cd frontend && npm i && echo VITE_API_URL=http://localhost:8000 >> .env && npm run dev`
- Mobile (Expo)
  - `cd mobilnaAPP && npm i && echo EXPO_PUBLIC_API_URL=http://localhost:8000 >> .env && npx expo start`
- Recommendation: start the backend before the client applications; check Swagger at http://localhost:8000/docs


### Main modules — quick overview

This section provides an immediately usable, non-theoretical summary of where to find and how to run the project's main modules: Backend, Frontend, Mobile application, Desktop and Discord Bot.

- Backend
  - Path: `backend/`
  - Purpose: REST API, business logic, database, file upload, background jobs.
  - Running (locally):
```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
  - Swagger: `http://localhost:8000/docs`

- Frontend (web)
  - Path: `frontend/`
  - Purpose: user interface for browsing and playing music, user management and admin functions.
  - Running (locally):
```powershell
cd frontend
npm ci
npm run dev
```

- Mobile application
  - Path: `mobilnaAPP/`
  - Purpose: Expo React Native application for users (offline, background play, push).
  - Running (locally):
```powershell
cd mobilnaAPP
npm ci
npx expo start
```

- Desktop
  - Path: `desktop/`
  - Purpose: Electron-based desktop client (shared API with web/mobile).
  - Running (locally): check `desktop/package.json` and `main.js` for the start script.

- Discord Bot
  - Path: `discordBot/` and the duplicated integration in `backend/servisi/DiscordBot.py`.
  - Purpose: slash commands (play, pause, skip, active), integration with the backend for fetching songs and metadata.
  - Most important: voice playback requires FFmpeg and a host with outbound UDP (VPS). If you host the bot on a PaaS that blocks UDP, use `DISABLE_VOICE=true` or host the bot separately.
  - Running (locally / VPS):
```powershell
cd discordBot
pip install -r requirements.txt
python main.py
```

##### Discord Bot

Code location:
- `discordBot/DiscordBot.py` — main entry script for the bot (slash commands, event handling)
- `backend/servisi/DiscordBot.py` — variant/source of the integration that can be started from the backend process (controlled by the `RUN_DISCORD_IN_PROCESS` env var).

Main notes:
- The voice (play) functionality uses `discord.FFmpegPCMAudio(url)` and requires:
  - `ffmpeg` installed on the host
  - a host/environment that allows outbound UDP
  - a valid `TOKEN` and bot privileges in the Discord guild (CONNECT, SPEAK)
- If you host the backend on Render, Vercel or similar PaaS providers that block UDP, `/play` will report a connection error. Solutions:
  1. Set `DISABLE_VOICE=true` in the env in those environments (the bot will still work for slash commands that do not use voice)
  2. Host the Discord bot on a VPS/VM (DigitalOcean, Hetzner, AWS EC2) that allows UDP and install `ffmpeg`.
  3. For development, you can run `discordBot` locally and use `BACKEND_URL` to communicate with the API.

Operational steps for a VPS:
```powershell
# on Ubuntu/Debian (example)
sudo apt update; sudo apt install -y ffmpeg python3-venv python3-pip
python3 -m venv venv; .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Security:
- Never commit `TOKEN` to the repository. Use Secrets (Vercel/Koyeb/EAS Secrets or systemd environment) or `.env` in a private environment.

##### Desktop

Code location:
- `desktop/main.js` — Electron main process
- `desktop/preload.js` — preload for the renderer
- `desktop/package.json` — start/build scripts

Purpose and behavior:
- The desktop client uses the same REST APIs as web/mobile.
- If you want to enable native integrations (e.g. system media keys), check the code in `main.js` and implement platform-specific handlers.

Running:
```powershell
cd desktop
npm ci
npm run start
```

Note: The desktop app may require additional build steps for production (electron-builder / electron-forge) — check `package.json`.


---

## 2. Architecture

The application is divided into three parts:
- Backend: FastAPI (Python), MySQL (Aiven Cloud), Firebase Storage
- Frontend: React (TypeScript), Vite, CSS Modules
- Mobile: React Native (Expo), TypeScript, Expo AV

Communication: REST API. The services are independent and deployed separately.

New approach:
- Environment-based configuration (.env)
- Centralized API clients (typed), React Query/AudioContext for state
- Unified error handling and standardized responses
- Automated testing and deployment (CI/CD)
- API versions: /api/v1, deprecation plan of 6–12 months with a changelog

### API versioning and deprecation
- Active version: /api/v1
- Deprecation: release note + HTTP Warning + Sunset date
- Maintenance: old versions receive security fixes only; functional changes go into the new version
- Clients read the base URL from env (VITE_API_URL / EXPO_PUBLIC_API_URL)

### Request flow and observability
- The client may send X-Request-Id; the backend creates a traceId if none was sent
- Logs (JSON) include: method, path, status, duration in ms, userId (if present), traceId
- Health endpoints: /healthz (liveness), /readyz (readiness), optional /metrics

### Cross-cutting: middleware, validation and standard responses
- Middleware adds/propagates traceId, normalizes CORS and security headers
- All successful responses: `{ data, meta?, traceId }`
- Errors: `{ error: { code, message, details? }, traceId }`
- Pydantic validation of input and output; error code catalog in the Appendix

---

## 3. Backend

### Backend technologies

- FastAPI, SQLAlchemy (async), databases, aiomysql, Alembic
- python-dotenv, passlib[bcrypt], firebase-admin, uvicorn, python-multipart, pytest

### Directory structure (backend)

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

### Conventions and standards (backend)

- Naming: snake_case (DB), PascalCase (ORM), camelCase (JSON)
- Dates/time: ISO 8601 (UTC), suffixes At/Do
- Pagination: limit (≤100), offset; total in meta (optional)
- Sorting: `?sort=field,-other`
- Filtering: `q` + specific filters (genre, language, public, userId...)
- Errors (JSON): see the standard response and the error code catalog

### Models

- KorisnikORM, PjesmaORM, AlbumORM, PlaylistaORM, KomentarORM
- IzvodjacPjesmaORM, PjesmaPlaylistaORM, KorisnikPlaylistaORM, KorisnikPjesmaORM
- KorisnikPretplataORM, PretplataORM, ObnovaPretplateORM, PretplataStatus
- StatistikaReprodukcijeORM, HistorijaSlusanjaORM (unique user+song)
- RedoslijedPjesamaORM (order within a playlist)

Notes:
- Indexes on frequently filtered fields (e.g. userId, createdAt)
- FK and on delete rules; unique constraint validation at the application layer

### API standards

- Prefix: /api/v1
- Success:
```json
{
  "data": [],
  "meta": {"count": 20, "offset": 0, "total": 135},
  "traceId": "req-123"
}
```
- Error:
```json
{
  "error": {"code": "RESOURCE_NOT_FOUND", "message": "Song not found"},
  "traceId": "req-123"
}
```
- OpenAPI tags: Users, Songs, Albums, Playlists, Comments, Statistics, Subscriptions

### Routes

- `/api/v1/korisnici`, `/api/v1/pjesme`, `/api/v1/albumi`, `/api/v1/playliste`, `/api/v1/komentari`
- `/api/v1/statistika`, `/api/v1/historija`, `/api/v1/qr`
- Subscriptions: `/api/v1/korisnik_pretplata`, `/api/v1/obnove_pretplate`
- Operational: `/healthz`, `/readyz`, `/openapi.json`, `/redoc` (+ optional `/metrics`)

### Controllers

- Try/except with exception mapping to catalog codes (VALIDATION_ERROR, NOT_FOUND, CONFLICT...)
- Relationship loading (selectinload/joinedload) to prevent N+1
- Multipart upload for images/audio; MIME and size checks
- Scheduler/cron for automated processes (subscriptions, cleanup)

### Streaming, caching and CDN

- Audio streaming: Range headers (206 Partial Content), Content-Range, Content-Length, Accept-Ranges
- Caching: ETag and/or Last-Modified; Cache-Control for public resources
- Reconnection and resume: honor the client's byte-range requests
- Recommendation: CDN in front of the frontend and Firebase Storage where possible

### Upload and media processing

- Validation: Content-Type whitelist, size (audio ≤ 20MB, image ≤ 5MB – configurable)
- Safe file name; storing metadata (duration, dimensions, size)
- Generating signed URLs with an expiration time
- Optional AV scanning (pre-deploy/worker)

### Database

- MySQL (Aiven). Alembic migrations are the source of truth
- Indexes: `(korisnik_id, datum)`, `(pjesma_id)`, `(playlista_id, poredak)`
- Backup: daily, retention 30 days; restore procedure documented

### Firebase Storage

- Upload/download for images/audio/gif
- Signed URLs; periodic cleanup of temporary files

### Running and development

1) Installation
```bash
pip install -r requirements.txt
```
2) Local development
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
3) Migrations
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```
4) .env example
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

Minimal Dockerfile:
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

- Koyeb: build & run; `alembic upgrade head` before start
- CORS from .env; Health check `/healthz`; Readiness after connecting to the database
- Backup and log rotation; secrets via Secret management

### Security and authentication

- Passwords: bcrypt + per-user salt; never plain text
- CORS: ALLOWED_ORIGINS; methods GET/POST/PUT/DELETE/OPTIONS
- Upload: Content-Type/size; extension whitelist
- RBAC: user/artist/admin; ownership checks
- JWT (optional): access 15min, refresh 7–30 days, rotation and blacklist/whitelist
- Rate limiting: SlowAPI or at the proxy layer (Cloudflare, Nginx)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- HTTPS in production; no mixed content
- Tokens: Bearer in Authorization; refresh in secure storage (mobile) or httpOnly cookie

Quick JWT example (FastAPI):
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

### Logging and metrics

- JSON logs with: method, path, status, ms, userId, traceId
- Headers: X-Request-Id (optional); traceId returned in the body
- `/healthz`, `/readyz`, optional `/metrics` (Prometheus)
- Sentry (optional) for error tracking

### Background jobs

- Cleanup: old signed URLs, temporary files
- Subscriptions: daily expiry check and auto-renewal
- Statistics: pre-aggregation of top lists/charts

### Testing (backend)

- Pytest: unit/integration; fixtures
- Postman/Swagger for manual testing
- Load test (k6/Locust) for critical routes
- Coverage target: ≥ 70% on critical domains

### API call examples

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

### Advanced features

- Subscription auto-renewal; user suspension; statistics with embedded objects
- Offline mode (song downloads); QR codes; AI recommendations (experimental)

### What's new

- Offline tokens and cleanup of old files; fuzzy/autocomplete search
- Push/email notifications (FCM/SMTP); QR generation/validation; Admin panel endpoints

---

## 4. Frontend

### Frontend technologies

- React 18 + TypeScript, Vite, CSS Modules
- Axios, React Router, React Query, i18next
- Jest/Cypress

### Directory structure (frontend)

```plaintext
frontend/
├── src/
│   ├── api/           (Axios instance, hooks)
│   ├── components/    (UI components)
│   ├── pages/         (pages)
│   ├── hooks/         (custom hooks)
│   ├── locales/       (translations)
│   ├── styles/        (global styles)
│   └── types/         (types)
├── public/
├── .env
└── package.json
```

### Architectural principles (frontend)

- "By feature" grouping where it makes sense; shared code in `components/`
- Typed API layer (ApiResponse<T>); interceptors and a global error handler
- React Query for data fetching with cache keys per domain (e.g. ['songs', params])

### Conventions and standards (frontend)

- Axios instance with baseURL=`VITE_API_URL`; interceptors (auth, error)
- i18n: default from `VITE_I18N_DEFAULT_LANG`; lazy loading of translations
- ESLint/Prettier; a11y (semantics, ARIA for player controls)

Axios example:
```ts
import axios from 'axios'
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })
api.interceptors.response.use(r=>r, e=>Promise.reject(e))
```

### Configuration and build (frontend)

- .env (VITE_ prefix); `npm run dev/build/preview`
- QueryClient centralized (config)
- CSP recommendation: `default-src 'self'; connect-src 'self' API_URL; img-src 'self' data: Firebase;`

### Data display and audio player

- Cards (Spotify-style), responsive grid, infinite scroll
- Skeleton loading, error boundaries
- Player fixed at the bottom: play/pause, progress, repeat/shuffle, speed, volume, mini-player
- Range streaming (seek via Range headers)

### Performance and PWA

- Budgets: LCP < 2.5s (p75); TTI < 3.5s; code splitting and lazy routes
- PWA: manifest + service worker; offline cache for static assets and lists (stale-while-revalidate)
- No-store for sensitive routes/data

### Deploy (frontend)

- Vercel: auto-build from main; environment variables; CDN; custom domain

### Testing (frontend)

- Jest + RTL; Cypress E2E; optional Storybook

### Advanced features (frontend)

- Dynamic backgrounds; suspended/deleted screen
- i18n (BS/EN/DE); QR codes; web push (optional)

### What's new (frontend)

- PWA offline; fuzzy/autocomplete search; AI recommendations

---

## 5. Mobile application

### Mobile application technologies

- React Native (Expo), TypeScript, expo-av, expo-image, React Navigation, Async Storage, React Query

### Directory structure (mobile)

```plaintext
mobilnaAPP/
├── app/          (router, screens)
├── komponente/   (UI and player)
├── hooks/        (network, cleanup, push)
├── context/      (AudioContext)
├── config/       (queryClient, api)
├── locales/      (translations)
├── .env
└── app.config.js
```

### Conventions and standards (mobile)

- `EXPO_PUBLIC_` prefix for environment variables
- Centralized QueryClient; i18n in `locales/`
- `useScreenCleanup` to prevent listener leaks
- Secure storage (recommended) for sensitive tokens; retry/backoff for network calls

### Configuration and build (mobile)

- Dev: `npx expo start`
- EAS build: preview/production profiles; OTA updates (optional)
- FCM: `google-services.json`; `hooks/usePushNotifications.ts`
- Deep links: scheme `decibel://` (e.g. `decibel://pjesma/123`)

### React Native components

- AudioPlayer (expo-av; progress/volume slider, repeat/shuffle, background play)
- Header, Sidebar/Tabs, Home, Library, Favorites, Details (song/album/playlist/artist)

### Audio player (mobile)

- `expo-av` + `onPlaybackStatusUpdate`; background mode
- Cleanup on unmount + `useScreenCleanup`
- Range/seek; pause on call/headphones; media notification (Android)

### Offline mode (mobile)

- Files: `expo-file-system` in `FileSystem.documentDirectory`
- Cache limit: recommended 1GB; LRU deletion of the oldest files
- Feature flag: `EXPO_PUBLIC_FEATURE_OFFLINE`
- Download example:
```ts
import * as FileSystem from 'expo-file-system'
await FileSystem.downloadAsync(remoteUrl, FileSystem.documentDirectory + 'audio/123.mp3')
```

### Push, background and deep links

- FCM token → backend; sending per user or per topic
- Background fetch (optional) for syncing favorites/history
- Deep links: opening screens according to scheme and parameter

### Permissions

- Android: POST_NOTIFICATIONS (13+), INTERNET; (Expo handles storage automatically)
- iOS: Notifications, Background audio

### Testing the mobile application

- Expo Go and physical devices; various audio formats and network conditions (offline/slow)

### APK distribution

- EAS build (Android), TestFlight (iOS), OTA updates (optional)

### What's new (mobile)

- Offline download/delete; real-time search; FCM; QR scanning; AI recommendations

---

## 6. Additional

### CORS and security

- CORS from .env; HTTPS in production
- Rate limiting; input validation; SQL injection prevention (SQLAlchemy); JWT (optional)

### Environments and configuration

- Backend (.env example)
  - `DATABASE_URL_ASYNC`, `DATABASE_URL_SYNC`
  - `FIREBASE_BUCKET_NAME`
  - `ALLOWED_ORIGINS`
  - `MAX_UPLOAD_MB_AUDIO`, `MAX_UPLOAD_MB_IMAGE`
  - `RATE_LIMIT_PER_MINUTE`
  - `SECURITY_HEADERS_ENABLED`
- Frontend (Vite .env)
  - `VITE_API_URL`
  - `VITE_I18N_DEFAULT_LANG`
- Mobile (Expo .env)
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_FEATURE_OFFLINE`

Recommendation: keep secrets in the platform (Vercel/Koyeb/EAS Secrets); do not commit them to the repository.

### CI/CD

- Backend (Koyeb): lint/test → migrate → deploy; health check
- Frontend (Vercel): build from main, per-environment variables
- Mobile (EAS): build profiles, OTA updates

GitHub Actions example (summary):
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

### Monitoring and logging

- FastAPI logging + Sentry (optional), Web Vitals, GA
- Prometheus/Grafana (optional)

### SEO and PWA

- React Helmet, sitemap, manifest, service worker, Lighthouse

### Database rules and migrations

- Alembic for all changes; unique/FK; index optimization; backup procedures

### Rules for comments, history and subscriptions

- Comments: editing by owner, deletion by owner/admin; real-time update
- History: unique user+song, newest first, pagination
- Subscriptions: one active, auto-renewal, renewal records

### Automation and AI

- AI recommendations (experimental); automatic backup; testing in CI; cleanup of old files

### Versioning and deprecation policy

- SemVer for the SDK; API prefixes (/api/v1) per version; Deprecation header + sunset; documented migration path

### Privacy and data protection

- Data minimization in logs; never log passwords/tokens
- Encrypted backups; restricted access; GDPR principles (if applicable)

### Style and conventions

- Python: black/isort; TypeScript: ESLint/Prettier
- Commit messages: Conventional Commits (feat/fix/chore/docs/refactor/test/build)

---

## 7. Appendix

### Environment matrix

- Dev: local DB/Docker, debug logging, seed data
- Staging: a copy of production with anonymized data
- Prod: scalable environment, backup and monitoring enabled

### Error catalog

- AUTH_INVALID_CREDENTIALS (401)
- AUTH_INVALID_TOKEN (401)
- RESOURCE_NOT_FOUND (404)
- VALIDATION_ERROR (422)
- CONFLICT (409)
- RATE_LIMITED (429)
- SERVER_ERROR (500)

### API route mapping

- Users: `/api/v1/korisnici` (register, login, me, update, suspend)
- Songs: `/api/v1/pjesme` (CRUD, upload, search, recommend)
- Albums: `/api/v1/albumi` (CRUD)
- Playlists: `/api/v1/playliste` (CRUD, ordering)
- Comments: `/api/v1/komentari` (CRUD)
- Statistics: `/api/v1/statistika` (top-songs, top-artists, charts)
- History: `/api/v1/historija` (list, add, delete)
- Subscriptions: `/api/v1/korisnik_pretplata`, `/api/v1/obnove_pretplate`
- QR: `/api/v1/qr` (generate, validate)

### .env variable reference (summary)

- Backend:
  - DATABASE_URL_ASYNC, DATABASE_URL_SYNC
  - FIREBASE_BUCKET_NAME
  - ALLOWED_ORIGINS (CSV)
  - MAX_UPLOAD_MB_AUDIO, MAX_UPLOAD_MB_IMAGE
  - RATE_LIMIT_PER_MINUTE, SECURITY_HEADERS_ENABLED
- Frontend (Vite):
  - VITE_API_URL
  - VITE_I18N_DEFAULT_LANG (bs|en|de)
- Mobile (Expo):
  - EXPO_PUBLIC_API_URL
  - EXPO_PUBLIC_FEATURE_OFFLINE=true|false

### Security header examples

Recommended headers (for production):
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

- CORS error: check ALLOWED_ORIGINS, the protocol (https) and the OPTIONS preflight
- Upload rejected: size/MIME; MAX_UPLOAD_MB_* and validators
- Offline not working (mobile): permissions, `expo-file-system`, clear the cache
- 500 on /api/*: backend logs (traceId), database connection, `alembic upgrade head`
- Push not arriving: FCM token/permission; reinstall + re-registration
- JWT 401: expired token; refresh or re-login; clock drift
- Empty lists: limit/offset/sort; database indexes
- 206/seek not working: Range/Content-Range/Content-Length and Accept-Ranges
- Player stops in the background (mobile): background audio permissions and cleanup hooks
- Deep link does not open a screen: scheme in `app.config.js` and link format (e.g. `decibel://pjesma/123`)
- i18n not loading (mobile): `locales/` and initialization in `i18n.ts`
- PWA not caching: validate the service worker and cache strategy
- Rate limited (429): reduce the frequency; check RATE_LIMIT_PER_MINUTE

---

## 9. References

- FastAPI, SQLAlchemy, React, React Native, Expo, TypeScript, Vite, Firebase Storage
- Vercel, Koyeb, EAS, Chart.js, React Hook Form, React Query, Jest, RTL, Cypress

## 10. Changelog

- 2025-08
  - Added Quick start (local development)
  - Expanded operational endpoints (/openapi.json, /redoc)
  - Documented the Expo Router structure (mobile)
  - Clarified the request-id/traceId pattern in logs
  - Updated the environments section with concrete .env examples
  - Added GitHub Actions CI examples, security headers and an expanded Troubleshooting section

## 11. FAQ

- Q: What is the API base URL in the local environment?
  - A: http://localhost:8000
- Q: Where do I change the API URL for the web app?
  - A: In `frontend/.env` through `VITE_API_URL`.
- Q: How do I refresh migrations?
  - A: `alembic revision --autogenerate -m "description" && alembic upgrade head`.
- Q: How do I enable offline mode on mobile?
  - A: `EXPO_PUBLIC_FEATURE_OFFLINE=true` and use the Offline screen; files are stored in `FileSystem.documentDirectory`.
- Q: How do I enable security headers?
  - A: Set `SECURITY_HEADERS_ENABLED=true` and configure the proxy/server (Nginx/Cloudflare) according to the recommendations in the Appendix.

---

## 12. Technical, file-by-file overview (detailed)

### backend/main.py (entry point)

- Loads `.env` variables, creates the async engine for SQLAlchemy, connects the `databases.Database` object (in `servisi/Baza.py`) and starts background tasks:
  - `check_and_update_suspended_users()` — periodically checks suspended users and restores their status once the time has expired.
  - `keep_alive()` — sends periodic HTTP GET requests to `KEEP_ALIVE_URL` (useful for hosting platforms that idle).
  - `auto_cleanup()` — deletes temporary files in `/tmp` (the Python code runs on Linux-like environments; you can adapt it for Windows dev if needed).
- In the `startup` event it also checks the Discord token and optionally starts the Discord bot in the same process if `RUN_DISCORD_IN_PROCESS=true`.

Testing locally:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Check `http://localhost:8000/docs` for Swagger.

### backend/servisi/Baza.py

- Central database initialization (SQLAlchemy `Base`, the `database` object for the `databases` lib, `create_tables()`/`delete_tables()` helper functions). This is where you maintain global DB helper functions and the reuse pattern.

Error tracking: If you get an exception while importing the DB, check `DATABASE_URL_ASYNC` and whether all dependencies are installed (`aiomysql`, `PyMySQL`, `SQLAlchemy`).

### backend/modeli/*

This is where the ORM classes and the corresponding Pydantic models live. Key files reviewed:

- `Korisnik.py` — `KorisnikORM` (SQLAlchemy) and the Pydantic models `KorisnikCreate`, `Korisnik`, `KorisnikLogin`. Contains the fields: `id`, `ime`, `prezime`, `korisnicko_ime`, `email`, `lozinka`, `rola`, `bio`, `statusKorisnika`, `putanjaProfilneSlike`, `datumRegistracije`, `brojPratilaca`, `obrisan`.
  - Note: the password is stored as a `String` in the model — the actual password hashing should be done in the controller (in `register_korisnik`) using `passlib`.
- `Pjesma.py` — `PjesmaORM` with the fields `id`, `korisnikID`, `albumID`, `naziv`, `opis`, `datumObjave`, `trajanjeSekunde`, `javno`, `odobreno`, `putanjaAudio`, `putanjaSlika`, `putanjaGif`, `brojReprodukcija`, `brojLajkova`, `jezikPjesme`, `licenca`, `eksplicitniSadrzaj`, `zanr`. Contains relationships to `KorisnikORM` and `AlbumORM`.
  - Pydantic models: `PjesmaBase`, `PjesmaCreate`, `Pjesma` (orm_mode=true).

Tip: always use `orm_mode = True` in Pydantic models that are returned from the DB.

### backend/kontroleri/*

Controllers contain the business logic and transactional calls to the DB. A brief overview:

- `PjesmaKontroler.py` — functions: `get_all_pjesme`, `get_pjesma_by_id`, `create_pjesma`, `update_pjesma`, `delete_pjesma`.
  - `create_pjesma` creates a `PjesmaORM` with `pjesma.dict()` and performs a commit + refresh.
  - `get_all_pjesme` uses `selectinload(PjesmaORM.korisnik)` to avoid the N+1 problem.

- `KorisnikKontroler.py` — contains `get_all_korisnici`, `register_korisnik`, `login_korisnik`, `get_korisnik_by_id`, `update_korisnik`, `delete_korisnik`. `register_korisnik` should hash the password and set the initial values (registration date, status, role).

Transaction tip: in an async environment, use the `async with AsyncSession()` pattern and roll back on exceptions.

### backend/rute/*

Every router in `rute/` maps HTTP endpoints to controllers. Important examples:

- `PjesmaRuta.py`
  - GET `/api/pjesme/` — returns all songs (uses `get_all_pjesme`).
  - GET `/api/pjesme/{pjesma_id}` — returns a song by id.
  - GET `/api/pjesme/pjesma/search?q=` — used by the Discord bot for autocomplete; returns songs that are `javno` and `odobreno` and that contain `q` in `naziv`.
  - POST `/api/pjesme/` — multipart endpoint that accepts audio/images/gif; temporarily saves the `UploadFile` to a temp file, calls `servisi.FirebaseStorage.upload_file()` and deletes the temp file.

- `KorisnikRuta.py`
  - POST `/api/korisnici/register` — registers a user (calls `register_korisnik`).
  - POST `/api/korisnici/login` — verifies credentials (calls `login_korisnik`).
  - PUT `/api/korisnici/slika/{korisnik_id}` — uploads a profile image and updates the path on the user.

Test examples (cURL) for song upload:
```bash
curl -X POST "http://localhost:8000/api/pjesme/" \
  -F "korisnikID=<korisnik-id>" \
  -F "naziv=Test" \
  -F "datumObjave=2025-01-01" \
  -F "trajanjeSekunde=120" \
  -F "file_audio=@/path/to/song.mp3"
```

### backend/servisi/FirebaseStorage.py

- Implements `upload_file(local_path, remote_path)`, which uses `firebase-admin` to upload to the bucket and returns a public/signed URL. Uses the `FIREBASE_BUCKET` env var.

Note: for local development you must have `google-services.json` or a service account key set up and configured.

### discordBot / backend/servisi/DiscordBot.py

This is the most important file related to the `/play` command. Contents and behavior:

- Registers slash commands in `setup_hook()` and uses `app_commands.CommandTree`.
- The `play` command does the following:
  - If `DISABLE_VOICE=true` it returns a message that voice is disabled (useful for Render/hosts that block UDP).
  - Checks whether the user is in a voice channel.
  - Attempts `channel.connect()` (has a timeout and reconnect=True). If `ConnectionClosed` or a similar error occurs, the bot informs the user that the hosting environment does not support voice.
  - Calls the backend `/api/pjesme/pjesma/search?q=` to get `putanjaAudio` and metadata.
  - Playback is done using `discord.FFmpegPCMAudio(url)`.
  - The embed message is periodically updated (progress bar). A `View` with buttons (pause/skip/stop) is also implemented.

Why `/play` often does not work on Render/Vercel/Koyeb in this project:
- Discord voice uses UDP; most serverless / managed PaaS services block or do not support outbound UDP from the application (or have a limited implementation). This leads to `ConnectionClosed` or an inability to establish the voice channel.

Recommended ways to make `play` work:
1) Host the Discord bot on a VPS/VM (DigitalOcean, Linode, Hetzner, AWS EC2, GCP) where outbound UDP and internet access are not restricted.
   - OS: Ubuntu 22.04+ or Debian
   - Install `ffmpeg` (required for `FFmpegPCMAudio`):
```bash
sudo apt update; sudo apt install -y ffmpeg python3-venv python3-pip
python3 -m venv venv; source venv/bin/activate
pip install -r requirements.txt
python discordBot/main.py
```
2) If you want the backend on Render, keep the backend there and run the Discord bot separately on a VPS that allows UDP. The bot can communicate with the backend API (`BACKEND_URL`).
3) If you have a limited budget and want a free way to develop, you can run the Discord bot locally on your machine with `DISABLE_VOICE=false` and test `/play` in the local environment.

Specific configurations and checks:
- Set the `DISABLE_VOICE` env var to `false` when you want to enable voice.
- Make sure the `TOKEN` env var contains a valid bot token (and that the bot has been invited to the guild with the required privileges: CONNECT, SPEAK, USE_APPLICATION_COMMANDS).
- Make sure `FFmpeg` is installed on the host and available in PATH (try `ffmpeg -version`).

Security note: the Discord token must NOT be in a public repo; use a platform secret store.

### frontend/src (overview)

- `src/api` — Axios instance with `baseURL` from `VITE_API_URL`.
- `src/components` — UI components: song cards, player, playlist component.
- `src/hooks` — custom hooks for fetching, player state, i18n.

Key practices:
- The web player uses HTMLAudioElement or a custom audio engine that requests `putanjaAudio` and supports Range headers for seeking.
- Use lazy loading and `React Query` caching for lists.

Build/Run:
```bash
cd frontend
npm ci
npm run dev
```

For production:
```bash
npm run build
serve -s dist
```

### mobilnaAPP (overview)

- `app/` uses Expo Router; `komponente/` contains the player controls and UI.
- Uses `expo-av` to play audio files and `expo-file-system` for caching.

Test:
```bash
cd mobilnaAPP
npm ci
npx expo start
```

### desktop (overview)

- `main.js` and `preload.js` suggest an Electron-based desktop client. The desktop client can use the same API endpoints as web/mobile.

### baza/ SQL scripts

- Contain utility SQL queries for playlist ordering, statistics, etc. Useful when debugging and migrating.

### Deployment recommendations and checklist (brief)

1. Backend:
   - Secrets in a Secret Manager (Koyeb/Vercel/Heroku/GCP Secrets)
   - `alembic upgrade head` before starting
   - Health check endpoint for the platform

2. Frontend:
   - Vercel or Netlify
   - Set `VITE_API_URL` in env

3. Discord bot:
   - Host on a VPS/VM because of UDP
   - Install `ffmpeg`
   - Ensure the bot has privileges in the Discord guild: CONNECT, SPEAK, USE_APPLICATION_COMMANDS

4. Mobile:
   - Expo/EAS build; set `EXPO_PUBLIC_API_URL`


---

## 13. Frontend — file-level reference

This section gives a technical overview of the key files in `frontend/src` and explains the responsibilities, input/output and behavior of the more important components and pages.

- `src/main.tsx`
  - Initializes the React application, registers `QueryClientProvider` (React Query) and loads `App`.

- `src/App.tsx`
  - Main router and layout. Contains the `RequireAuth` wrapper that checks the user session, suspended/deleted statuses, and the central `AudioPlayer` mounting.
  - Registers routes for all main pages: Home, Login, Register, Song, Album, Playlist, AdminPanel, Statistics, etc.
  - Global event bus: listening to and emitting CustomEvents (`globalAudioPlay`, `globalAudioPlaylist`, `activeSongBg`) that synchronize the player and background effects.

- `src/api/*`
  - Central Axios client that uses `VITE_API_BASE_URL`/`VITE_API_URL`. Contains interceptors for auth header injection and global error mapping.
  - Typed wrappers for calls to backend endpoints (songs, users, playlists, stats).

- `src/komponente/AudioPlayer/*`
  - Implementation of the web audio player. Responsibilities: play/pause/seek, UI (mini and expanded), progress bar, emitting the `globalAudioPlay` event.
  - Integration with the backend for incrementing the play count and displaying metadata (putanjaSlika/putanjaGif).

- `src/komponente/Header`, `Sidebar`, `Footer`
  - Navigation, search input, profile menu and subscription status display.

- `src/stranice/Pjesma/Pjesma.tsx` (+ `Pjesma.module.css`, `PjesmaWhite.module.css`)
  - Page for the details of a single song: metadata, comment section, playback control and embed information.
  - Loads the song via GET `/api/pjesme/{id}` and displays the related fields (naziv, izvođač, trajanje, putanjaSlika/Gif).

- `src/stranice/Playlista/Playlista.tsx` (+ CSS)
  - Playlist page: song list, reordering (drag/drop in the UI), play/queue functionality.
  - Calls: GET playlist, POST/PUT for reordering and adding/removing songs.

- `src/stranice/SvePjesme/SvePjesme.tsx` (+ CSS)
  - List of all songs with search (`/api/pjesme/pjesma/search?q=`) and pagination.
  - Actions: play, add-to-playlist, like, edit (role-based).

- `src/stranice/SviKorisnici/SviKorisnici.tsx` (+ CSS)
  - Admin user list: suspend, change role, deactivate/reactivate. Calls user endpoints (`/api/korisnici`).

- `src/stranice/Postavke/Postavke.tsx` (+ CSS)
  - User settings, profile image upload (multipart POST), update preferences.
  - In the code it uses `import.meta.env.VITE_API_BASE_URL` to build URLs during upload.

- `src/stranice/Pretplata/Pretplata.tsx`
  - Displays subscription options, checkout or starting the subscription renewal process.

- `src/stranice/Statistika/Statisitka.tsx`
  - Dashboards and charts (Chart.js). Displays top lists and time series; uses the backend statistics endpoints.

- CSS module pattern
  - Every page uses a CSS Module (`.module.css` and `*White.module.css`) for the dark/light theme variant. This convention makes theming easier and isolates styles per component.

Additional notes:
- All forms and upload endpoints use `multipart/form-data` (the frontend sends `FormData`).
- Global authentication is stored in `localStorage` (key `korisnik`) and `RequireAuth` checks the user status on every route.

---

## 14. Mobile application — file-level reference (detailed)

This section documents the more important files from `mobilnaAPP/` (screens, components, hooks, config, context, types).

- `app/` (Expo Router)
  - The route structure maps directly to the filesystem (e.g. `app/pjesma/[pjesmaId].tsx` opens the `Pjesma` screen). The tab layout is defined in `app/(tabs)/_layout.tsx` along with the individual tab pages (`index.tsx`, `library.tsx`, `search.tsx`).

- Screens (in the `screens/` folder)
  - `Home.tsx` — home screen: recommended lists, top songs, promotional content. Emits an event for the global player when the user presses play.
  - `Biblioteka.tsx` — user library (followed artists, downloaded songs, playlists).
  - `Pjesma.tsx` — song details: comments, playback context, similar songs.
  - `Playlista.tsx` — playlist display, editing, playback controls.
  - `AdminPanel.tsx` — mobile admin interface (songs/albums/playlists tabs) with moderation actions.
  - `NovaPjesma.tsx`, `NoviAlbum.tsx`, `NovaPlaylista.tsx` — upload/creation workflow (file pickers + multipart upload).
  - `Offline.tsx` — manager of downloaded files and cleanup UI.

- Components
  - `AudioPlayer.tsx` / `AudioPlayerNew.tsx` — mobile audio player (expo-av). Supports rate options, background playback, resumes.
  - `Header.tsx`, `Sidebar.tsx`, `Tabs.tsx` — navigation and layout components for the application.

- Hooks
  - `useScreenCleanup.ts` — hook that clears query cache keys and removes event listeners when a screen unmounts.
  - `usePushNotifications.ts` — initialization of FCM / Expo notifications and token handling.
  - `handleBackPress.ts` — helper logic for the Android back button and custom navigation history.

- Context
  - `AudioContext.tsx` — central context that shares the current player state (current track, isPlaying, position) and exposes methods (play, pause, seek, download).

- Config
  - `config/api.ts` — `API_BASE` setup for the mobile app; takes `EXPO_PUBLIC_API_BASE_URL` from env and applies a fallback.
  - `config/queryClient.ts` — central initialization of the React Query client and default options (stale time, retry policy).

- Types
  - The `types/` folder contains interfaces for `pjesma`, `playlista`, `korisnik`, `pretplata` and other entities; they are used across screens and components for strong typing.

- Locales
  - `locales/bs|en|de/translation.json` — used by i18next; the strings are already translated for the UI.

Specific behaviors and integrations:
- File downloads: `expo-file-system` + AsyncStorage for metadata; LRU logic implemented (cache size limit configurable via env or a constant in the app config).
- Background playback: `expo-av` config and the application setup in `app.json` / the EAS build profile require the correct permissions and capabilities for iOS/Android.

CI / build:
- Locally: `npx expo start` for development.
- EAS: `eas build --platform android|ios` (use the preview/profile defined in `eas.json`).

---
