-- ============================================================
-- Migration 005 — Per-scenario field option overrides
--
-- For sections like Scope of Work, the relevant option set
-- for a checklist or select field can vary by scenario:
-- e.g., a conventional purchase shows different "data sources
-- to consult" than an FHA refinance. The section-level
-- field_options is the default; this column lets a particular
-- scenario override that for one of its fields.
--
-- The override has the same JSON shape as section_fields.
-- field_options:
--     For 'checklist'/'select': { options: ["A","B","C"] }
--     For 'parameters':         { fields: [{name,label,unit}] }
--     For 'approaches':         { options: ["Sales","Cost","Income"] }
--
-- When NULL (the default), the API merges nothing: the
-- scenario uses the section-level field_options. When set,
-- the API uses the override entirely (no merging of items —
-- the override is a complete replacement).
--
-- This migration is purely additive. Existing Section 1
-- model answers will have NULL overrides and continue to work
-- exactly as before.
-- ============================================================

ALTER TABLE model_answers
  ADD COLUMN field_options_override JSONB;
