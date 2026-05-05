# OMG PAREA Platform — Claude Code Project Guide

> This file is loaded into every Claude Code session for this repository. It contains
> the persistent project context, conventions, and workflows. Read it carefully —
> following it produces consistent results across sessions.

---

## 1. About this project

OMG PAREA is a multi-tenant residential appraiser training platform built by Oscar Mike
Appraisal Group (OMAG). The platform delivers the **PAREA** (Practical Applications of
Real Estate Appraisal) program — an alternative pathway to the experience requirement
for residential appraiser licensure under AQB rules.

**This is the application platform**, not the marketing site.
- **Marketing site:** `omgparea.com` — separate, hosted on Wix, not in this repo
- **Application:** `app.omgparea.com` — this repo, hosted on Railway
- The "Log In" button on the Wix site redirects to `app.omgparea.com`

**Key constraint: residential only.** All scenarios, assignments, and content are
residential. Do not generate commercial scenarios — this constraint flows from AQB
program approval and is non-negotiable.

**Live application:** https://app.omgparea.com
**Hosting:** Railway (auto-deploys from `main` branch on GitHub)
**Repository:** https://github.com/paulryll/omgparea-platform

---

## 2. The 4-phase build plan (where we are)

The build was scoped into four phases in the founding brief. Knowing which phase we're
in tells you which work is in scope and which is intentionally deferred.

| Phase | Scope                                                              | Status        |
|-------|-------------------------------------------------------------------|---------------|
| 1     | Framework, database, auth, dashboards, gating system              | ✅ Complete   |
| 2     | Exercise content embedding, answer capture, admin review, video tracking, e-signature | 🟡 In progress — content for Module 2 Sections 1–5 complete; Sections 6–11 plus video tracking and e-signature still to do |
| 3     | Assignments — file download, PDF upload, VR tour embedding, report writing UI | 🔜 Not started |
| 4     | Polish — analytics, CSV export, final testing, production launch  | 🔜 Not started |

**Current focus (Phase 2):** importing remaining Module 2 content (Sections 6–11)
and building the deferred Phase 2 features (e-signature, mandatory video tracking).

Features explicitly deferred to Phase 3 or later (don't build them now unless Paul
asks): PDF upload, VR tour embedding, report writing UI, CSV export, time tracking
dashboards.

---

## 3. Curriculum scope

The full PAREA curriculum has **9 modules** with **20 mandatory progression gates**.
Each gate requires the admin to manually click "Unlock" for that specific student
after a mentor check-in. No skipping ahead — gates are sequential and per-student.

### Two credential tracks

- **Licensed Residential** — completes through 9 appraisal reports (Modules 1–7, 9; skips Module 8)
- **Certified Residential** — completes through 12 appraisal reports (all 9 modules including Module 8)

All scenario content is set in the **Greenville / Spartanburg, SC market** for realism.

### The 9 modules

| Module | Name                       | Description                                                                  |
|--------|---------------------------|------------------------------------------------------------------------------|
| 1      | Welcome & Orientation      | Onboarding videos, software orientation, program agreements requiring e-signature |
| 2      | Exercises                  | 11 sections of interactive residential appraisal exercises (see §4)          |
| 3      | Report Writing             | Report writing instruction + 3 data entry reports (PDF upload required)      |
| 4      | Appraisal Assignments 1–3  | First three full appraisal reports with VR property tours                    |
| 5      | Appraisal Assignments 4–6  | Assignments 4 through 6                                                      |
| 6      | Appraisal Assignments 7–9  | Assignments 7 through 9                                                      |
| 7      | Business Basics            | LLC setup, taxes, marketing fundamentals                                     |
| 8      | Appraisal Assignments 10–12| Assignments 10 through 12 (certified residential track only)                 |
| 9      | Advanced Business          | Advanced business topics building on Module 7                                |

### The 20-gate math

| Module     | Gates | Notes                                                |
|------------|-------|------------------------------------------------------|
| Module 1   | 1     | One gate after orientation                           |
| Module 2   | 11    | One gate per exercise section (Sections 1–11)        |
| Modules 3–9| 8     | One gate per module (Modules 3, 4, 5, 6, 7, 8, 9)    |
| **Total**  | **20**|                                                      |

Each gate is enforced both client-side (UI hides locked content) and server-side
(API rejects requests for locked sections/modules).

