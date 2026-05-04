-- ============================================================
-- Migration 008 — Section 4 content (Adjustment Analysis)
-- VERTICAL SLICE: structural setup + s4_m1_s1 only.
--
-- Seeds Section M2-S4 with:
--   - 6 categories (Mortgage, Litigation, Estate&Tax, Private,
--     Government, Specialty) — same color palette as Sections 2 and 3.
--   - 1 field of type 'adjustment_grid' (a new field type).
--   - 1 scenario (s4_m1_s1: 142 Thornbush Lane, Mortgage Lending,
--     Introductory) with full field_options_override and model_data.
--
-- Schema change:
--   - Extends section_fields.field_type CHECK constraint to include
--     'adjustment_grid'. Existing 6 types remain valid.
--
-- The model_data and field_options_override JSONB columns themselves
-- already exist on model_answers (added in earlier migrations).
--
-- Migration 009 (next) will bulk-load the remaining 17 scenarios using
-- the same shape proven out by 008.
--
-- Idempotency: this migration runs once and is recorded in the
-- schemaversion table by the migration runner. It will never run again.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Extend the field_type CHECK constraint
-- ------------------------------------------------------------
ALTER TABLE section_fields DROP CONSTRAINT IF EXISTS section_fields_field_type_check;
ALTER TABLE section_fields ADD CONSTRAINT section_fields_field_type_check
  CHECK (field_type IN (
    'text',
    'checklist',
    'select',
    'parameters',
    'approaches',
    'comparables',
    'adjustment_grid'
  ));

-- ------------------------------------------------------------
-- 2. Insert 6 categories for Section M2-S4
-- ------------------------------------------------------------
WITH section_row AS (SELECT id FROM module_sections WHERE code = 'M2-S4')
INSERT INTO scenario_categories
  (section_id, order_index, code, name, color_primary, color_accent, description)
VALUES
  ((SELECT id FROM section_row), 1, 'M2-S4-C1', 'Mortgage Lending', '#1B3A6B', '#2E7D9F', 'Standard URAR grid, GSE delivery, paired-sales support for adjustments.'),
  ((SELECT id FROM section_row), 2, 'M2-S4-C2', 'Litigation Support', '#5C1A1A', '#8B3A3A', 'Adjustment support that survives deposition; opposing-expert grids.'),
  ((SELECT id FROM section_row), 3, 'M2-S4-C3', 'Estate & Tax', '#1B5E20', '#B8860B', 'Retrospective adjustments; market conditions adjustments to date of death.'),
  ((SELECT id FROM section_row), 4, 'M2-S4-C4', 'Private / Consulting', '#37474F', '#607D8B', 'Investor-focused adjustment analysis; income overlay considerations.'),
  ((SELECT id FROM section_row), 5, 'M2-S4-C5', 'Government & Public Use', '#0D47A1', '#6B8E23', 'Eminent domain, VA/FHA, before/after adjustments in condemnation.'),
  ((SELECT id FROM section_row), 6, 'M2-S4-C6', 'Specialty Situations', '#4A148C', '#00796B', 'Lake/STR, manufactured housing, ADU, solar, fractional interest.')
;

-- ------------------------------------------------------------
-- 3. Insert one section_field of type 'adjustment_grid'
-- ------------------------------------------------------------
INSERT INTO section_fields
  (section_id, order_index, field_key, field_type, label, help_text)
SELECT id, 1, 'adjustment_grid', 'adjustment_grid',
  'Adjustment Analysis',
  'Identify which features differ from the subject, derive market-supported adjustment values, apply them to each comparable, and reconcile.'
FROM module_sections WHERE code = 'M2-S4';

-- ------------------------------------------------------------
-- 4. Insert scenario s4_m1_s1 (Mortgage Lending, Introductory)
-- ------------------------------------------------------------
INSERT INTO scenarios
  (category_id, order_index, difficulty, title, scenario_text)
