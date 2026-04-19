# OMG PAREA Platform — Phase 1

Custom learning platform for the **OMG PAREA** residential appraiser training program. Launches at **app.omgparea.com**. The public marketing site (omgparea.com) stays on Wix and links over here for login.

**Phase 1 scope:** foundation only — React + Express + PostgreSQL, authentication, role-based dashboards, sequential gating (20 gates per student), per-student module toggle, multi-tenant-ready schema. Exercise content, video players, file uploads, VR embeds, and e-signature come in Phase 2–4.

---

## Architecture

```
omgparea/
├── server/          # Express API (Node 20+), Postgres via pg
│   └── src/
│       ├── schema.sql         # Multi-tenant schema, 20-gate structure
│       ├── db.js              # Pool + init runner
│       ├── seed.js            # Org + modules + demo users + 20 gates each
│       ├── auth.js            # JWT sign/verify + role guard
│       ├── index.js           # Express entry; serves React build in prod
│       └── routes/
│           ├── auth.js        # POST /login, GET /me
│           ├── students.js    # GET /students/me/dashboard
│           └── admin.js       # Roster, detail, gate unlock, module toggle
├── client/          # React (Vite) SPA
│   └── src/
│       ├── main.jsx
│       └── App.jsx            # Login + student + admin dashboards
├── package.json     # Root orchestrator (concurrently)
└── railway.json     # Railway deploy config
```

### Multi-tenant from day one

Every row in `users`, `gates`, `progress`, and `student_module_access` carries an `organization_id`. Today there's one row in `organizations` (`OMG PAREA`). When you're ready to white-label the program to other firms, you add more organizations and build the super-admin tools — no schema migration required.

### The 20-gate structure

| Module | Gates | Notes |
|---|---|---|
| M1: Welcome & Orientation | 1 | Module-level gate |
| M2: Exercises | 11 | One gate per section (Problem ID, Scope of Work, Comparable Selection, Adjustment, Locational, Market, HBU, Income, Cost, Reconciliation, Narrative) |
| M3: Report Writing | 1 | |
| M4: Assignments 1–3 | 1 | |
| M5: Assignments 4–6 | 1 | |
| M6: Assignments 7–9 | 1 | |
| M7: Business Basics | 1 | |
| M8: Assignments 10–12 | 1 | |
| M9: Advanced Business | 1 | Final gate |
| **Total** | **20** | |

Sequential gating is enforced **server-side** in `routes/students.js`. The client just renders what the API says is accessible.

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (or a free Railway/Render dev database)

### First-time setup

```bash
# 1. Install all workspaces
npm run install:all

# 2. Create a Postgres database
createdb omgparea

# 3. Copy env template and fill in
cp .env.example .env          # if not present, use the template in this README
# Edit .env — set PGUSER, PGPASSWORD, JWT_SECRET

# 4. Initialize schema + seed demo data
npm run db:seed               # This drops + recreates tables, then seeds

# 5. Start dev servers (API on :3001, client on :5173)
npm run dev
```

Open **http://localhost:5173**.

### Environment variables

Create `.env` at the project root (or in `server/`):

```
# Database — use DATABASE_URL OR the individual PG* vars
DATABASE_URL=postgresql://user:password@host:5432/omgparea
# DATABASE_SSL=true    # set in production

# JWT
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES=7d

# API
PORT=3001
NODE_ENV=development
```

### Demo credentials

After `npm run db:seed`:

| Role | Username | Password |
|---|---|---|
| Admin/Mentor | `admin` | `admin123` |
| Student | `jsmith` | `student123` |
| Student | `agarcia` | `student123` |
| Student | `kwilson` | `student123` |

`jsmith` has Module 1 pre-unlocked so you can immediately see sequential gating in action — Module 2 Section 1 appears as "Awaiting mentor check-in" while later modules show "Prerequisite locked".

---

## Testing the Gating End-to-End