### Module-specific feature requirements

| Feature                     | Modules requiring it      | Built? |
|-----------------------------|---------------------------|--------|
| E-signature capture         | 1                         | ❌     |
| Mandatory video completion tracking | 1, 2, 3, 7, 9     | ❌     |
| PDF upload                  | 3, 4, 5, 6, 8             | ❌     |
| VR tour embedding (RealNex) | 4, 5, 6, 8                | ❌     |
| AI-powered rubric grading   | Module 2 Section 11       | ✅     |

### Three gate progression states

The platform has **three gate states** that any work touching gate logic must respect:

| State                     | Meaning                                                          |
|---------------------------|------------------------------------------------------------------|
| `Unlocked`                | Student can access this section/module                          |
| `Awaiting mentor check-in`| Student has completed prerequisite work; mentor must review and click Unlock before next gate opens |
| `Prerequisite locked`     | Earlier gates not yet satisfied — student cannot access         |

The mentor check-in workflow is a distinct step from automated prerequisite gating.
Don't conflate them.

### Per-student module toggle (admin feature)

The admin can **hide or show specific modules per student**. When a module is hidden,
it **completely disappears** from that student's view — not grayed out, not locked,
**gone**. Use case: in-house hires at appraisal firms may already have business
operations covered, so admin toggles Modules 7 and 9 off for those students.

This is implemented at the user-organization level — a `module_visibility` table
(or equivalent) keyed by `(user_id, module_number)` with a boolean. Default is
visible; explicit hide overrides default. Don't break this when changing curriculum
display logic.

---

## 4. Module 2 — the 11 exercise sections

Module 2 is the heart of the platform's interactive content. Each section has the same
**6 categories × 10 scenarios** structure (60 scenarios per section). Each section
also has a **short guide video** that plays before the exercises (video tracking
not yet built — Phase 2 deferred work).

| #  | Section                       | Exercise format                                    | Content status |
|----|-------------------------------|---------------------------------------------------|----------------|
| 1  | Problem Identification        | 9-field text response (the 9 elements — see below) | ✅ Complete (60 scenarios) |
| 2  | Scope of Work                 | Text response                                     | ✅ Complete (60 scenarios) |
| 3  | Comparable Selection & Analysis | 3-step workflow: Screen → Select → Justify → Results | ✅ Complete (60 scenarios) |
| 4  | Adjustment Analysis           | 4-step workflow: Review & Flag → Quantify → Justify → Results | ✅ Complete (60 scenarios) |
| 5  | Locational Influence          | `factor_analysis` field type (see §9)             | ✅ Complete (60 scenarios) |
| 6  | Market Analysis               | TBD                                               | 🔜 Not yet imported |
| 7  | Highest & Best Use            | TBD                                               | 🔜 Not yet imported |
| 8  | Income Approach               | TBD                                               | 🔜 Not yet imported |
| 9  | Cost Approach                 | TBD                                               | 🔜 Not yet imported |
| 10 | Reconciliation                | TBD                                               | 🔜 Not yet imported |
| 11 | Narrative Writing & Reporting | AI rubric evaluation + 120 analysis questions     | 🔜 Not yet imported (AI grading infrastructure built) |

**Each section's exercise format may differ** — don't assume the Section 5
`factor_analysis` shape applies to other sections. When importing a new section,
check the existing source artifacts for that section's format. Sections 1–5 are
already in the codebase and serve as four distinct reference patterns.

**Total Module 2 scenarios loaded as of 2026-05-04:** 300 (5 sections × 60 scenarios).

### The 6 category structure (within every section)

| Code  | Category                  |
|-------|---------------------------|
| C1    | Mortgage Lending          |
| C2    | Litigation Support        |
| C3    | Estate & Tax              |
| C4    | Private / Consulting      |
| C5    | Government & Public Use   |
| C6    | Specialty Situations      |

Within each category, scenarios follow a **2-per-tier difficulty distribution**:

| # | Difficulty    |
|---|---------------|
| 1, 2  | introductory  |
| 3, 4  | basic         |
| 5, 6  | intermediate  |
| 7, 8  | advanced      |
| 9, 10 | expert        |

Categories are coded as `M2-S<section>-C<category>` — e.g. `M2-S5-C3` is "Module 2,
Section 5, Category 3 (Estate & Tax)".

