-- ============================================================
-- Migration 013 — Section 5 (Locational Influence) Setup
-- ============================================================
-- Schema preparation for Section 5. NO content is loaded by
-- this migration. Content bulk loads follow in:
--   014  M2-S5-C1 (Mortgage Lending) + M2-S5-C2 (Litigation Support)  — 20 scenarios
--   015  M2-S5-C3 (Estate & Tax)     + M2-S5-C4 (Private/Consulting)  — 20 scenarios
--   016  M2-S5-C5 (Government)       + M2-S5-C6 (Specialty)            — 20 scenarios
--
-- This migration does four things:
--
--   (1) Extends section_fields.field_type CHECK constraint to
--       include 'factor_analysis' (alongside text, checklist,
--       select, parameters, approaches, comparables, and
--       adjustment_grid).
--
--   (2) Extends scenarios.difficulty CHECK constraint to add
--       'introductory' and 'expert' (alongside the existing
--       basic, intermediate, advanced). Section 5 uses all
--       five tiers, two scenarios per tier per category.
--
--   (3) Inserts six categories for M2-S5 (one per module
--       assignment category) with their agreed colors.
--
--   (4) Inserts one section_fields row for the
--       'factor_analysis' field on M2-S5, with section-level
--       defaults for classification options and minimum
--       rationale character count. (Per-scenario factor lists
--       and location profiles arrive via field_options_override
--       on each scenario's model_answers row in 014–016.)
--
-- Constraint name discovery:
--   The DO blocks below look up the actual existing constraint
--   names rather than assuming Postgres's auto-generated form,
--   which makes the migration robust if the constraints were
--   ever recreated under non-standard names. Each ALTER then
--   adds the new constraint under the standard name.
--
-- Pre-flight assertion:
--   Module section M2-S5 must already exist in module_sections
--   (it should have been seeded when Module 2 was created). If
--   it's missing, the migration aborts with a clear message
--   rather than silently inserting zero rows.
--
-- Idempotency:
--   This migration runs once and is recorded by the migration
--   runner in the schemaversion table; it is not re-run on
--   subsequent deploys.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- Pre-flight assertion: M2-S5 row must exist
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM module_sections WHERE code = 'M2-S5') THEN
    RAISE EXCEPTION 'Section M2-S5 does not exist in module_sections — was it seeded when Module 2 was created? Aborting migration 013.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────
-- (1) Extend section_fields.field_type CHECK constraint
-- ─────────────────────────────────────────────────────────
DO $$
DECLARE
  cn text;
BEGIN
  SELECT conname INTO cn
    FROM pg_constraint
   WHERE conrelid = 'section_fields'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%field_type%';
  IF cn IS NOT NULL THEN
    EXECUTE 'ALTER TABLE section_fields DROP CONSTRAINT ' || quote_ident(cn);
  END IF;
END $$;

ALTER TABLE section_fields
  ADD CONSTRAINT section_fields_field_type_check
  CHECK (field_type IN (
    'text',
    'checklist',
    'select',
    'parameters',
    'approaches',
    'comparables',
    'adjustment_grid',
    'factor_analysis'
  ));

-- ─────────────────────────────────────────────────────────
-- (2) Extend scenarios.difficulty CHECK constraint
-- ─────────────────────────────────────────────────────────
DO $$
DECLARE
  cn text;
BEGIN
  SELECT conname INTO cn
    FROM pg_constraint
   WHERE conrelid = 'scenarios'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%difficulty%';
  IF cn IS NOT NULL THEN
    EXECUTE 'ALTER TABLE scenarios DROP CONSTRAINT ' || quote_ident(cn);
  END IF;
END $$;

ALTER TABLE scenarios
  ADD CONSTRAINT scenarios_difficulty_check
  CHECK (difficulty IN (
    'introductory',
    'basic',
    'intermediate',
    'advanced',
    'expert'
  ));

-- ─────────────────────────────────────────────────────────
-- (3) Insert six categories for M2-S5
-- ─────────────────────────────────────────────────────────
INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 1, 'M2-S5-C1', 'Mortgage Lending',          '#1B3A6B', '#2E7D9F'
  FROM module_sections ms WHERE ms.code = 'M2-S5';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 2, 'M2-S5-C2', 'Litigation Support',        '#5C1A1A', '#8B3A3A'
  FROM module_sections ms WHERE ms.code = 'M2-S5';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 3, 'M2-S5-C3', 'Estate & Tax',              '#1B4D2E', '#B8860B'
  FROM module_sections ms WHERE ms.code = 'M2-S5';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 4, 'M2-S5-C4', 'Private / Consulting',      '#2E3B4E', '#5C7A9F'
  FROM module_sections ms WHERE ms.code = 'M2-S5';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 5, 'M2-S5-C5', 'Government & Public Use',   '#1A3A5C', '#4A6741'
  FROM module_sections ms WHERE ms.code = 'M2-S5';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 6, 'M2-S5-C6', 'Specialty Situations',      '#3B1B6B', '#2E7D8F'
  FROM module_sections ms WHERE ms.code = 'M2-S5';

-- ─────────────────────────────────────────────────────────
-- (4) Insert one section_fields row for factor_analysis on M2-S5
-- ─────────────────────────────────────────────────────────
INSERT INTO section_fields
  (section_id, order_index, field_key, label, help_text, field_type, field_options)
SELECT
  ms.id,
  1,
  'factor_analysis',
  'Locational Factor Analysis',
  'Identify each locational factor present in the scenario, classify its effect on value, and provide a market-supported rationale. Leave unchecked any factor not present.',
  'factor_analysis',
  '{"classification_options": ["Positive", "Negative", "Neutral", "Market-Dependent"], "min_rationale_chars": 20}'::jsonb
FROM module_sections ms WHERE ms.code = 'M2-S5';

COMMIT;
