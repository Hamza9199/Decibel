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
4. [Frontend](#frontend)
   - [Tehnologije](#tehnologije-frontenda)
   - [Struktura direktorijuma](#struktura-direktorijuma-frontend)
   - [Prikaz podataka](#prikaz-podataka)
5. [Deploy](#deploy)
6. [Dodatno](#dodatno)
7. [Reference](#reference)

---

## 1. Uvod

Decibel je web aplikacija za upravljanje i prikaz muzičkih pjesama, korisnika i multimedijalnih sadržaja. Projekat je razvijen kao diplomski rad i koristi moderne tehnologije za backend i frontend deo.

---

## 2. Arhitektura

Aplikacija je podeljena na dva glavna dela:
- **Backend**: FastAPI (Python), MySQL (Aiven Cloud), Firebase Storage
- **Frontend**: React (TypeScript), Vite

Komunikacija između frontenda i backenda se odvija putem REST API-ja.

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
│   ├── KorisnikRole.py
│   ├── Pjesma.py
│   ├── PjesmaZanr.py
│   └── __init__.py
├── kontroleri/
│   ├── KorisnikKontroler.py
│   ├── PjesmaKontroler.py
│   └── __init__.py
├── rute/
│   ├── KorisnikRuta.py
│   ├── PjesmaRuta.py
│   └── __init__.py
├── servisi/
│   ├── Baza.py
│   ├── FirebaseStorage.py
│   └── __init__.py
└── ...
```

### Modeli

- **KorisnikORM**: Model korisnika (UUID, ime, prezime, korisničko ime, email, lozinka, rola)
- **PjesmaORM**: Model pjesme (ID, korisnikID, naziv, opis, datum objave, trajanje, putanje do fajlova, zanr, itd.)
- **KorisnikRole**: Enum za rolu korisnika (admin, korisnik, izvodac)
- **PjesmaZanr**: Enum za žanr pjesme (pop, rock, hip_hop, jazz, ...)

### Rute

- `/api/korisnici/` – CRUD operacije nad korisnicima (registracija, login, izmena, brisanje, dohvatanje)
- `/api/pjesme/` – CRUD operacije nad pjesmama (kreiranje, izmena, brisanje, dohvatanje)
- `/api/pjesme/upload` – upload fajlova na Firebase Storage

### Kontroleri

- **KorisnikKontroler.py**: Poslovna logika za korisnike (heširanje lozinki, login, CRUD)
- **PjesmaKontroler.py**: Poslovna logika za pjesme (CRUD)

### Baza podataka

- **MySQL** (Aiven Cloud)
- Konekcioni stringovi su u `.env` fajlu (`DATABASE_URL_ASYNC`, `DATABASE_URL_SYNC`)
- Migracije se rade Alembic-om

### Firebase Storage

- Upload i download fajlova (audio, slike, gif) se radi REST API-jem
- Linkovi do fajlova se čuvaju u bazi i šalju frontendu

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

---

## 4. Frontend

### Tehnologije frontenda

- **React** (TypeScript)
- **Vite** – alat za razvoj i build
- **CSS Modules** – stilizacija

### Struktura direktorijuma (frontend)

```
frontend/
│
├── src/
│   ├── App.tsx
│   ├── stranice/
│   │   └── Home/
│   │       ├── Home.tsx
│   │       └── Home.module.css
│   └── komponente/
│       ├── Header/
│       │   ├── Header.tsx
│       │   └── Header.module.css
│       └── Footer/
│           ├── Footer.tsx
│           └── Footer.module.css
└── ...
```

### Prikaz podataka

- Prikaz liste pjesama sa slikom, nazivom, opisom i play dugmetom (Spotify stil)
- Globalni audio player
- Responsive dizajn

---

## 5. Deploy

- Backend možeš deployovati na Deta Space, Koyeb, Railway, Render, Fly.io, Heroku, Google Cloud Run, itd.
- Frontend možeš deployovati na Vercel, Netlify, ili slične servise.

---

## 6. Dodatno

- CORS je omogućen za frontend-backend komunikaciju.
- Svi poverljivi podaci (konekcioni stringovi, API ključevi) su u `.env` fajlu.
- Za produkciju ograniči CORS i pravila Firebase Storage-a.

---

## 7. Reference

- [FastAPI dokumentacija](https://fastapi.tiangolo.com/)
- [SQLAlchemy dokumentacija](https://docs.sqlalchemy.org/)
- [Alembic dokumentacija](https://alembic.sqlalchemy.org/)
- [Firebase Storage REST API](https://firebase.google.com/docs/storage)
- [React dokumentacija](https://react.dev/)
- [Vite dokumentacija](https://vitejs.dev/)

---

*Ova dokumentacija je osnova i biće proširivana tokom razvoja projekta.*