### Section 1 (Problem Identification) — the 9 elements

Section 1 scenarios test the student's ability to identify nine elements of the
appraisal problem. These are baked into the field structure for every Section 1
scenario:

1. Client
2. Intended Users
3. Intended Use
4. Type and Definition of Value
5. Effective Date
6. Property Interest Appraised
7. Scope of Work Considerations
8. Extraordinary Assumptions and Hypothetical Conditions
9. Relevant USPAP Obligations

This 9-element structure is unique to Section 1. Other Module 2 sections have
different field shapes.

### Section 11 (Narrative Writing & Reporting) — AI grading

Section 11 is the most technically complex section in the platform. It uses
**module-specific AI system prompts** to evaluate student narrative writing:

- 6 modules × 10 scenarios = 60 narrative writing scenarios
- 120 analysis questions
- Each module has its own AI rubric tuned to the analytical demands of that module
- AI grading runs via the **Anthropic API** server-side (key stored in Railway env)

Note the naming overload: in Section 11, "module" refers to the **6 categories
within the section** (Mortgage, Litigation, etc.) — *not* to the 9 program modules.
This was an artifact of how the source content was authored. Don't refactor away
without asking Paul.

The AI grading infrastructure is built. The 60 scenarios of Section 11 content
are not yet imported.

---

## 5. About the user

The user is **Paul Ryll** — founder and CEO of Oscar Mike Appraisal Group, a Marine
Corps veteran, certified general appraiser (MRICS, MNAA), and the product owner of
this platform. **Paul is not a coder.** This is the most important fact in this file.

### Communication preferences (must follow)

- **Plain language always.** Do not assume knowledge of git, terminal commands, package
  managers, environment variables, dependency management, build tools, or any other
  developer workflows. Explain them when they come up.
- **Complete files, not patches.** When making changes, replace whole files rather than
  showing diffs or asking the user to "apply this change to line 47." Paul edits via
  the GitHub web UI, not git locally.
- **Step-by-step instructions for every file operation.** Spell out: "Go to GitHub
  → click `server` → click `migrations` → click `Add file` → `Upload files` → drag the
  SQL file in → commit message should be: `<exact text>` → click Commit changes."
- **Direct, honest pushback over validation.** If Paul proposes something that won't
  work, say so plainly with reasoning. He explicitly prefers honest disagreement over
  agreeable nodding.
- **Pair every code delivery with a non-developer deploy walkthrough.** The code
  artifact is half the deliverable. The plain-language instructions for what to do
  with it are the other half.
- **Don't reinvent decisions across sessions.** When this file documents a convention
  or a decision, follow it. Don't propose alternatives unless Paul asks.

### Background context that matters

- Paul has 8 years active-duty Marine Corps service and a U.S. Government Secret
  Security Clearance.
- He holds an MS in Real Estate from Johns Hopkins and a BS Magna Cum Laude.
- He developed OMMA (a Fannie/Freddie-approved AVM platform) and previously founded
  and exited Drake HDD LLC.
- He is technically savvy at the conceptual level (he understands what a database is
  and what migrations do) but has zero hands-on coding experience.

---

## 6. User roles & permissions

There are three user roles in the system. The first two are built; the third is
designed for but not yet built.

| Role          | What they can do                                                  | Status |
|---------------|------------------------------------------------------------------|--------|
| Student       | View their dashboard, work through their current module, submit answers and (eventually) files | ✅ Built |
| Admin/Mentor  | View student roster, review answers and files, unlock gates, toggle modules per student, view analytics | ✅ Built |
| Super Admin   | Manage organizations, branding, white-label instances             | 🔜 Not built |

**Important: every database table that contains user-scoped or organization-scoped
data has an `organization_id` foreign key.** Day one, there is one organization
("OMG PAREA"). The Super Admin UI for managing multiple organizations will be built
in a later phase, but the schema is already multi-tenant. Don't drop or ignore
`organization_id` when adding new tables — it's load-bearing for the white-label
plan.

---

## 7. Tech stack