1. Log in as **`jsmith`** — you'll see Module 1 as Unlocked, Module 2 Section 1 as "Awaiting mentor check-in", and everything after as "Prerequisite locked".
2. Log out. Log in as **`admin`**.
3. Click `jsmith` in the roster.
4. On Module 2, click **Unlock** next to Section 1 (Problem Identification).
5. Toggle Module 7 (Business Basics) **off** to simulate an in-house hire who skips business content.
6. Log out. Log in as **`jsmith`** again.
7. Module 2 Section 1 is now Unlocked, Section 2 is "Awaiting mentor check-in", and Module 7 is **gone from the dashboard entirely** (not grayed — gone). Module 9 still appears because it's independently toggled.

---

## Deployment to Railway

1. **Push this repo to GitHub.**
2. In Railway: **New Project → Deploy from GitHub** → pick this repo.
3. Add a **PostgreSQL plugin** to the project. Railway automatically exposes `DATABASE_URL`.
4. Under the service's **Variables**, add:
   - `JWT_SECRET` — a long random string (e.g. `openssl rand -hex 32`)
   - `NODE_ENV` = `production`
   - `DATABASE_SSL` = `true`
5. Railway reads `railway.json` and will:
   - Install all workspaces
   - Build the React client to `client/dist/`
   - Run `db:init` (creates schema — safe because the SQL uses `DROP TABLE IF EXISTS`, so it's a clean install on first deploy but **will wipe data on every deploy** until you switch to migrations)
   - Start Express, which serves the API and the React build
6. **Seed the database manually once** after first deploy: in the Railway service shell, run `node server/src/seed.js`.
7. In Railway: **Settings → Networking → Generate Domain**, then add a custom domain `app.omgparea.com` and point the CNAME from your DNS.
8. On Wix (omgparea.com), change the **Log In** button to link to `https://app.omgparea.com`.

### ⚠️ Before you go live with real students

Replace the `db:init` build step with a real migration tool (e.g. [node-pg-migrate](https://www.npmjs.com/package/node-pg-migrate) or Prisma Migrate). The current setup is fine for Phase 1 iteration but will wipe data on every deploy because `schema.sql` uses `DROP TABLE IF EXISTS`. Phase 2 should swap this out — I'll flag it again when we get there.

### Deployment to Render (alternative)

Similar process. Create a **Web Service** pointing at this repo with:
- Build command: `npm run install:all && npm --prefix client run build`
- Start command: `npm --prefix server start`
- Add a Render PostgreSQL database, copy the `Internal Database URL` into `DATABASE_URL`.
- Health check path: `/api/health`

---

## What's NOT in Phase 1 (by design)

- Exercise content (the 11 Module 2 sections and 420 scenarios already built as separate artifacts)
- Video player with completion tracking
- PDF upload / file storage
- RealNex QuickTours VR iframe embedding
- E-signature capture (typed name → signature font → stored with IP/timestamp)
- Time tracking UI (schema column exists, tracking logic is Phase 2)
- Super Admin / white-label management screens
- CSV export
- Email notifications

These are Phase 2–4. Phase 1 proves the foundation works end-to-end.

---

## File inventory (16 files)

| # | Path | Purpose |
|---|---|---|
| 1 | `package.json` | Root monorepo orchestrator |
| 2 | `.gitignore` | Standard Node ignores |
| 3 | `railway.json` | Railway deploy config |
| 4 | `README.md` | This file |
| 5 | `server/package.json` | Server deps |
| 6 | `server/src/schema.sql` | Multi-tenant schema |
| 7 | `server/src/db.js` | Postgres pool + init |
| 8 | `server/src/seed.js` | Seed data + 20 gates |
| 9 | `server/src/auth.js` | JWT + role guard |
| 10 | `server/src/index.js` | Express entry |
| 11 | `server/src/routes/auth.js` | Login + /me |
| 12 | `server/src/routes/students.js` | Student dashboard |
| 13 | `server/src/routes/admin.js` | Admin endpoints |
| 14 | `client/package.json` | Client deps |
| 15 | `client/vite.config.js` | Vite + /api proxy |
| 16 | `client/index.html` | HTML entry |
| 17 | `client/src/main.jsx` | React entry |
| 18 | `client/src/App.jsx` | Full UI |
