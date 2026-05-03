-- ============================================================
-- Migration 003 — Admin feedback columns
-- Adds the three columns that support the Step 1D admin
-- grading workflow: feedback text, when it was last saved,
-- and which admin saved it.
-- ============================================================

ALTER TABLE scenario_submissions
  ADD COLUMN admin_feedback TEXT,
  ADD COLUMN feedback_at    TIMESTAMPTZ,
  ADD COLUMN feedback_by    INT REFERENCES users(id);

-- Note: existing submissions get NULL for all three columns,
-- which is correct — they have no feedback until an admin
-- saves one. The application code already treats NULL as
-- "no feedback yet".