| Layer         | Choice                                                  |
|---------------|---------------------------------------------------------|
| Backend       | Node.js + Express (ES modules, no TypeScript)          |
| Database      | PostgreSQL (raw SQL via the `pg` package — **no ORM**) |
| Auth          | bcryptjs (password hashing) + JWT (session tokens)      |
| Frontend      | React + Vite                                            |
| Routing       | **In-app navigation state** — no React Router          |
| Styling       | **Inline styles only** — no Tailwind, no CSS framework |
| Deployment    | Railway (auto-deploy on push to `main`)                |
| AI features   | Anthropic API (used in Module 2 Section 11 grading)    |
| Video hosting | Bunny.net or Vimeo planned (domain-restricted embedding) — not yet built |
| VR tours      | RealNex QuickTours (iframe embedding) — not yet built  |

**Important constraints (every one of these is deliberate — don't reverse without
asking Paul):**
- The frontend deliberately avoids React Router — navigation is via component state.
- The frontend deliberately avoids CSS frameworks — all styling is inline JS objects.
- The backend deliberately avoids ORMs — all queries are raw SQL using `pg`.
- **Prisma was originally proposed in the founding brief but abandoned in Phase 1.**
  Don't suggest reintroducing it.
- **No third-party LMS platforms.** This is fully custom-built (this was an explicit
  founding decision — Wix, Moodle, etc. were considered and rejected).

---

## 8. Repository structure

```
omgparea-platform/
├── CLAUDE.md                 ← this file
├── railway.json              ← Railway deploy config (preDeployCommand)
├── server/                   ← Express backend
│   ├── package.json
│   ├── src/
│   │   ├── index.js          ← Express app entry
│   │   ├── migrate.js        ← Hand-rolled migration runner (see §9)
│   │   ├── seed.js           ← Idempotent seed script — skips if data exists
│   │   ├── db.js             ← pg connection pool
│   │   ├── auth.js           ← JWT + bcrypt auth helpers
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── content.js          ← /api/content/* (student-facing)
│   │   │   ├── admin-content.js    ← /api/admin/content/* (admin-facing)
│   │   │   └── ...
│   │   └── content-data/     ← Per-section scenario content data files
│   └── migrations/
│       ├── 001.do.initial-schema.sql
│       ├── 002.do.content-tables.sql
│       ├── 003.do.feedback-columns.sql
│       ├── ...
│       └── NNN.do.description.sql
└── client/                   ← React frontend (Vite)
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx           ← Top-level component, in-app nav state
        ├── ui.jsx            ← Shared brand palette, API client, UI primitives
        ├── content-views.jsx ← SectionView, CategoryView, ScenarioView
        └── ...
```

**Note:** Verify the actual file structure with the file tools before assuming any
specific path exists. The structure above is a guide, not a contract.

### Database tables (high level)

The schema spans these table groups (verify exact names with `\dt` or by reading
the migrations):

- **Identity & multi-tenancy:** `organizations`, `users`, `module_visibility`
- **Curriculum structure:** `module_sections`, `scenario_categories`, `section_fields`
- **Scenario content:** `scenarios`, `model_answers`
- **Student work:** `scenario_submissions`, `scenario_answers`
- **Gating:** `gate_unlocks` (or equivalent — admin manually unlocks per student per gate)
- **Migration tracking:** `schemaversion`

Every content/user table includes `organization_id` for multi-tenancy.

---

## 9. Database & migrations

### Migration system (live as of 2026-05-03)

The platform uses a **hand-rolled migration runner** at `server/src/migrate.js`. This
replaced the previous "drop everything on deploy" pattern in early May 2026. The
migration runner:

1. Reads the `schemaversion` table for already-applied migration versions.
2. Lists files in `server/migrations/` matching `NNN.do.<description>.sql`.
3. Runs any migration whose version is not yet in `schemaversion`, in order.
4. Records each successful run in `schemaversion`.

The runner is invoked automatically on every Railway deploy via `railway.json`'s
`preDeployCommand`. Successful deploy log shows:

```
✓ Database is up to date — N migration(s) on file, all applied.
✓ Database already has 1 organization(s) — skipping seed.
```

### The `schemaversion` table