SELECT id, 1,
  'basic',
  '142 Thornbush Lane — Purchase Loan Underwriting',
  'You are appraising a home at 142 Thornbush Lane, Simpsonville, SC for a purchase loan underwriting assignment. The subject is a 1,850 SF ranch built in 2005 with three bedrooms, two full bathrooms, a 2-car garage, and is in good condition. The lender requires GSE-compliant delivery (Fannie Mae / Freddie Mac).

Your comparable selection is complete — three closed sales within 0.6 miles, all within the past three months. Your task in this scenario is to identify which features differ from the subject, derive market-supported adjustment values, apply them to each comparable, and reconcile the adjusted prices into a credible value indication.'
FROM scenario_categories WHERE code = 'M2-S4-C1';

-- ------------------------------------------------------------
-- 5. Insert model_answer for s4_m1_s1
--    field_options_override holds student-facing scenario data
--    model_data holds gated post-submit model values
-- ------------------------------------------------------------
INSERT INTO model_answers
  (scenario_id, field_id, answer_text, field_options_override, model_data)
SELECT
  s.id,
  f.id,
  '',
  '{"subject": {"address": "142 Thornbush Lane, Simpsonville SC", "context": "Purchase Loan Underwriting", "difficulty": "Introductory", "fact_sheet": [["GLA", "1,850 SF"], ["Bathrooms", "2 full"], ["Bedrooms", "3"], ["Garage", "2-car"], ["Year Built", "2005"], ["Condition", "Good"]]}, "comps": [{"id": "C1", "label": "Comp 1", "price": 295000, "fact_sheet": {"Sale Price": "$295,000", "Sale Date": "2 mos. ago", "GLA": "2,000 SF", "Bathrooms": "2 full", "Bedrooms": "3", "Garage": "2-car", "Year Built": "2006", "Condition": "Good"}}, {"id": "C2", "label": "Comp 2", "price": 291500, "fact_sheet": {"Sale Price": "$291,500", "Sale Date": "1 mo. ago", "GLA": "1,850 SF", "Bathrooms": "2.5", "Bedrooms": "3", "Garage": "2-car", "Year Built": "2005", "Condition": "Good"}}, {"id": "C3", "label": "Comp 3", "price": 278000, "fact_sheet": {"Sale Price": "$278,000", "Sale Date": "3 mos. ago", "GLA": "1,750 SF", "Bathrooms": "2 full", "Bedrooms": "3", "Garage": "2-car", "Year Built": "2004", "Condition": "Good"}}], "features": [{"key": "gla", "label": "GLA", "unit_label": "$/SF", "step3_kind": "per_unit", "subject_units": 1850, "comp_units": {"C1": 2000, "C2": 1850, "C3": 1750}}, {"key": "bath", "label": "Bathrooms", "unit_label": "$", "step3_kind": "lump_sum"}], "step1_grid": [{"label": "Sale Price", "subject": "N/A", "comp_values": {"C1": "$295,000", "C2": "$291,500", "C3": "$278,000"}, "diff_comps": []}, {"label": "Sale Date", "subject": "—", "comp_values": {"C1": "2 mos. ago", "C2": "1 mo. ago", "C3": "3 mos. ago"}, "diff_comps": []}, {"label": "GLA", "subject": "1,850 SF", "comp_values": {"C1": "2,000 SF", "C2": "1,850 SF", "C3": "1,750 SF"}, "feature_key": "gla", "diff_comps": ["C1", "C3"], "diff_directions": {"C1": "superior", "C3": "inferior"}}, {"label": "Bathrooms", "subject": "2 full", "comp_values": {"C1": "2 full", "C2": "2.5", "C3": "2 full"}, "feature_key": "bath", "diff_comps": ["C2"], "diff_directions": {"C2": "superior"}}, {"label": "Bedrooms", "subject": "3", "comp_values": {"C1": "3", "C2": "3", "C3": "3"}, "diff_comps": []}, {"label": "Garage", "subject": "2-car", "comp_values": {"C1": "2-car", "C2": "2-car", "C3": "2-car"}, "diff_comps": []}, {"label": "Year Built", "subject": "2005", "comp_values": {"C1": "2006", "C2": "2005", "C3": "2004"}, "diff_comps": []}, {"label": "Condition", "subject": "Good", "comp_values": {"C1": "Good", "C2": "Good", "C3": "Good"}, "diff_comps": []}], "step2": {"tabs": [{"key": "paired", "label": "Paired Sales Analysis", "intro": "Use the supporting market data to extract contributory values for each adjustment type. Complete the Paired Sales tab, then reconcile.", "tables": [{"kind": "paired_dollar_per_unit", "feature_key": "gla", "title": "GLA Pairs — Calculate $/SF", "instruction": "Each pair below is confirmed equivalent except for GLA. Divide Price Difference ÷ SF Difference to find the market-indicated $/SF for GLA.", "input_label": "Your $/SF", "input_suffix": "/SF", "rows": [{"label": "1", "cells": ["1,800 SF / $278,000", "1,950 SF / $286,500", "150 SF", "$8,500"]}, {"label": "2", "cells": ["1,750 SF / $270,000", "1,900 SF / $278,200", "150 SF", "$8,200"]}, {"label": "3", "cells": ["1,825 SF / $280,000", "2,000 SF / $289,750", "175 SF", "$9,750"]}], "column_headers": ["Pair", "Sale A (SF / Price)", "Sale B (SF / Price)", "SF Diff", "Price Diff"], "concluded_label": "Concluded GLA Adjustment", "concluded_helper": "Bracket your three results."}, {"kind": "paired_dollar_diff", "feature_key": "bath", "title": "Bathroom Pairs — Calculate Price Difference", "instruction": "These pairs isolate the 2-full-bath vs. 2.5-bath difference. All other features confirmed equivalent. Subtract the 2-bath sale price from the 2.5-bath sale price.", "input_label": "Your Price Difference", "input_suffix": "", "rows": [{"label": "1", "cells": ["$272,000", "$278,500"]}, {"label": "2", "cells": ["$268,000", "$274,200"]}], "column_headers": ["Pair", "2 Full Bath Sale", "2.5 Bath Sale"], "concluded_label": "Concluded Bathroom Adjustment", "concluded_helper": "Bracket your two results."}]}, {"key": "cost", "label": "Cost-Based Support", "intro": "Calculate the depreciated contributory value of each adjustment item using the cost data below. Cost support typically produces a ceiling indication — compare to your paired sales conclusions when you reconcile.", "items": [{"kind": "cost_calc", "feature_key": "gla", "title": "GLA Contributory Value ($/SF)", "fact_rows": [["Replacement Cost New", "$85.00 / SF"], ["Effective Age", "18 years"], ["Economic Life", "60 years"], ["Depreciation Rate", "18 ÷ 60 = 30%"], ["Formula", "$85.00 × (1 − 0.30) = ?"]], "input_suffix": "/SF"}, {"kind": "cost_calc", "feature_key": "bath", "title": "Bathroom (Half-Bath Addition)", "fact_rows": [["Cost to Add Half Bath", "$9,500"], ["Effective Age", "18 years"], ["Economic Life", "60 years"], ["Depreciation Rate", "30%"], ["Formula", "$9,500 × (1 − 0.30) = ?"]], "input_suffix": ""}]}], "reconciliation": {"instruction": "Review both method indications and enter your reconciled adjustment for each item. Your concluded figure must fall within the range your analyses support. Cost is a ceiling — weight paired sales more heavily if they differ.", "items": [{"feature_key": "gla", "label": "GLA Adjustment ($/SF)"}, {"feature_key": "bath", "label": "Bathroom Adjustment ($)"}]}}, "step3": {"instruction": "Apply your reconciled adjustments to each comparable. Use a NEGATIVE value where the comp is superior to the subject, and a POSITIVE value where it is inferior. Then document your support methodology and rationale.", "applicable": {"C1": ["gla"], "C2": ["bath"], "C3": ["gla"]}, "method_dropdown": ["Paired Sales Analysis", "Grouped Paired Sales", "Cost-Based Support", "Income Differential / GRM", "Regression Analysis", "Appraiser Judgment / Extraction"], "support_min_chars": 15}, "step4": {"show_net_gross_panel": false}}'::jsonb,
  '{"step1_correct_flags": {"C1": ["gla"], "C2": ["bath"], "C3": ["gla"]}, "step1_rationale": "Comps 1 and 3 differ from the subject in GLA only. Comp 2 differs in bathroom count only. All other features (bedrooms, garage, year built, and condition) are equivalent and require no adjustment.", "step2_tables": {"paired": {"gla": {"pair_answers": [56.67, 54.67, 55.71], "concluded_range": [54.5, 57.0], "rationale": "Three pairs produce a tight range of $54.67–$56.67/SF. Reconcile near the midpoint."}, "bath": {"pair_answers": [6500, 6200], "concluded_range": [6150, 6550], "rationale": "Two pairs produce $6,200 and $6,500. The full-bath-to-half-bath increment is consistently in the low- to mid-$6,000 range."}}, "cost": {"gla": {"answer": 59.5, "rationale": "$85.00 × (1 − 0.30) = $59.50/SF — represents the depreciated cost ceiling."}, "bath": {"answer": 6650, "rationale": "$9,500 × (1 − 0.30) = $6,650 — depreciated cost of adding the half bath."}}}, "step2_reconciliation": {"gla": {"range": [55.0, 59.5], "rationale": "Paired sales support a tight range around $55–56.67/SF. Cost support of $59.50/SF is a credible ceiling. Reconcile toward paired sales (~$55–56/SF) with cost as a sanity check."}, "bath": {"range": [6200, 6650], "rationale": "Paired sales bracket $6,200–$6,500. Cost support of $6,650 is a credible ceiling. Reconcile within the paired-sales bracket."}}, "step3_adjustments": {"C1": {"gla": {"direction": "negative", "amount_per_unit": -55.5, "units": 150, "computed_amount": -8325, "method": "Paired Sales Analysis", "rationale": "Comp 1 is 150 SF larger than the subject (superior). At a reconciled rate of ~$55.50/SF, the GLA adjustment is approximately −$8,325. Round to nearest $50."}}, "C2": {"bath": {"direction": "negative", "amount": -6500, "method": "Paired Sales Analysis", "rationale": "Comp 2 has 2.5 baths versus the subject''s 2 full. The half-bath increment derived from paired sales is approximately $6,500."}}, "C3": {"gla": {"direction": "positive", "amount_per_unit": 55.5, "units": 100, "computed_amount": 5550, "method": "Paired Sales Analysis", "rationale": "Comp 3 is 100 SF smaller than the subject (inferior). At ~$55.50/SF, the GLA adjustment is approximately +$5,550."}}}, "step4_adjusted_prices": {"C1": {"unadjusted": 295000, "adjusted": 286675}, "C2": {"unadjusted": 291500, "adjusted": 285000}, "C3": {"unadjusted": 278000, "adjusted": 283550}}, "step4_reconciliation_narrative": "Adjusted prices bracket a tight range of approximately $283,550–$286,675, with all three comparables converging near $285,000. The market evidence is strongly consistent and supports a value indication in the middle of the bracket. Comp 2 (most similar before adjustments, with a single small adjustment) deserves the most weight.", "tolerance_note": "Student answers are accepted within ±5% of model derived values for paired-sales calculations and within the indicated reconciliation range. Step 3 adjustments accepted within ±12% of the computed amount."}'::jsonb
FROM scenarios s
JOIN scenario_categories sc ON sc.id = s.category_id
JOIN module_sections ms ON ms.id = sc.section_id
JOIN section_fields f ON f.section_id = ms.id AND f.field_key = 'adjustment_grid'
WHERE sc.code = 'M2-S4-C1'
  AND s.order_index = 1;

COMMIT;

-- ============================================================
-- Migration 008 complete.
-- Run schema audit:
--   SELECT field_type, COUNT(*) FROM section_fields GROUP BY field_type;
--   SELECT code, name FROM scenario_categories WHERE code LIKE 'M2-S4%';
--   SELECT title FROM scenarios s
--     JOIN scenario_categories c ON c.id = s.category_id
--     WHERE c.code LIKE 'M2-S4%';
-- ============================================================
