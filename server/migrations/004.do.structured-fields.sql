-- ============================================================
-- Migration 004 — Structured field types
--
-- Section 1 (Problem Identification) used a simple model:
-- every field was a text box, every answer was a string.
--
-- Section 2 (Scope of Work) and beyond need richer interaction:
-- checklist fields where students pick multiple options,
-- single-select fields, parameter grids with units, and the
-- "approaches" structure where each option has its own
-- justification text. This migration adds the storage to
-- support those patterns without breaking Section 1.
--
-- The four new columns are all nullable / additive. No
-- existing row is altered. Section 1 fields will continue to
-- have field_type='text' and ignore the new JSON columns.
-- ============================================================

-- ------------------------------------------------------------
-- section_fields.field_type
--   What kind of input the student sees for this field.
--     'text'        — plain textarea (Section 1 default)
--     'checklist'   — multiple checkboxes; student picks any
--     'select'      — single-select; one option only
--     'parameters'  — grid of labeled inputs with units
--     'approaches'  — like checklist but each picked option
--                     also requires a justification text
--
-- section_fields.field_options
--   JSONB describing the input's options/structure.
--     For 'checklist'/'select': { options: ["A","B","C"] }
--     For 'parameters': { fields: [{name, label, unit}, ...] }
--     For 'approaches': { options: ["Sales","Cost","Income"] }
--     For 'text': null
-- ------------------------------------------------------------
ALTER TABLE section_fields
  ADD COLUMN field_type    TEXT  NOT NULL DEFAULT 'text',
  ADD COLUMN field_options JSONB;

ALTER TABLE section_fields
  ADD CONSTRAINT section_fields_field_type_check
  CHECK (field_type IN ('text','checklist','select','parameters','approaches'));

-- ------------------------------------------------------------
-- model_answers.model_data
--   JSONB structured model answer, used in addition to or
--   instead of answer_text depending on field_type.
--     For 'text': null; answer_text holds the model answer.
--     For 'checklist': { selected: [0, 1, 2] } indices.
--     For 'select':    { selected: 0 } single index.
--     For 'parameters': { values: { searchRadius: "1", ... } }
--     For 'approaches': { selected: [0,1], justifications: [..] }
--   In all cases answer_text remains valid as a free-form
--   commentary that supports the structured data.
-- ------------------------------------------------------------
ALTER TABLE model_answers
  ADD COLUMN model_data JSONB;

-- ------------------------------------------------------------
-- scenario_answers.answer_data
--   JSONB structured student answer, mirroring model_data's
--   shape per field_type. answer_text remains usable for
--   text fields and for any free-form commentary the student
--   adds alongside structured choices.
-- ------------------------------------------------------------
ALTER TABLE scenario_answers
  ADD COLUMN answer_data JSONB;

-- ------------------------------------------------------------
-- Allow answer_text to be NULL going forward.
--
-- Section 1 fields are all 'text' so answer_text remains
-- required by the application logic. But for some structured
-- fields (e.g. a checklist) the application may not require a
-- text answer — only the structured indices. Loosening the
-- column to NULLable lets the application enforce that
-- per-field rather than the database forcing every answer to
-- have text. The submit endpoint will continue to require
-- meaningful input per field; this is just a storage relax.
-- ------------------------------------------------------------
ALTER TABLE scenario_answers
  ALTER COLUMN answer_text DROP NOT NULL;

ALTER TABLE model_answers
  ALTER COLUMN answer_text DROP NOT NULL;