```sql
CREATE TABLE schemaversion (
  version BIGINT PRIMARY KEY,
  name    TEXT NOT NULL,
  run_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Three columns. **Not** a Postgrator-style table with an `md5` column — that was
removed. If you see Postgrator references anywhere, they are dead code from before
the May 3 cutover.

### Migration file naming convention

`server/migrations/NNN.do.<description>.sql`

- `NNN` — three-digit zero-padded version number, monotonically increasing
- `do` — direction marker (we don't currently use `undo` migrations)
- `<description>` — short kebab-case summary

Examples:
- `001.do.initial-schema.sql`
- `013.do.section5-categories-and-field-type.sql`
- `016.do.section5-c5-c6-bulk-load.sql`

### Migration file conventions (must follow)

1. **Wrap every migration in `BEGIN; ... COMMIT;`** so partial failures roll back
   cleanly. Older migrations may not all have this — newer ones should.
2. **Use `INSERT ... SELECT FROM scenario_categories WHERE code = '...'`** for
   content bulk-loads (rather than hardcoded category IDs). The reference pattern is
   `012.do.section4-c5-c6-bulk-load.sql`.
3. **Idempotency where reasonable** — use `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT
   DO NOTHING`, etc. The migration runner won't re-run a migration, but defensive
   SQL helps if a migration is partially applied and needs to be retried after a fix.
4. **Never include destructive operations** (`DROP TABLE`, `TRUNCATE`, mass `DELETE`)
   in a migration without explicit confirmation from Paul. Once a migration is
   merged and runs, the destruction has happened.
5. **Always include `organization_id` on new tables that hold user-scoped or
   content-scoped data.** Multi-tenancy is load-bearing for the future white-label
   plan.

### Content data shape — Section 5 (Locational Influence) example

For Section 5, each scenario produces two rows:

**`scenarios` row:**
- `category_id` (FK to scenario_categories)
- `order_index` (1–10)
- `difficulty` ('introductory' / 'basic' / 'intermediate' / 'advanced' / 'expert')
- `title` (descriptive, e.g. "318 Patriot Way, Simpsonville — VA Purchase, Cul-de-Sac
  Compliant Profile")
- `scenario_text` (the assignment brief)

**`model_answers` row** with two JSONB fields:
- `field_options_override`: `{ subject: { context_label, context_text, address_summary,
  subject_summary }, location_profile: [...], factors: [{id, label}], classification_options:
  [...], min_rationale_chars: 20, teaching_points: [...] }`
- `model_data`: `{ factors: { factorId: { present: bool, classification?, rationale? } } }`

Factor IDs are sequential letters (A, B, C, ...) preserved verbatim from the source
content artifacts. Section 5 categories use the field type `factor_analysis` and the
section-level defaults are:

```
classification_options = ['Positive','Negative','Neutral','Market-Dependent']
min_rationale_chars    = 20
```

These defaults are repeated explicitly in each `field_options_override` for
self-describing scenario rows.

**Other sections use different field shapes.** Section 1 has 9 text-response fields
(the 9 elements). Section 3 uses a 3-step workflow with comparable selection. Section
4 uses a 4-step adjustment grid. Don't assume Section 5's shape transfers — verify
the source artifact format when importing a new section.

### Verification queries (use these to confirm a deploy succeeded)

```sql
-- Migration tracker — confirm latest migration ran
SELECT version, name, run_at FROM schemaversion ORDER BY version DESC LIMIT 5;

-- Section 5 scenario counts (should be 10 per category, 60 total)
SELECT sc.code, COUNT(s.id) AS scenarios, COUNT(ma.id) AS model_answers
  FROM scenario_categories sc
  LEFT JOIN scenarios s ON s.category_id = sc.id
  LEFT JOIN model_answers ma ON ma.scenario_id = s.id
  WHERE sc.code LIKE 'M2-S5-%'
  GROUP BY sc.code
  ORDER BY sc.code;

-- Specific category count
SELECT COUNT(*) FROM scenarios s
  JOIN scenario_categories sc ON sc.id = s.category_id
  WHERE sc.code = 'M2-S5-C5';
