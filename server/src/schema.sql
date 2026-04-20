-- ============================================================
-- OMG PAREA Platform — Database Schema
-- Phase 1 + Phase 2 Step 1A (exercise content + submissions)
-- Step 1D addition: admin feedback columns on submissions
-- Multi-tenant ready. Every row scoped by organization_id.
-- ============================================================
 
-- Clean slate for re-init (safe: wrapped in IF EXISTS).
-- Phase 2 tables drop FIRST because they reference Phase 1 tables.
DROP TABLE IF EXISTS scenario_answers CASCADE;
DROP TABLE IF EXISTS scenario_submissions CASCADE;
DROP TABLE IF EXISTS model_answers CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS section_fields CASCADE;
DROP TABLE IF EXISTS scenario_categories CASCADE;
-- Phase 1 tables
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS gates CASCADE;
DROP TABLE IF EXISTS student_module_access CASCADE;
DROP TABLE IF EXISTS module_sections CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
 
-- ============================================================
-- PHASE 1 — Foundation (unchanged from existing schema)
-- ============================================================
 
CREATE TABLE organizations (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  branding      JSONB NOT NULL DEFAULT '{}',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
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
 
CREATE TABLE modules (
  id           SERIAL PRIMARY KEY,
  order_index  INT  NOT NULL UNIQUE,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT,
  kind         TEXT NOT NULL CHECK (kind IN
                 ('orientation','exercises','report','assignment','business')),
  has_gate     BOOLEAN NOT NULL DEFAULT TRUE
);
 
CREATE TABLE module_sections (
  id           SERIAL PRIMARY KEY,
  module_id    INT  NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  order_index  INT  NOT NULL,
  code         TEXT NOT NULL,
  name         TEXT NOT NULL,
  UNIQUE (module_id, order_index),
  UNIQUE (module_id, code)
);
 
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
 
CREATE TABLE gates (
  id              SERIAL PRIMARY KEY,
  organization_id INT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id       INT  NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  section_id      INT           REFERENCES module_sections(id) ON DELETE CASCADE,
  unlocked        BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at     TIMESTAMPTZ,
  unlocked_by     INT REFERENCES users(id),
  note            TEXT,
  UNIQUE (student_id, module_id, section_id)
);
CREATE INDEX idx_gates_student ON gates (student_id);
 
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
 
-- ============================================================
-- PHASE 2 — Exercise content and student submissions
-- ============================================================
 
-- ------------------------------------------------------------
-- scenario_categories — groups of scenarios within a section.
-- For Section 1 Problem Identification: 6 categories
-- (Mortgage Lending, Litigation Support, Estate & Tax,
-- Private/Consulting, Government & Public Use, Specialty
-- Situations). Each carries its own color palette used in
-- the student UI for visual continuity with the existing
-- standalone artifacts.
-- ------------------------------------------------------------
CREATE TABLE scenario_categories (
  id              SERIAL PRIMARY KEY,
  section_id      INT  NOT NULL REFERENCES module_sections(id) ON DELETE CASCADE,
  order_index     INT  NOT NULL,
  code            TEXT NOT NULL,              -- e.g. 'M2-S1-C1'
  name            TEXT NOT NULL,              -- e.g. 'Mortgage Lending'
  color_primary   TEXT,                       -- hex, e.g. '#1a1a2e'
  color_accent    TEXT,
  description     TEXT,
  UNIQUE (section_id, order_index),
  UNIQUE (section_id, code)
);
 
-- ------------------------------------------------------------
-- section_fields — the fields each scenario in a section
-- asks students to complete. Section 1 has 9 (Client,
-- Intended Users, Intended Use, Type & Definition of Value,
-- Effective Date, Property Interest, Scope of Work,
-- Assumptions, USPAP). Other sections will have different
-- field sets — this table supports that variation.
-- ------------------------------------------------------------
CREATE TABLE section_fields (
  id              SERIAL PRIMARY KEY,
  section_id      INT  NOT NULL REFERENCES module_sections(id) ON DELETE CASCADE,
  order_index     INT  NOT NULL,
  field_key       TEXT NOT NULL,              -- stable identifier, e.g. 'client'
  label           TEXT NOT NULL,              -- what the student sees
  help_text       TEXT,                       -- optional hint shown below the field
  UNIQUE (section_id, order_index),
  UNIQUE (section_id, field_key)
);
 
-- ------------------------------------------------------------
-- scenarios — one row per scenario. For Section 1: 60 rows
-- (6 categories × 10 scenarios each) once full content is
-- imported. Ordered 1..10 within each category by ascending
-- difficulty.
-- ------------------------------------------------------------
CREATE TABLE scenarios (
  id              SERIAL PRIMARY KEY,
  category_id     INT  NOT NULL REFERENCES scenario_categories(id) ON DELETE CASCADE,
  order_index     INT  NOT NULL,              -- 1..10 within category
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('basic','intermediate','advanced','expert')),
  title           TEXT NOT NULL,
  scenario_text   TEXT NOT NULL,              -- full narrative presented to student
  UNIQUE (category_id, order_index)
);
CREATE INDEX idx_scenarios_category ON scenarios (category_id);
 
-- ------------------------------------------------------------
-- model_answers — the reference answer for each
-- (scenario, field) pair. Revealed to student only after
-- they submit their own answer. For Section 1 once fully
-- loaded: 60 scenarios × 9 fields = 540 rows.
-- ------------------------------------------------------------
CREATE TABLE model_answers (
  id              SERIAL PRIMARY KEY,
  scenario_id     INT  NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  field_id        INT  NOT NULL REFERENCES section_fields(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  commentary      TEXT,                       -- optional instructor explanation
  UNIQUE (scenario_id, field_id)
);
 
-- ------------------------------------------------------------
-- scenario_submissions — one row per (student, scenario)
-- when a student clicks "Submit Answers". Locked on create.
-- Individual answers live in scenario_answers (one row per
-- field). The submission row carries the submission-level
-- metadata (timestamp, time spent, locked flag, and the
-- instructor's feedback note plus when/who saved it).
-- ------------------------------------------------------------
CREATE TABLE scenario_submissions (
  id                SERIAL PRIMARY KEY,
  organization_id   INT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id        INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id       INT  NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_sec    INT  NOT NULL DEFAULT 0,
  locked            BOOLEAN NOT NULL DEFAULT TRUE,
  admin_feedback    TEXT,                     -- instructor's note to the student; NULL = no feedback yet
  feedback_at       TIMESTAMPTZ,              -- when feedback was last saved; NULL if never
  feedback_by       INT REFERENCES users(id), -- which admin wrote the feedback
  UNIQUE (student_id, scenario_id)
);
CREATE INDEX idx_submissions_student ON scenario_submissions (student_id);
CREATE INDEX idx_submissions_scenario ON scenario_submissions (scenario_id);
 
-- ------------------------------------------------------------
-- scenario_answers — the student's typed answer for each
-- field within a submission. 9 rows per submission for
-- Section 1. The API layer enforces that rows cannot be
-- edited once the parent submission is locked.
-- ------------------------------------------------------------
CREATE TABLE scenario_answers (
  id              SERIAL PRIMARY KEY,
  submission_id   INT  NOT NULL REFERENCES scenario_submissions(id) ON DELETE CASCADE,
  field_id        INT  NOT NULL REFERENCES section_fields(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  UNIQUE (submission_id, field_id)
);
CREATE INDEX idx_answers_submission ON scenario_answers (submission_id);
 
