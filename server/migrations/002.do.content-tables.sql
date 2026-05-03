-- ============================================================
-- Migration 002 — Phase 2 exercise content tables
-- Adds the structure for scenario-based exercises:
--   categories, fields, scenarios, model answers,
--   student submissions, and student answers.
-- This migration represents the schema as of Phase 2 Step 1A.
-- The feedback columns added in Step 1D are in migration 003.
-- ============================================================

-- ------------------------------------------------------------
-- scenario_categories — groups of scenarios within a section.
-- For Section 1 Problem Identification: 6 categories
-- (Mortgage Lending, Litigation Support, Estate & Tax,
-- Private/Consulting, Government & Public Use, Specialty
-- Situations). Each carries its own color palette used in
-- the student UI.
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
-- section_fields — the fields each scenario in a section asks
-- students to complete. Section 1 has 9 (Client, Intended
-- Users, Intended Use, Type & Definition of Value, Effective
-- Date, Property Interest, Scope of Work, Assumptions, USPAP).
-- Other sections will have different field sets; this table
-- supports that variation.
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
-- (6 categories × 10 scenarios each). Ordered 1..10 within
-- each category by ascending difficulty.
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
-- (scenario, field) pair. Revealed to student only after they
-- submit. For Section 1 once fully loaded: 60 × 9 = 540 rows.
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
-- scenario_submissions — one row per (student, scenario) when
-- a student clicks "Submit Answers". Locked on create.
-- Individual answers live in scenario_answers (one row per
-- field). The submission row carries submission-level metadata
-- (timestamp, time spent, locked flag).
-- ------------------------------------------------------------
CREATE TABLE scenario_submissions (
  id                SERIAL PRIMARY KEY,
  organization_id   INT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id        INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id       INT  NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_sec    INT  NOT NULL DEFAULT 0,
  locked            BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (student_id, scenario_id)
);
CREATE INDEX idx_submissions_student ON scenario_submissions (student_id);
CREATE INDEX idx_submissions_scenario ON scenario_submissions (scenario_id);

-- ------------------------------------------------------------
-- scenario_answers — the student's typed answer for each field
-- within a submission. 9 rows per submission for Section 1.
-- The API layer enforces that rows cannot be edited once the
-- parent submission is locked.
-- ------------------------------------------------------------
CREATE TABLE scenario_answers (
  id              SERIAL PRIMARY KEY,
  submission_id   INT  NOT NULL REFERENCES scenario_submissions(id) ON DELETE CASCADE,
  field_id        INT  NOT NULL REFERENCES section_fields(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  UNIQUE (submission_id, field_id)
);
CREATE INDEX idx_answers_submission ON scenario_answers (submission_id);