```

---

## 10. Deploy workflow (Paul's workflow — describe in these terms)

Paul does not work locally. Every change is committed via the GitHub web UI and
Railway picks it up automatically. The standard flow for a SQL migration:

1. **Download** the SQL file from the chat (it's a `present_files` link).
2. **Open GitHub** at `https://github.com/paulryll/omgparea-platform`.
3. **Navigate** into the `server` folder, then `migrations`.
4. **Click** `Add file` → `Upload files`.
5. **Drag** the downloaded SQL file into the upload zone.
6. **Commit message format:** `Add migration NNN — <description>` (e.g. "Add migration
   016 — Section 5 C5 + C6 bulk load (20 scenarios)").
7. **Click** `Commit changes`.
8. **Watch Railway** at the dashboard. The deploy auto-triggers and turns green when
   successful. If you see red, click into the deploy and read the logs — the most
   common failure is a SQL syntax issue caught by the migration runner before any
   damage is done.
9. **Verify** with the queries in §9 above. Run them in Railway's database query
   console.

For non-SQL changes (e.g. updating a React component), the flow is the same except
the file goes into `client/src/` or wherever appropriate.

---

## 11. Code conventions

### React frontend

- Functional components with hooks. No class components.
- Inline styles as JS objects: `<div style={{padding: '12px', background: '#fff'}}>`.
- Brand palette comes from `client/src/ui.jsx`. Use the named constants there
  (e.g. `OMG_HOT_PINK`, `OMG_BLACK`) rather than hardcoding hex values.
- Navigation is in-app state, not URL-based. `App.jsx` holds a `view` state and
  renders the appropriate component.
- API calls go through the `api` helper in `ui.jsx` (it handles JWT attachment).

### Backend

- ES modules (`import`/`export`, not `require`).
- All database queries use the `pg` package directly. Use `$1, $2, ...` parameterized
  queries — never string-concatenate user input into SQL.
- Routes are organized by feature in `server/src/routes/*.js`.
- Auth middleware checks JWT and sets `req.user`. Use it on all non-public routes.
- The seed script is **idempotent** — it checks for existing data and skips. Do not
  add seed logic that would re-insert demo data on every deploy.
- All queries that return user-scoped data must filter by `req.user.organization_id`
  to enforce multi-tenancy. Don't leak data across organizations.

### Section content data files

Content for a section lives in `server/src/content-data/sectionN-<name>.js`. These
are JS modules that export the scenario data structure. They are imported by seed
or migration scripts that load the data into the database.

The reference pattern was established in Sections 1 and 5. When adding a new section,
mirror the shape of the existing content-data files for **that section's exercise
format** — don't invent a new structure. Sections 1, 3, 4, and 5 each represent
distinct exercise format patterns.

---

## 12. Section 5 specifics (most recent work)

Section 5 (Locational Influence) was loaded across 4 sessions ending 2026-05-04.
The category-specific decisions were:

| Category | Context label         | Brief template emphasis                      |
|----------|----------------------|----------------------------------------------|
| C1       | (no context label)   | Standard mortgage lending                    |
| C2       | "Litigation Context" | Adversarial defensibility                    |
| C3       | "Estate Context"     | Retrospective effective-date discipline      |
| C4       | "Consulting Context" | Investor lens, demand drivers, exit strategy |
| C5       | "Government Context" | Dual-lens market + program compliance        |
| C6       | "Specialty Context"  | Specialty framework first, then factors      |

The four migrations that built Section 5:
- `013.do.section5-categories-and-field-type.sql` — schema (categories + field type)
- `014.do.section5-c1-c2-bulk-load.sql` — Mortgage Lending + Litigation Support
- `015.do.section5-c3-c4-bulk-load.sql` — Estate & Tax + Private/Consulting
- `016.do.section5-c5-c6-bulk-load.sql` — Government + Specialty (completes Section 5)

Notable edge cases preserved verbatim from source artifacts (don't "fix" these):
- **M3 #10** has an intentional duplicate-label distractor — factor B (with
  effective-date qualifier) is present + Positive; factor E (same label without
  qualifier) is absent. This tests retrospective discipline.
- **M6 #10** (Keowee Peninsula Club) has 13 factors A–M — the most of any Section 5
  scenario. Four interacting specialty characteristics.
- Several **FEMA Zone X model rationales** are 17 characters ("Zone X confirmed.")
  which is below the 20-char `min_rationale_chars` threshold. This threshold gates
  STUDENT input only, not model answers. Not a bug.

---

## 13. Architectural state — what's done, what's not

### ✅ Done

- **Phase 1 complete**: auth, role-based dashboards, sequential gate-based curriculum
  enforcement, multi-tenant organization scoping, per-student module visibility
  toggle.
- **Phase 2 progressed**: scenario content infrastructure (scenarios, model_answers,
  scenario_submissions, scenario_answers tables), content delivery API, student
  submit-and-lock flow with model answer reveal.
- **Migration system live** (replaced "drop and recreate" pattern on 2026-05-03).
  Verified across 3 production deploys (migrations 014, 015, 016) — data persists.
- **Module 2 Sections 1–5 content imported** — 300 scenarios across 30 categories
  (60 scenarios per section × 5 sections). Sections 1, 3, 4, and 5 each represent
  a distinct exercise format pattern.
- **Section 11 AI rubric grading infrastructure** built (Anthropic API integration);
  60 scenarios of Section 11 content not yet imported.

### ⚠️ Known residual risks

- **No automated database backups.** Railway offers daily PostgreSQL backups but
  they're not enabled by default. This is the largest remaining risk before real
  students submit work. Discuss with Paul before students go live.
- **No staging environment.** Migrations run against production the first time
  they're tried. Test locally or in a Railway preview environment before merging.
- **Older migrations (001–013) may not all be wrapped in `BEGIN`/`COMMIT`.** New
  migrations always should be. A future audit could add transactional wrapping to
  the older ones.
- **No deploy failure alerts.** Failed deploys are detected by Paul manually
  watching Railway. Email/Slack alerts on deploy failure would be a quality-of-life
  improvement once students are using the platform.

### 🔜 Phase 2 work not yet built

- **Module 2 content for Sections 6–11** — Market Analysis, Highest & Best Use,
  Income Approach, Cost Approach, Reconciliation, Narrative Writing & Reporting.
  Section 11 has the AI grading infrastructure; content still to load.
- **E-signature capture** — Module 1 program agreements. Mechanism: student types
  full name → renders in a signature script font → student clicks Sign → system
  stores: signature image (PNG/SVG), full document text at time of signing,
  timestamp, and IP address. Needed for Module 1 completion.
- **Mandatory video completion tracking** — Modules 1, 2, 3, 7, 9. Video player
  must report completion to backend; gate cannot be reached until videos in that
  module are watched to completion.
- **Module 1 content** — orientation videos and program agreement documents.

### 🔜 Phase 3 work not yet built

- **PDF upload** for Modules 3, 4, 5, 6, 8 (student deliverables).
- **VR tour embedding** via RealNex QuickTours iframes for Modules 4, 5, 6, 8.
- **Report writing UI** for Module 3.
- **File download system** for assignment materials in Modules 4, 5, 6, 8.

### 🔜 Phase 4 work not yet built

- **CSV export** of all student data (admin requirement).
- **Time tracking** — per module, per section, total program time.
- **Full analytics dashboard** for admins.
- **Email notifications** when students submit work.
- **Production launch** — connect `app.omgparea.com` subdomain, link Wix login button.
- **Super Admin dashboard** for managing multiple organizations (white-label rollout).

---

## 14. What NOT to do

- **Don't introduce React Router, Tailwind, Prisma, or other new frameworks** without
  explicit buy-in from Paul. The minimal-dependency approach is intentional.
  Prisma was specifically considered and rejected during Phase 1.
- **Don't introduce a third-party LMS or learning platform.** This is fully
  custom-built by explicit founding decision.
- **Don't generate commercial appraisal scenarios.** PAREA is residential-only by
  AQB requirement.
- **Don't write migration files that drop tables, truncate data, or mass-delete rows**
  without explicit confirmation. Once committed, the destruction has happened.
- **Don't re-introduce the old "drop and recreate" deploy pattern.** It was removed
  on 2026-05-03 and replaced with the migration runner. The seed script must remain
  idempotent.
- **Don't drop or omit `organization_id` from new tables** holding user or content
  data. Multi-tenancy is load-bearing for the white-label plan even though only one
  organization exists today.
- **Don't propose using `git rebase`, `git stash`, or other advanced git workflows.**
  Paul commits via the GitHub web UI. Stick to that workflow.
- **Don't store secrets in the repo.** Database connection strings, JWT secrets, and
  API keys live in Railway environment variables (`DATABASE_URL`, `JWT_SECRET`,
  `ANTHROPIC_API_KEY` — verify exact names in Railway).
- **Don't "fix" intentional source-artifact patterns** when importing scenario content
  (e.g. duplicate-label distractors, short FEMA rationales). Preserve verbatim.
- **Don't generate session-summary scenarios with placeholder text** like "TODO:
  fill in factors later." Every scenario is a complete deliverable when imported.
- **Don't leave the user without a deploy walkthrough.** A code change without
  step-by-step GitHub instructions is half a deliverable.
- **Don't conflate gate states.** "Awaiting mentor check-in" is distinct from
  "Prerequisite locked" — they're different states with different workflow meanings.
- **Don't assume one Module 2 section's exercise format applies to others.**
  Section 1 has 9 text fields; Section 3 has a 3-step workflow; Section 4 has a
  4-step grid; Section 5 has factor_analysis. Verify the source format per section.
- **Don't bypass the per-student module toggle.** When generating UI that lists a
  student's modules, filter by `module_visibility` so hidden modules don't appear
  at all.
- **Don't allow student answer edits after submission.** Submitted answers are
  permanently locked. Model answers reveal only after submit.

---

## 15. Common verification queries

```sql
-- Confirm the migration system is healthy
SELECT version, name, run_at
  FROM schemaversion
  ORDER BY version DESC
  LIMIT 10;

-- Section 5 progress check
SELECT sc.code, COUNT(s.id) AS scenarios, COUNT(ma.id) AS model_answers
  FROM scenario_categories sc
  LEFT JOIN scenarios s ON s.category_id = sc.id
  LEFT JOIN model_answers ma ON ma.scenario_id = s.id
  WHERE sc.code LIKE 'M2-S5-%'
  GROUP BY sc.code
  ORDER BY sc.code;

-- Scenarios across all of Module 2 (any section) — should show Sections 1-5 with
-- 60 scenarios each, 6 categories each
SELECT
  ms.section_number,
  ms.section_name,
  COUNT(DISTINCT sc.id) AS categories,
  COUNT(DISTINCT s.id) AS scenarios
FROM module_sections ms
LEFT JOIN scenario_categories sc ON sc.section_id = ms.id
LEFT JOIN scenarios s ON s.category_id = sc.id
WHERE ms.module_number = 2
GROUP BY ms.section_number, ms.section_name
ORDER BY ms.section_number;

-- Active organizations and user counts (multi-tenancy check)
SELECT o.name AS organization,
       COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS students,
       COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'admin') AS admins
  FROM organizations o
  LEFT JOIN users u ON u.org_id = o.id
  GROUP BY o.name;

-- Per-student module visibility (which students have modules toggled off)
SELECT u.username, mv.module_number, mv.visible
  FROM users u
  JOIN module_visibility mv ON mv.user_id = u.id
  WHERE mv.visible = false
  ORDER BY u.username, mv.module_number;
```

---

## 16. Quick reference

| Item                          | Value                                                  |
|-------------------------------|--------------------------------------------------------|
| Marketing site (separate)     | https://omgparea.com (Wix, not in this repo)           |
| Live application              | https://app.omgparea.com                               |
| GitHub repo                   | https://github.com/paulryll/omgparea-platform          |
| Hosting                       | Railway                                                |
| Migration runner              | `server/src/migrate.js`                                |
| Migration files               | `server/migrations/NNN.do.<description>.sql`           |
| Migration tracker table       | `schemaversion` (3 columns: version, name, run_at)     |
| Seed script                   | `server/src/seed.js` (idempotent — skips if data exists)|
| Demo admin login              | `admin / admin123`                                     |
| Demo student login            | `jsmith / <see seed.js>`                               |
| Module 2 Section 11 AI grader | Uses Anthropic API (key in Railway env)                |
| Total program gates           | 20 (1 + 11 + 8)                                        |
| Build phase status            | Phase 2 in progress — Module 2 Sections 1–5 complete (300 scenarios), Sections 6–11 pending |
| Latest content milestone      | Module 2 Sections 1–5 — 300 scenarios across 30 categories |

---

## 17. When in doubt

If you're not sure whether to do something, ask Paul plainly:

> "Before I do this, I want to flag that <X>. Do you want me to <option A> or
> <option B>?"

The cost of a clarifying question is one extra message. The cost of guessing wrong
is a debugging session and possibly a rollback. Always lean toward asking when the
choice is non-obvious.

---

*End of CLAUDE.md*
