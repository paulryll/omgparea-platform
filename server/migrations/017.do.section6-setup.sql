-- ============================================================
-- Migration 017 — Section 6 (Market Analysis) Setup
-- ============================================================
-- Schema preparation for Section 6. NO content is loaded by
-- this migration. Content bulk loads follow in:
--   018  M2-S6-C1 (Mortgage Lending)                          — 10 scenarios
--   019  M2-S6-C2 (Litigation) + M2-S6-C3 (Estate & Tax)      — 20 scenarios
--   020  M2-S6-C4 (Private / Consulting)                      — 10 scenarios
--   021  M2-S6-C5 (Government & Public Use)                   — 10 scenarios
--   022  M2-S6-C6 (Specialty Situations)                      — 10 scenarios
--
-- This migration does three things:
--
--   (1) Extends section_fields.field_type CHECK constraint to
--       include 'market_indicator_analysis' (alongside text,
--       checklist, select, parameters, approaches, comparables,
--       adjustment_grid, and factor_analysis).
--
--   (2) Inserts six categories for M2-S6 (one per module
--       assignment category) with their agreed colors. Colors
--       match Section 5 (and all prior sections) — the same six
--       palettes are used across the entire program.
--
--   (3) Inserts one section_fields row for the
--       'market_indicator_analysis' field on M2-S6, with
--       section-level defaults for classification options,
--       minimum rationale character count, and the per-category
--       Context labels (Lending / Litigation / Estate /
--       Consulting / Government / Specialty). Per-scenario
--       property blocks, indicator tables, external context
--       paragraphs, checklists, net conclusions, and commentary
--       arrive via field_options_override on each scenario's
--       model_answers row in 018–022.
--
-- Difficulty CHECK constraint:
--   No update needed. Migration 013 already extended this
--   constraint to allow 'introductory' and 'expert' (in
--   addition to basic, intermediate, advanced). Section 6 uses
--   the same five tiers, two scenarios per tier per category.
--
-- Constraint name discovery:
--   The DO block below looks up the actual existing constraint
--   name rather than assuming Postgres's auto-generated form,
--   matching the pattern used by migration 013.
--
-- Pre-flight assertion:
--   Module section M2-S6 must already exist in module_sections
--   (it should have been seeded when Module 2 was created with
--   all 11 of its sections back in Phase 1). If it's missing,
--   the migration aborts with a clear message rather than
--   silently inserting zero rows.
--
-- Idempotency:
--   This migration runs once and is recorded by the migration
--   runner in the schemaversion table; it is not re-run on
--   subsequent deploys.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- Pre-flight assertion: M2-S6 row must exist
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM module_sections WHERE code = 'M2-S6') THEN
    RAISE EXCEPTION 'Section M2-S6 does not exist in module_sections — was it seeded when Module 2 was created? Aborting migration 017.';
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
    'factor_analysis',
    'market_indicator_analysis'
  ));

-- ─────────────────────────────────────────────────────────
-- (2) Insert six categories for M2-S6
-- ─────────────────────────────────────────────────────────
INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 1, 'M2-S6-C1', 'Mortgage Lending',          '#1B3A6B', '#2E7D9F'
  FROM module_sections ms WHERE ms.code = 'M2-S6';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 2, 'M2-S6-C2', 'Litigation Support',        '#5C1A1A', '#8B3A3A'
  FROM module_sections ms WHERE ms.code = 'M2-S6';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 3, 'M2-S6-C3', 'Estate & Tax',              '#1B4D2E', '#B8860B'
  FROM module_sections ms WHERE ms.code = 'M2-S6';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 4, 'M2-S6-C4', 'Private / Consulting',      '#2E3B4E', '#5C7A9F'
  FROM module_sections ms WHERE ms.code = 'M2-S6';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 5, 'M2-S6-C5', 'Government & Public Use',   '#1A3A5C', '#4A6741'
  FROM module_sections ms WHERE ms.code = 'M2-S6';

INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent)
SELECT ms.id, 6, 'M2-S6-C6', 'Specialty Situations',      '#3B1B6B', '#2E7D8F'
  FROM module_sections ms WHERE ms.code = 'M2-S6';

-- ─────────────────────────────────────────────────────────
-- (3) Insert one section_fields row for market_indicator_analysis on M2-S6
-- ─────────────────────────────────────────────────────────
INSERT INTO section_fields
  (section_id, order_index, field_key, label, help_text, field_type, field_options)
SELECT
  ms.id,
  1,
  'market_indicator_analysis',
  'Market Indicator Analysis',
  'Identify each market indicator present in the scenario, classify its trend direction (Improving / Stable / Declining / Market-Dependent), and provide a market-supported rationale citing specific data from the package. Leave unchecked any indicator not evidenced in the data.',
  'market_indicator_analysis',
  '{"classification_options": ["Improving", "Stable", "Declining", "Market-Dependent"], "min_rationale_chars": 20, "context_labels_by_category": {"M2-S6-C1": "Lending Context", "M2-S6-C2": "Litigation Context", "M2-S6-C3": "Estate Context", "M2-S6-C4": "Consulting Context", "M2-S6-C5": "Government Context", "M2-S6-C6": "Specialty Context"}}'::jsonb
FROM module_sections ms WHERE ms.code = 'M2-S6';

COMMIT;
