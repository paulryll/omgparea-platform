-- ============================================================
-- OMG PAREA Platform — Database Schema (Phase 1)
-- Multi-tenant ready. Every row scoped by organization_id.
-- ============================================================

-- Clean slate for re-init (safe: wrapped in IF EXISTS)
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS gates CASCADE;
DROP TABLE IF EXISTS student_module_access CASCADE;
DROP TABLE IF EXISTS module_sections CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ------------------------------------------------------------
-- organizations — tenant root. Day 1: only "OMG PAREA".
-- White-label expands here (one row per licensed company).
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,        -- e.g. 'omgparea'
  name          TEXT NOT NULL,               -- e.g. 'OMG PAREA'
  branding      JSONB NOT NULL DEFAULT '{}', -- colors, logo url, etc.
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- users — students, admins/mentors, and future super_admins.
-- super_admin rows may have organization_id = NULL.
-- ------------------------------------------------------------
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  username        TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('student','admin','super_admin')),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','withdrawn')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email),
  UNIQUE (organization_id, username)
);
CREATE INDEX idx_users_org_role ON users (organization_id, role);

-- ------------------------------------------------------------
-- modules — the 9 PAREA modules. Global definitions (not
-- per-tenant) so all orgs share the same curriculum spine.
-- Per-tenant variation lives in student_module_access.
-- ------------------------------------------------------------
CREATE TABLE modules (
  id           SERIAL PRIMARY KEY,
  order_index  INT  NOT NULL UNIQUE,     -- 1..9
  code         TEXT NOT NULL UNIQUE,     -- e.g. 'M1', 'M2', ...
  name         TEXT NOT NULL,
  description  TEXT,
  kind         TEXT NOT NULL CHECK (kind IN
                 ('orientation','exercises','report','assignment','business')),
  -- if TRUE, admin must unlock this module's gate before student proceeds
  has_gate     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- module_sections — Module 2 has 11 sections, each with its
-- own gate. Other modules have zero sections (just a module-
-- level gate). This table makes the 20-gate structure clean.
-- ------------------------------------------------------------
CREATE TABLE module_sections (
  id           SERIAL PRIMARY KEY,
  module_id    INT  NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  order_index  INT  NOT NULL,
  code         TEXT NOT NULL,            -- e.g. 'M2-S1'
  name         TEXT NOT NULL,
  UNIQUE (module_id, order_index),
  UNIQUE (module_id, code)
);

-- ------------------------------------------------------------
-- student_module_access — per-student module visibility.
-- If a row is missing or enabled=FALSE, the module is
-- completely hidden for that student (e.g., in-house hires
-- skip Modules 7 & 9). Gates for disabled modules are also
-- skipped in the progression logic.
-- ------------------------------------------------------------
CREATE TABLE student_module_access (
  id              SERIAL PRIMARY KEY,
  organization_id INT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id       INT  NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, module_id)
);
CREATE INDEX idx_sma_student ON student_module_access (student_id);

-- ------------------------------------------------------------
-- gates — 20 gates per student. Exactly one row per
-- (student, module) for non-Module-2 gates, and one row per
-- (student, module, section) for Module 2's 11 sections.
-- unlocked = TRUE means the student can proceed past that
-- point in the curriculum.
-- ------------------------------------------------------------
CREATE TABLE gates (
  id              SERIAL PRIMARY KEY,
  organization_id INT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id       INT  NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  section_id      INT           REFERENCES module_sections(id) ON DELETE CASCADE,
  unlocked        BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at     TIMESTAMPTZ,
  unlocked_by     INT REFERENCES users(id),  -- admin user who unlocked
  note            TEXT,
  UNIQUE (student_id, module_id, section_id)
);
CREATE INDEX idx_gates_student ON gates (student_id);

-- ------------------------------------------------------------
-- progress — time tracking and completion per module/section.
-- Granular enough to answer "how long did student X spend on
-- Module 2 Section 3?" without touching exercise answers
-- (which live in Phase 2 tables).
-- ------------------------------------------------------------
CREATE TABLE progress (
  id              SERIAL PRIMARY KEY,
  organization_id INT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id       INT  NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  section_id      INT           REFERENCES module_sections(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  time_spent_sec  INT NOT NULL DEFAULT 0,
  UNIQUE (student_id, module_id, section_id)
);
CREATE INDEX idx_progress_student ON progress (student_id);
