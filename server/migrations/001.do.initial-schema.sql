-- ============================================================
-- Migration 001 — Initial Phase 1 schema
-- Multi-tenant ready. Every row scoped by organization_id.
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
