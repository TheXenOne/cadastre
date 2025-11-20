## Cadastre Dev Commands Cheat Sheet

Keep this file around (e.g., `DEV_COMMANDS.md`) for quick reference.

---

### 0) One‑time setup commands (already done)

**Install Prisma + client** (once per project)
```bash
npm i @prisma/client
npm i -D prisma
npx prisma init
```

**Install Postgres adapter stuff (Prisma v7)** (once per project)
```bash
npm i pg
npm i @prisma/adapter-pg
npm i -D @types/pg
```

**Install tsx (to run TS scripts)** (once per project)
```bash
npm i -D tsx
```

---

### 1) Docker / Postgres commands

**Create + start Postgres container** (first time only)
```powershell
docker run --name cadastre-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=cadastre -p 5432:5432 -d postgres:16
```

**Stop Postgres** (when you’re done for the day)
```bash
docker stop cadastre-postgres
```

**Start Postgres again** (start of a dev session if it’s stopped)
```bash
docker start cadastre-postgres
```

**Check container status** (if unsure whether it’s running)
```bash
docker ps
docker ps -a
```

---

### 2) Prisma commands

**Generate Prisma Client**
Run whenever you change `schema.prisma` or VS Code doesn’t see new models.
```bash
npx prisma generate
```

**Create/apply migrations**
Run whenever you add/change models in `schema.prisma`.
```bash
npx prisma migrate dev --name <meaningful_name>
```
Examples we used:
```bash
npx prisma migrate dev --name init
npx prisma migrate dev --name add_raw_ppd
```

**Open Prisma Studio** (inspect DB contents)
```bash
npx prisma studio
```

---

### 3) Seeding / ingest scripts

**Seed fake properties into DB**
Run when you want to load/reset demo properties.
```bash
npx tsx prisma/seed.ts
```

**Ingest raw Price Paid CSVs**
Run after adding new `.csv` files into `data/raw/ppd/`.
Safe to re‑run (duplicates skipped).
```bash
npx tsx prisma/ingest_ppd.ts
```

---

### 4) Fixing common editor/tooling hiccups

**Restart TypeScript server (VS Code)**
Use when Prisma types don’t update after `generate`.
- VS Code → `Ctrl+Shift+P` → **TypeScript: Restart TS server**

**Audit warnings** (optional)
```bash
npm audit
npm audit fix
npm audit --omit=dev
```
(We avoided `npm audit fix --force`.)

---

### 5) Your normal dev loop

**Start of session**
1. Start Postgres if needed:
   ```bash
   docker start cadastre-postgres
   ```
2. Run Next dev server:
   ```bash
   npm run dev
   ```

**If you change Prisma schema**
1. Migration:
   ```bash
   npx prisma migrate dev --name <name>
   ```
2. Generate:
   ```bash
   npx prisma generate
   ```

**If data looks wrong / empty**
1. Re‑seed demo properties:
   ```bash
   npx tsx prisma/seed.ts
   ```
2. Re‑ingest PPD:
   ```bash
   npx tsx prisma/ingest_ppd_2025.ts
   ```

**End of session (optional)**
```bash
docker stop cadastre-postgres
```

