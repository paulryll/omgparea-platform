-- ============================================================
-- Migration 006 — Section 2 content (Scope of Work)
--
-- Seeds Section M2-S2:
--   - 6 categories (Mortgage, Litigation, Estate&Tax, Private,
--     Government, Specialty)
--   - 7 fields (inspection, reportType, approaches, dataResearch,
--     compParams, eaHc, justification)
--   - 60 scenarios (10 per category)
--   - 420 model answers (60 scenarios x 7 fields)
--   - Per-scenario field_options_override entries where the
--     artifact lists differ from the section defaults.
--
-- Idempotency: this migration runs once and is recorded in the
-- schemaversion table by the migration runner. It will never
-- run again.
-- ============================================================

-- Look up Section 2 (Scope of Work) id; bail if not found
DO $$
DECLARE
  v_section_id INT;
BEGIN
  SELECT id INTO v_section_id FROM module_sections WHERE code = 'M2-S2';
  IF v_section_id IS NULL THEN
    RAISE EXCEPTION 'Section M2-S2 not found — seed must run first';
  END IF;
END $$;

-- ─────────────── Section fields ───────────────
INSERT INTO section_fields (section_id, order_index, field_key, label, help_text, field_type, field_options)
SELECT ms.id, x.ord, x.key, x.label, x.help, x.type, x.opts
FROM module_sections ms,
  (VALUES
    (1, 'inspection', 'Extent of Property Inspection', 'Select all property inspection elements appropriate for this assignment.', 'checklist', '{"options":["Interior inspection of subject","Exterior inspection of subject","Exterior inspection of comparables","Enhanced condition assessment (health/safety)","Measurement of outbuildings/site improvements","Enhanced comparable verification (broker interviews)","No physical inspection (desktop)"]}'::jsonb),
    (2, 'reportType', 'Type of Report', 'Select the report format appropriate for the intended use and intended users.', 'select', '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","USPAP Appraisal Report (Form 1004C — Manufactured Home)","USPAP Appraisal Report (Form 1004 Desktop)","Restricted Appraisal Report"]}'::jsonb),
    (3, 'approaches', 'Approaches to Value', 'Select each approach you will develop and provide your justification for including or omitting each.', 'approaches', '{"options":["Sales Comparison Approach","Cost Approach","Income Approach"]}'::jsonb),
    (4, 'dataResearch', 'Extent of Data Research', 'Select all data sources you will research and verify.', 'checklist', '{"options":["MLS for comparable sales and listings","County assessor/tax records","Flood zone determination","Market conditions analysis (absorption rates, DOM)","Environmental hazard screening","Broker/agent interviews","Cost estimation services","Prior appraisal data","Prior sale history of subject","Permit records"]}'::jsonb),
    (5, 'compParams', 'Comparable Selection Parameters', 'Specify the search parameters you will use to identify comparable sales.', 'parameters', '{"fields":[{"name":"searchRadius","label":"Initial Search Radius","unit":"miles"},{"name":"expandedRadius","label":"Expanded Search Radius","unit":"miles"},{"name":"timeframeClosed","label":"Closed Sales Timeframe","unit":"months"},{"name":"timeframeActive","label":"Active/Pending Timeframe","unit":"months"},{"name":"glaRange","label":"GLA Variance (±)","unit":"%"},{"name":"ageRange","label":"Age Range (±)","unit":"years"}]}'::jsonb),
    (6, 'eaHc', 'Extraordinary Assumptions / Hypothetical Conditions', 'Describe any extraordinary assumptions or hypothetical conditions you will use.', 'text', NULL),
    (7, 'justification', 'Overall Scope Justification', 'Explain why the scope of work above is appropriate for this assignment, considering intended use, intended users, and any unusual factors.', 'text', NULL)
  ) AS x(ord, key, label, help, type, opts)
WHERE ms.code = 'M2-S2';

-- ─────────────── Categories ───────────────
INSERT INTO scenario_categories (section_id, order_index, code, name, color_primary, color_accent, description)
SELECT ms.id, x.ord, x.code, x.name, x.cp, x.ca, NULL
FROM module_sections ms,
  (VALUES
    (1, 'M2-S2-C1', 'Mortgage Lending', '#1a1a2e', '#2a2a4e'),
    (2, 'M2-S2-C2', 'Litigation Support', '#4a1942', '#6a2962'),
    (3, 'M2-S2-C3', 'Estate & Tax', '#0f4c3a', '#1f6c5a'),
    (4, 'M2-S2-C4', 'Private/Consulting', '#8b4513', '#ab6533'),
    (5, 'M2-S2-C5', 'Government & Public Use', '#1a3a5c', '#2a5a7c'),
    (6, 'M2-S2-C6', 'Specialty Situations', '#6b1d1d', '#8b3d3d')
  ) AS x(ord, code, name, cp, ca)
WHERE ms.code = 'M2-S2';

-- ─────────────── Category 1: Mortgage Lending ───────────────
-- Scenarios for category M2-S2-C1

-- Scenario 1.1: Standard Purchase, Conventional Loan
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 1, 'basic', 'Standard Purchase, Conventional Loan', 'A borrower is purchasing a 3-bedroom, 2-bath ranch home built in 1998 in an established subdivision. Conventional loan, 80% LTV. The property is in good condition with no unusual features. Active market with abundant comparable sales.

— Problem Identification (from Section 1) —
Client: ABC Mortgage Company
Intended Users: ABC Mortgage Company
Intended Use: Evaluate collateral adequacy for mortgage lending
Type and Definition of Value: Market Value (as defined by FIRREA/OCC)
Effective Date: Current (date of inspection)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, FIRREA, USPAP Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection of subject; exterior inspection of comparables. Standard — conventional purchase requires interior access per lender requirements and GSE guidelines.', NULL, '{"selected":[0,1,2]}'::jsonb, '{"options":["Interior inspection of subject","Exterior inspection of subject","Exterior inspection of comparables","Enhanced condition assessment (health/safety)","Measurement of outbuildings/site improvements","No physical inspection (desktop)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report (Fannie Mae Form 1004/URAR). Standard form report meets lender and secondary market requirements.', NULL, '{"selected":0}'::jsonb, NULL),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and most reliable for residential lending.","Include; property is under 25 years old, cost data is meaningful.","Omit; owner-occupied SFR in area with no significant rental market, not required by lender."]}'::jsonb, NULL),
    ('dataResearch', 'MLS for comparable sales and listings; county assessor records for property data and prior sales; flood zone determination; market conditions analysis. Standard sources sufficient given active market.', NULL, '{"selected":[0,1,2,3]}'::jsonb, '{"options":["MLS for comparable sales and listings","County assessor/tax records","Flood zone determination","Market conditions analysis (absorption rates, DOM)","Environmental hazard screening","Broker/agent interviews","Cost estimation services","Prior appraisal data","NADA/manufacturer guides","Conservation easement registries","FEMA flood maps and elevation certificates"]}'::jsonb),
    ('compParams', 'Search radius 1 mile initial, expand to 3 miles if needed. 6 months closed, 3 months active/pending. ±20% GLA, ±10 years age. Same subdivision preferred, same school district minimum.', NULL, '{"values":{"searchRadius":"1","expandedRadius":"3","timeframeClosed":"6","timeframeActive":"3","glaRange":"20","ageRange":"10"}}'::jsonb, NULL),
    ('eaHc', 'None required. Subject is accessible, condition is verifiable, standard market conditions prevail.', NULL, NULL, NULL),
    ('justification', 'Standard scope is appropriate. Assignment conditions are routine — conventional purchase, cooperative borrower, typical property, active market. GSE guidelines and lender instructions define minimum scope. No factors require expanded or limited scope. Competency is met through experience with similar properties in this market.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.2: FHA Purchase, First-Time Buyer
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 2, 'basic', 'FHA Purchase, First-Time Buyer', 'A first-time buyer is purchasing a 1965 split-level using an FHA loan at 96.5% LTV. The property has a partial basement, original windows, and an older roof. Neighborhood is stable with moderate sales activity.

— Problem Identification (from Section 1) —
Client: National Home Lending Inc.
Intended Users: National Home Lending Inc., HUD/FHA
Intended Use: Evaluate collateral adequacy and FHA minimum property requirements
Type and Definition of Value: Market Value (HUD definition)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, FIRREA, FHA/HUD Handbook 4000.1, Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection of subject with enhanced attention to health/safety deficiencies per FHA requirements (roof life, lead paint disclosure for pre-1978, mechanical systems, structural integrity). Exterior inspection of comparables. FHA adds property condition requirements beyond conventional scope.', NULL, '{"selected":[0,1,2,3]}'::jsonb, '{"options":["Interior inspection of subject","Exterior inspection of subject","Exterior inspection of comparables","Enhanced condition assessment (health/safety)","Measurement of outbuildings/site improvements","No physical inspection (desktop)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report (FHA Form 1004/URAR with FHA addenda). Must include FHA-specific certifications and property condition commentary.', NULL, '{"selected":4}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","USPAP Appraisal Report (Form 1004C — Manufactured Home)","USPAP Appraisal Report (Form 1004 Desktop)","USPAP Appraisal Report (Form 1004 with FHA Addenda)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary.","Include; useful for an older property where renovation/depreciation analysis supports value conclusion.","Omit; owner-occupied, not required."]}'::jsonb, NULL),
    ('dataResearch', 'MLS; county records; FHA case number and prior appraisal check (FHA Connection); flood zone; environmental hazard screening (proximity to high-voltage lines, underground storage tanks); market conditions. FHA requires enhanced environmental awareness beyond conventional assignments.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["MLS for comparable sales and listings","County assessor/tax records","Flood zone determination","Market conditions analysis (absorption rates, DOM)","Environmental hazard screening","FHA case number / prior appraisal check","Cost estimation services","Prior appraisal data","Broker/agent interviews"]}'::jsonb),
    ('compParams', 'Search radius 1 mile, expand to 5 miles in suburban/rural areas. 6 months closed, 3 months active/pending. Prioritize FHA-financed sales if available. Similar age and style preferred given split-level design.', NULL, '{"values":{"searchRadius":"1","expandedRadius":"5","timeframeClosed":"6","timeframeActive":"3","glaRange":"20","ageRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'May need EA if roof or systems appear near end of useful life but are currently functional — "Extraordinary Assumption that the roof is structurally sound; a qualified inspection is recommended." If repairs are required for FHA compliance, note as subject to completion.', NULL, NULL, NULL),
    ('justification', 'Scope exceeds standard conventional due to FHA requirements. HUD Handbook 4000.1 mandates additional property condition analysis, health/safety evaluation, and environmental screening. High LTV increases lender risk and supports thorough scope. Appraiser must be FHA-approved — competency requirement is specific.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.3: Conventional Refinance, Limited Data Market
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 3, 'basic', 'Conventional Refinance, Limited Data Market', 'A borrower is refinancing a 4-bedroom colonial on a 2-acre lot in a semi-rural area. Conventional loan, 70% LTV. The area has limited recent sales — only 8 closed transactions within 5 miles in the past 12 months. The property has a detached workshop and in-ground pool.

— Problem Identification (from Section 1) —
Client: Regional Credit Union
Intended Users: Regional Credit Union
Intended Use: Evaluate collateral adequacy for refinance
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, FIRREA, Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior of subject with detailed documentation of site improvements (workshop, pool). Exterior of comparables with enhanced verification — in limited-data markets, greater reliance on each comparable requires more thorough verification of sale conditions.', NULL, '{"selected":[0,1,2,4,5]}'::jsonb, '{"options":["Interior inspection of subject","Exterior inspection of subject","Exterior inspection of comparables","Enhanced condition assessment (health/safety)","Measurement of outbuildings/site improvements","Enhanced comparable verification (broker interviews)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report (Form 1004). Consider addenda for supplemental market analysis explaining limited data conditions.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Form 1004 with Market Analysis Addenda)","USPAP Appraisal Report (Narrative Format)","USPAP Appraisal Report (Form 1004 Desktop)","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required; will need expanded search parameters and strong narrative explaining adjustments.","Include and give significant weight; limited sales data increases reliance on cost as a value indicator, especially for site improvements.","Consider if rental market exists for similar properties; otherwise omit with explanation."]}'::jsonb, NULL),
    ('dataResearch', 'MLS with expanded parameters; county records for all sales including FSBO and non-MLS; broker interviews for pending and pocket listings; cost estimation services for workshop/pool; market trend data to support time adjustments. Enhanced research is critical in data-limited markets.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for comparable sales and listings","MLS with expanded geographic/time parameters","County records for all sales (including FSBO/non-MLS)","Broker interviews for pending/pocket listings","Cost estimation services (workshop/pool)","Market trend data for time adjustments","Flood zone determination","Environmental hazard screening"]}'::jsonb),
    ('compParams', 'Search radius 5–10 miles given rural character. 12 months closed, extend to 18 if necessary with time adjustments. Must bracket for acreage, GLA, and site improvements. May need to use sales without pools/workshops and make supported adjustments.', NULL, '{"values":{"searchRadius":"5","expandedRadius":"10","timeframeClosed":"12","timeframeExtended":"18","glaRange":"25","ageRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'Possible EA: "Extraordinary Assumption that the detached workshop was constructed with required permits and meets applicable building codes." Appraiser should request permit verification but may not be able to confirm independently.', NULL, NULL, NULL),
    ('justification', 'Scope must expand beyond standard due to limited market data and atypical site improvements. Additional data sources, extended search parameters, and enhanced cost approach are necessary to produce credible results. The appraiser should explicitly discuss data limitations and their impact on the reliability of the value conclusion. Lower LTV provides some risk offset.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.4: VA Purchase, New Construction
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 4, 'intermediate', 'VA Purchase, New Construction', 'An active-duty service member is purchasing a newly constructed 4-bedroom home in a subdivision where the builder has completed 12 homes but 6 are still under construction. VA loan, 100% LTV. The subject is 90% complete with projected completion in 30 days. Model home is available for inspection.

— Problem Identification (from Section 1) —
Client: Veterans First Mortgage
Intended Users: Veterans First Mortgage, U.S. Department of Veterans Affairs
Intended Use: Evaluate collateral adequacy and VA minimum property requirements
Type and Definition of Value: Market Value (VA definition)
Effective Date: Current (prospective upon completion)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — valued as if construction is complete per plans and specifications
USPAP / Other Standards: Standards 1 & 2, FIRREA, VA Circular 26-18-30 (or current), Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Inspect subject at current construction stage; inspect model home for finish-level reference; review plans, specifications, and builder contract. Exterior inspection of comparables. Must document stage of construction. Re-inspection required upon completion.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["Interior inspection of subject at current construction stage","Inspection of model home for finish-level reference","Exterior inspection of subject","Exterior inspection of comparables","Review of plans, specifications, and builder contract","Re-inspection upon completion required"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report (Form 1004 with VA addenda). Must include "subject to completion per plans and specifications" condition. Include photos of current construction and model home finishes.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Form 1004 with VA Addenda, Subject to Completion)","USPAP Appraisal Report (Narrative Format)","USPAP Appraisal Report (Form 1004 Desktop)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required; use builder''s closed sales plus resales of similar new construction in competing subdivisions.","Essential for new construction; provides direct support through builder cost data. Analyze market-to-cost relationship.","Omit; owner-occupied."]}'::jsonb, NULL),
    ('dataResearch', 'Builder sales records and price sheets; MLS for competing subdivisions; county permits; plans and specs; contract with options/upgrades; absorption rate analysis; lot premium analysis. VA requires analysis to determine if builder prices are supported by the broader market.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for competing new construction subdivisions","Builder sales records and price sheets","County permit records","Plans and specifications review","Builder contract with options/upgrades","Absorption rate analysis for subdivision","Lot premium analysis","Resale comparable to test market acceptance"]}'::jsonb),
    ('compParams', 'Prioritize closed sales in subject subdivision, then competing new subdivisions within 5 miles. 6 months timeframe. Include at least one resale to test market acceptance. Adjust for concessions, upgrades, and lot premiums. Age 0–3 years.', NULL, '{"values":{"searchRadius":"5","timeframeClosed":"6","ageRange":"3"}}'::jsonb, NULL),
    ('eaHc', 'Hypothetical Condition: "The property is valued as if complete per the plans and specifications dated [date], provided by [builder]. The appraiser has not verified that construction will be completed as specified." Also possible EA regarding completion timeline and market conditions at completion.', NULL, NULL, NULL),
    ('justification', 'Expanded scope due to new construction conditions, prospective valuation, VA-specific requirements, and 100% LTV risk. Must analyze builder pricing independent of market data, assess subdivision absorption, and provide a value conclusion contingent on completion. Re-inspection upon completion is part of total scope. Competency in new construction analysis is required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.5: Desktop Appraisal, GSE Waiver Program
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 5, 'intermediate', 'Desktop Appraisal, GSE Waiver Program', 'A borrower is refinancing a 2019-built townhome in a large planned community. The loan qualifies for Fannie Mae''s value acceptance plus property data program — the lender is ordering a desktop appraisal. No interior inspection. Previously appraised 2 years ago. Conventional loan, 60% LTV.

— Problem Identification (from Section 1) —
Client: MegaBank Mortgage Division
Intended Users: MegaBank Mortgage Division, Fannie Mae
Intended Use: Evaluate collateral adequacy under desktop appraisal scope
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple (subject to HOA)
Extraordinary Assumptions / Hypothetical Conditions: EA — property condition consistent with data sources and prior appraisal
USPAP / Other Standards: Standards 1 & 2, FIRREA, Fannie Mae Desktop Appraisal Guidelines, Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'No physical inspection. Desktop analysis using MLS data, public records, aerial/street-level imagery, prior appraisal data, borrower-provided information. This is a significant scope limitation that must be disclosed. The appraiser must determine whether credible results can be achieved without inspection.', NULL, '{"selected":[3,4,5,6,7]}'::jsonb, '{"options":["Interior inspection of subject","Exterior inspection of subject","Exterior inspection of comparables","No physical inspection (desktop analysis)","MLS data and photography review","Aerial/street-level imagery review","Prior appraisal data review","Borrower-provided information review"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report (Fannie Mae Desktop Appraisal Form 1004 Desktop). Must include robust disclosure of scope limitations and their impact on reliability.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Fannie Mae Form 1004 Desktop)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0],"justifications":["Required and primary.","May omit; relatively new, but without physical inspection, condition-based depreciation is speculative.","Omit; owner-occupied townhome."]}'::jsonb, NULL),
    ('dataResearch', 'Desktop scope demands maximum utilization of all available data sources to compensate for lack of physical inspection. All listed sources should be consulted.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS (photos, descriptions, DOM)","County assessor/tax records","Fannie Mae Collateral Underwriter data","Prior appraisal (if accessible)","HOA documents for assessments/litigation","Aerial imagery (Google Earth, county GIS)","Street-level imagery","Flood zone determination"]}'::jsonb),
    ('compParams', 'Same planned community preferred — high comparability reduces risk from limited inspection. 1–3 miles. 6 months closed, 3 months active/pending. Prioritize same floor plan. Must verify through multiple data sources since physical verification is not possible.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"6","timeframeActive":"3"}}'::jsonb, NULL),
    ('eaHc', 'Extraordinary Assumption: "The subject property interior condition and features are consistent with the data sources reviewed, including MLS records, public records, and the prior appraisal dated [date]. No interior inspection was performed. If the actual condition differs materially, the value conclusion may require revision." This EA is central to the assignment and must be prominently disclosed.', NULL, NULL, NULL),
    ('justification', 'Scope is intentionally limited by the assignment conditions (lender/GSE desktop program). The appraiser must explicitly address USPAP''s requirement to determine whether credible results can be achieved. Low LTV, recent construction, planned community setting, and prior appraisal data support feasibility. If the appraiser determines credible results cannot be achieved, the appraiser must withdraw or request scope expansion. This is a critical professional judgment decision.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.6: Jumbo Loan, Luxury Property
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 6, 'advanced', 'Jumbo Loan, Luxury Property', 'A borrower is purchasing a 6,200 SF custom home on 5 acres with a guest house, pool complex, and equestrian facilities. Sale price $2.1 million. Non-conforming jumbo loan, portfolio lender, 75% LTV. Property has been on market 14 months with two price reductions. Only 3 sales over $1.5M within 15 miles in the past year.

— Problem Identification (from Section 1) —
Client: Private Wealth Lending Group
Intended Users: Private Wealth Lending Group
Intended Use: Evaluate collateral adequacy for portfolio jumbo lending
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, FIRREA (if federally related), Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive interior and exterior of subject including all site improvements — each must be separately measured and documented. Exterior of comparables with enhanced verification including broker interviews. Small pool of high-value sales means each comparable must be thoroughly vetted.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Separate measurement of all site improvements","Guest house inspection and measurement","Pool complex documentation","Equestrian facilities documentation","Exterior inspection of comparables","Broker/agent interviews for comparables","Enhanced comparable verification"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format recommended. Complexity exceeds what a standard form can adequately address. Portfolio lender may have specific reporting requirements. Extensive addenda needed.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","USPAP Appraisal Report (Form 1004 with Addenda)","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required but challenging; very limited data requiring expanded search and significant adjustments.","Essential; may be the most reliable indicator given limited sales. Supports site improvement analysis.","Consider; luxury properties may have rental potential. If guest house is income-producing, include. At minimum, analyze GRMs."]}'::jsonb, NULL),
    ('dataResearch', 'This assignment demands research well beyond standard sources. Regional MLS; luxury databases; county records for non-MLS transfers; cost services for equestrian/custom features; agent interviews for all comparables; price history and DOM analysis; luxury market stratification.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["MLS with expanded geographic search (regional)","Luxury property databases and brokerages","County records for all high-value transfers","Cost estimating services for custom features","Equestrian/agricultural property databases","Agent interviews for all comparable sales","Price history and DOM analysis","Market stratification analysis (luxury segment)","Competing listings analysis"]}'::jsonb),
    ('compParams', '15–25+ miles to find bracket comparables. 12–18 months. Must bracket GLA, acreage, and price. Competing listings analysis critical given extended DOM. Document why each comparable was selected.', NULL, '{"values":{"searchRadius":"25","timeframeClosed":"12","timeframeExtended":"18"}}'::jsonb, NULL),
    ('eaHc', 'Consider EA regarding contributory value of equestrian facilities if market support is limited: "Extraordinary Assumption that the equestrian improvements contribute value consistent with the cost-to-cure analysis; limited market data exists to directly support this adjustment." May also need EA regarding guest house permit status.', NULL, NULL, NULL),
    ('justification', 'Significantly expanded scope across all dimensions. Limited data, complex site improvements, extended marketing time, and high dollar amount demand comprehensive analysis. Competency in luxury valuation and specialized improvements required. Extended marketing history raises questions about market acceptance at contract price. Fee and timeline must reflect expanded scope.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.7: Manufactured Home on Leased Land
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 7, 'advanced', 'Manufactured Home on Leased Land', 'A borrower is purchasing a 2016 double-wide manufactured home on a rented lot in an 85-lot manufactured home community. Lot lease $450/month with 3% annual increases. Home converted to real property via foundation affidavit but remains on leased land. FHA Title II, 95% LTV.

— Problem Identification (from Section 1) —
Client: Community First Lending
Intended Users: Community First Lending, HUD/FHA
Intended Use: Evaluate collateral adequacy for FHA Title II manufactured home lending
Type and Definition of Value: Market Value (HUD definition)
Effective Date: Current
Property Interest: Leasehold (home as real property on leased land)
Extraordinary Assumptions / Hypothetical Conditions: EA regarding lease renewal terms
USPAP / Other Standards: Standards 1 & 2, FIRREA, FHA Manufactured Home Guidelines (HUD 4000.1), Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior with manufactured home-specific requirements: HUD data plate/label verification, foundation certification per FHA permanent foundation requirements, utility connections, skirting, anchoring. Review community common areas. Verify real property conversion documentation.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection of subject","HUD data plate and label verification","Foundation inspection/certification review","Utility connections, skirting, anchoring inspection","Community common areas and amenities review","Exterior inspection of comparables","Real property conversion documentation verification"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report (Form 1004C — Manufactured Home Appraisal Report). FHA addenda required. Must include HUD label numbers, foundation certification reference, and leasehold analysis.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Form 1004C — Manufactured Home)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required; must use only real-property manufactured home sales (not chattel). Distinguish fee simple vs. leasehold comparables.","Include; manufactured home cost data readily available. Depreciation must address physical, functional, and external (leasehold) factors.","Consider for leasehold analysis; lot rent is an encumbrance affecting value. Analyze rent differential to quantify leasehold discount."]}'::jsonb, NULL),
    ('dataResearch', 'MLS filtered for manufactured homes on permanent foundations; NADA guide; county records to verify property classification of comps (common error source); community lease terms and financial stability; HUD data plate; foundation certification; FHA eligibility verification.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS filtered for manufactured homes on permanent foundations","NADA manufactured home guide for cost data","County records to verify real vs. personal property classification","Community lease terms, rules, financial stability","HUD data plate information","Foundation certification documentation","FHA manufactured home eligibility verification","Rental data for leasehold analysis"]}'::jsonb),
    ('compParams', '5–15 miles; prioritize same community then other manufactured home communities. 12 months. Must compare leasehold-to-leasehold when possible. If using fee simple sales, quantify leasehold adjustment. Single-wide vs. double-wide distinction is critical.', NULL, '{"values":{"searchRadius":"15","timeframeClosed":"12","glaRange":"20","ageRange":"10"}}'::jsonb, NULL),
    ('eaHc', 'EA: "Extraordinary Assumption that the lot lease will be renewed at terms consistent with the current lease agreement including the 3% annual escalation clause. If the lease is not renewed or terms change materially, the value conclusion may be affected." Also consider EA regarding community financial stability and long-term viability.', NULL, NULL, NULL),
    ('justification', 'Complex assignment requiring specialized competency in manufactured housing, leasehold valuation, and FHA manufactured home guidelines. The leasehold interest requires distinct analysis from fee simple. FHA adds regulatory requirements for foundation certification, HUD label verification, and eligibility. Competency Rule compliance is critical.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.8: Mixed-Use Property, Residential with Commercial Space
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 8, 'expert', 'Mixed-Use Property, Residential with Commercial Space', 'A borrower is purchasing a 2,800 SF single-family residence with an attached 600 SF commercial space (dental office for 20 years). Borrower intends to convert commercial back to residential. Zoning allows both uses. Separate utilities, entrance, ADA restroom. Conventional, 80% LTV. Lender wants residential-only valuation.

— Problem Identification (from Section 1) —
Client: Heritage Savings Bank
Intended Users: Heritage Savings Bank
Intended Use: Evaluate collateral adequacy for conventional residential lending
Type and Definition of Value: Market Value (as residential property)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — valued as if commercial space converted to residential
USPAP / Other Standards: Standards 1 & 2, FIRREA, Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive inspection of entire property including commercial space. Document current configuration, photograph commercial space and conversion feasibility indicators (structural walls, plumbing, HVAC, separate entrance). Assess cost to convert.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["Interior and exterior inspection of entire property","Document current commercial space configuration","Assess conversion feasibility (structural, plumbing, HVAC)","Photograph commercial space and conversion indicators","Exterior inspection of comparables","Measurement of both residential and commercial areas"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report (Form 1004 with extensive addenda). The HC requires robust disclosure. Supplemental addenda needed for: current vs. hypothetical use analysis, conversion cost estimate, HABU analysis, and HC impact reconciliation.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Form 1004 with Extensive Addenda)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required; find comparables that bracket total size as-if-converted. Analyze both residential-only and mixed-use sales.","Critical; basis for conversion cost estimates and supports as-converted value. Must account for superadequacy of commercial features.","Consider analyzing property as-is (mixed-use) to test HABU; compare income value vs. residential-only value to determine if HC is reasonable."]}'::jsonb, NULL),
    ('dataResearch', 'Two sets of data needed: residential sales of comparable size for as-converted analysis, plus mixed-use/commercial data for HABU testing. Contractor estimates for conversion. Zoning and permit history. Commercial rent data to test whether mixed-use is actually HABU.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for residential sales of comparable total size","MLS and commercial databases for mixed-use sales","Contractor estimates for conversion costs","Zoning/building code requirements for conversion","Permit history of commercial space","Market analysis for residential and commercial demand","Comparable rent data for commercial space (HABU test)"]}'::jsonb),
    ('compParams', 'Two comparable sets: (1) Residential sales of ~3,400 SF for as-converted analysis; (2) Mixed-use or converted properties for market behavior. 3–5 miles, 12 months.', NULL, '{"values":{"searchRadius":"5","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'HC: "At the direction of the client, the property is valued under the hypothetical condition that the 600 SF commercial space has been converted to residential use. The cost to convert is estimated at $[amount]. This HC is used because the borrower intends to convert the space and the lender requires a residential-only valuation." Must also address: if HABU is actually mixed-use, the appraiser must disclose this analysis even while complying with the client-requested HC.', NULL, NULL, NULL),
    ('justification', 'Significant complexity: HC requiring HABU verification, conversion cost estimation, and dual comparable analysis. The appraiser must balance client instruction (value as residential) with USPAP obligations (HABU analysis, HC disclosure). If HABU indicates mixed-use is highest and best, this must be disclosed even while complying with the HC. Requires competency in both residential and commercial-to-residential conversion analysis.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.9: REO Property, As-Is and As-Repaired Values
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 9, 'expert', 'REO Property, As-Is and As-Repaired Values', 'A bank-owned REO property: 1955 cape cod with significant deferred maintenance — roof leak with water damage, non-functional HVAC, Federal Pacific electrical panel, damaged flooring, possible mold. Transitional neighborhood where renovated homes sell 2–3x distressed prices. Lender needs both as-is and as-repaired values for disposition decision.

— Problem Identification (from Section 1) —
Client: National Asset Recovery (servicing bank)
Intended Users: National Asset Recovery, potential purchasers/investors
Intended Use: Asset disposition — as-is and as-repaired values for repair vs. sell-as-is strategy
Type and Definition of Value: Market Value As-Is and Market Value As-Repaired (two values)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC for as-repaired value — valued as if repairs completed
USPAP / Other Standards: Standards 1 & 2, FIRREA (if federally related), Ethics & Competency Rules'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive inspection with enhanced condition documentation. Detailed description and photography of all deficiencies. Health/safety identification. Must support both valuations. Recommend professional inspections for mold and electrical.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Comprehensive interior and exterior inspection","Enhanced condition documentation and photography","Health/safety hazard identification (mold, electrical, structural)","Detailed deficiency cataloging for cost-to-cure","Recommend professional inspections (mold, electrical)","Exterior inspection of comparables","Enhanced comparable verification"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with two separate value conclusions recommended. Form 1004 may be insufficient. Extensive addenda for condition assessment, repair cost estimates, and dual comparable analyses.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format — Two Value Conclusions)","Two Separate USPAP Appraisal Reports","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for both: distressed sales for as-is, renovated sales for as-repaired. Two separate analyses needed.","Both values: as-is with heavy depreciation (itemized), as-repaired with depreciation cured.","Consider for investor analysis; both as-is (investor rental return) and as-repaired (stabilized rental) support investment decision-making."]}'::jsonb, NULL),
    ('dataResearch', 'Two market segments to research: distressed and renovated. Contractor estimates for itemized repairs. County records for buy-renovate-sell patterns. Environmental databases. Transitional neighborhood trend analysis. Rental data. Investor activity data.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for distressed and renovated sales","Contractor estimates/cost databases for repairs","County records for renovation permits and price patterns","Environmental databases (mold/hazardous materials)","Neighborhood trend analysis (transitional market)","Rental data for income analysis","Investor activity and absorption rates","REO/short sale/auction transaction data"]}'::jsonb),
    ('compParams', 'Two distinct sets: (1) As-Is — distressed, REO, investor purchases, 1–3 miles, 12 months, verify sale conditions carefully. (2) As-Repaired — renovated/updated sales in similar neighborhoods. Must bracket both ends of value spectrum. Analyze location within transition pattern.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'As-Repaired HC: "Valued as if repairs completed in workmanlike manner: roof, HVAC, electrical panel upgrade, water/mold remediation, flooring, cosmetic updating. Estimated cost $[amount]." As-Is EA: "EA that no environmental contamination exists beyond observable mold. Professional assessment not performed." Also EA regarding Federal Pacific panel safety.', NULL, NULL, NULL),
    ('justification', 'Dual-valuation assignment requiring comprehensive scope for both scenarios. Each represents distinct analysis with separate comparables, adjustments, and conclusions. Transitional neighborhood adds complexity — two price points reflecting different buyer pools. Health/safety conditions require disclosures and professional inspection recommendations. Multiple intended users expand disclosure requirements. Requires advanced competency in distressed property valuation, cost estimation, and investment analysis.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 1.10: Construction-to-Perm, Rural, Flood Zone, Conservation Easement
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 10, 'expert', 'Construction-to-Perm, Rural, Flood Zone, Conservation Easement', 'Construction-to-permanent loan for a 3,800 SF custom home on 25 acres. Conservation easement on 15 acres (agricultural only). Remaining 10 acres include building envelope with barn, equipment shed, detached garage. Building site partially in FEMA Zone AE. Foundation to be elevated 3'' above BFE. Very limited comparable sales. Lender requires three values: as-is (land/outbuildings), upon completion, and upon stabilization.

— Problem Identification (from Section 1) —
Client: Farm & Country Lending Cooperative
Intended Users: Farm & Country Lending Cooperative
Intended Use: Collateral adequacy for construction-to-permanent lending at three stages
Type and Definition of Value: Market Value As-Is (land), Upon Completion, Upon Stabilization — three values
Effective Date: Current (as-is), Prospective (completion and stabilization)
Property Interest: Fee Simple subject to conservation easement
Extraordinary Assumptions / Hypothetical Conditions: Multiple HC/EA — prospective values, easement enforcement, flood mitigation, well/septic
USPAP / Other Standards: Standards 1 & 2, FIRREA, Ethics & Competency Rules, AO 17 (prospective value)'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 1
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Among the most extensive residential inspection scopes. Every physical and legal constraint must be documented: building envelope, flood boundaries, outbuildings, easement boundaries, access, utilities, topography. Full review of plans, easement document, FEMA maps, survey, soils/perc tests, contractor bids, permits.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Comprehensive site inspection of entire 25-acre parcel","Building envelope and flood zone boundary documentation","All existing outbuildings measured and documented","Conservation easement boundary identification","Access roads, well/septic locations, topography, drainage","Review architectural plans and specifications","Review conservation easement document","Review FEMA flood maps and survey/plat","Review soils/perc test, contractor bids, permits"]}'::jsonb),
    ('reportType', 'Narrative format required. No standard form can address three value conclusions, conservation easement analysis, flood zone impact, prospective valuation, and rural/agricultural context. Report likely 40+ pages with extensive addenda.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format, 40+ Pages)","USPAP Appraisal Report (Form 1004 with Addenda)","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for all three stages. As-Is: land with easement (compare encumbered vs. unencumbered). Completion/Stabilization: improved rural properties with extensive search.","Likely the most reliable for custom construction in data-limited rural market. Essential for all three stages.","Consider agricultural income potential for the 15 easement-restricted acres. Supports HABU analysis."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum scope across all data sources. Every listed source is appropriate for this assignment. The complexity and data limitations demand exhaustive research to support three value conclusions.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11]}'::jsonb, '{"options":["MLS for rural acreage and improved property sales","Land auction records","Conservation easement registries and comparable transactions","FEMA flood maps and elevation certificates","County records for all rural transfers","USDA/FSA data for agricultural land values","Cost estimation for custom construction","Contractor/builder cost verification","Well and septic installation costs","Local planning/zoning records","Interviews with rural/agricultural property specialists","Consultation with easement-holding organization"]}'::jsonb),
    ('compParams', 'Land: 20+ miles, 24 months, with and without easements. Improved: 25+ miles, 18–24 months. Must address acreage, easement, flood zone, outbuildings, location, access, utilities. Comparable selection rationale is the most critical element of credibility.', NULL, '{"values":{"landRadius":"20","landTimeframe":"24","improvedRadius":"25","improvedTimeframe":"24"}}'::jsonb, NULL),
    ('eaHc', 'Multiple required: (1) HC — Upon Completion per plans/specs. (2) HC — Upon Stabilization with all site improvements complete. (3) EA — Conservation easement continues per recorded terms. (4) EA — Foundation elevation meets FEMA/local requirements and Elevation Certificate will be issued. (5) EA — Site supports adequate well yield and septic capacity. Each must disclose impact on value and consequence if assumption proves false.', NULL, NULL, NULL),
    ('justification', 'The most complex residential lending assignment in this module. Three value conclusions at different times, conservation easement on 60% of site, FEMA flood zone, custom construction costs, extremely limited rural data, and multiple EAs create layered analytical complexity. Competency required in: rural valuation, easement analysis, flood impact, prospective/construction valuation, cost approach for custom construction, and agricultural land valuation. Competency Rule may require association with qualified specialists. Fee and timeline must reflect 20–40+ hours. This tests the appraiser''s ability to integrate multiple complex factors into coherent, credible, USPAP-compliant analysis.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- ─────────────── Category 2: Litigation Support ───────────────
-- Scenarios for category M2-S2-C2

-- Scenario 2.1: Divorce — Standard Marital Home
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 1, 'basic', 'Divorce — Standard Marital Home', 'An attorney representing the wife in a no-fault divorce requests an appraisal of the marital home — a 3-bedroom, 2-bath ranch built in 2005 in an established neighborhood. Both parties are cooperating. The home is in average condition with no unusual features. The attorney needs current market value for equitable distribution of marital assets. Active market with plentiful comparable sales.

— Problem Identification (from Section 1) —
Client: Sarah Mitchell, Esq. (wife''s attorney)
Intended Users: Sarah Mitchell, Esq.; opposing counsel; the court (if needed)
Intended Use: Equitable distribution of marital assets in divorce proceedings
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection with thorough documentation and photography. In litigation, the appraisal may be scrutinized by opposing counsel or a review appraiser, so documentation must be more detailed than standard lending work. Exterior inspection of comparables. Enhanced photography to support every conclusion — assume the report will be challenged.', NULL, '{"selected":[0,1,2]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Enhanced condition documentation/photography","Measurement of outbuildings/site improvements","No physical inspection (desktop)","Third-party inspector coordination"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format preferred for litigation. While a form report is technically USPAP-compliant, litigation work demands more detailed explanation and support for every decision. Narrative format allows thorough presentation that withstands cross-examination. The report may be entered as evidence.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report (Form 1004 with Litigation Addenda)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Must be developed with extra rigor — every adjustment should be market-extracted and defensible under cross-examination.","Include; property is under 20 years old and cost data is meaningful. In litigation, developing multiple approaches strengthens the credibility of the value conclusion if challenged.","Omit; owner-occupied SFR with no rental market relevance. Document the rationale for omission — opposing counsel may question why any approach was excluded."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus litigation-specific additions: prior sale history (opposing counsel will ask), any prior appraisals (must be aware of and address discrepancies), deed/title records to confirm ownership and interest. More thorough than lending work because the appraiser must anticipate adversarial questioning.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for comparable sales and listings","County assessor/tax records","Flood zone determination","Market conditions analysis","Prior sale history of subject (3–5 years)","Review of any prior appraisals of the subject","Deed and title records","Municipal records for permits/violations"]}'::jsonb),
    ('compParams', 'Tighter parameters than lending work — litigation demands the best available comparables, not just adequate ones. 1 mile initial, 3 expanded. 6 months closed. ±15% GLA (tighter than lending). Consider additional comparables beyond the minimum to anticipate opposing appraiser''s selections and preemptively address them.', NULL, '{"values":{"searchRadius":"1","expandedRadius":"3","timeframeClosed":"6","glaRange":"15","ageRange":"10"}}'::jsonb, NULL),
    ('eaHc', 'None required for this straightforward assignment. However, the appraiser should confirm with the attorney: (1) whether both parties will allow interior access, (2) whether any personal property is to be excluded from the valuation, and (3) whether the effective date is current or a retrospective date is needed. These should be resolved before beginning, not assumed.', NULL, NULL, NULL),
    ('justification', 'Standard scope with enhanced documentation appropriate for litigation context. Although the property and market are straightforward, the intended use (litigation/equitable distribution) requires a higher standard of support. Every conclusion should be defensible under cross-examination. The appraiser should be prepared for potential testimony and should document the file accordingly. The appraiser should also confirm whether they may be called as an expert witness — this affects file preparation and fee structure. No Competency Rule concerns for an experienced residential appraiser.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.2: Property Tax Appeal — Over-Assessment
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 2, 'basic', 'Property Tax Appeal — Over-Assessment', 'A homeowner believes their property tax assessment is too high and has retained an appraiser to support a tax appeal before the county Board of Equalization. The subject is a 4-bedroom colonial on a quarter-acre lot assessed at $485,000. The homeowner believes the market value is approximately $430,000. The assessment date was January 1 of the current year. The county uses a mass appraisal system.

— Problem Identification (from Section 1) —
Client: Homeowner (James Patterson)
Intended Users: James Patterson; County Board of Equalization; county assessor''s office
Intended Use: Support property tax appeal before Board of Equalization
Type and Definition of Value: Market Value (as of assessment date)
Effective Date: January 1 of current year (retrospective)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; jurisdictional requirements for tax appeal'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection with specific attention to verifying the assessor''s property record. Any discrepancies between the assessor''s data (square footage, room count, condition rating, quality grade) and actual property characteristics are key evidence in the appeal. Document errors with photographs and measurements.', NULL, '{"selected":[0,1,2,3,4]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Review of county assessor''s property card/record","Verify assessor''s data (SF, room count, condition) against actual","Document any errors in assessor''s records","No physical inspection (desktop)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with an addendum comparing the appraiser''s findings to the assessor''s record. The Board of Equalization needs to see specifically where and why the assessed value differs from market value. Some jurisdictions have specific report requirements for tax appeals — confirm with the local Board.', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report (Narrative with Assessment Comparison Addendum)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0],"justifications":["Required and primary. Must use sales as of or near the assessment date (January 1). This is the approach most persuasive to assessment boards. Focus on demonstrating that comparable sales near the assessment date support a lower value.","Consider but lower priority; the Board typically focuses on market evidence. If the assessor has used replacement cost in their methodology, analyzing cost may help identify where the discrepancy arises.","Omit; owner-occupied residential. Not relevant to the appeal."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus tax-appeal-specific data: assessor''s records for subject AND comparables (equity/uniformity analysis), assessment ratio studies, prior assessment history (trend), Board rules and deadlines. Consider an equity argument — are similar properties assessed at lower values? This requires researching assessed values of comparables, not just sale prices.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for sales near the assessment date","County assessor records for subject and comparables","Assessment ratio studies (if available)","Prior assessment history of the subject","Comparable properties'' assessed values for equity analysis","Board of Equalization rules and submission requirements","Market conditions as of assessment date"]}'::jsonb),
    ('compParams', 'Comparable sales must be near the January 1 assessment date — ideally 3 months before and after. Search radius 1–2 miles. The Board will be most persuaded by very similar properties selling for less than the assessed value. Also identify the assessor''s likely comparables to preemptively address them.', NULL, '{"values":{"searchRadius":"2","timeframeClosed":"6","glaRange":"15","ageRange":"10"}}'::jsonb, NULL),
    ('eaHc', 'None typically required. However, note that the effective date is retrospective (January 1), so the appraisal reflects market conditions as of that date, not current conditions. If the market has changed significantly since the assessment date, this distinction is important and should be clearly stated — it is not an EA/HC, but it requires careful market analysis as of a specific past date.', NULL, NULL, NULL),
    ('justification', 'The scope is shaped by the specific requirements of the tax appeal process. The appraisal must use the assessment date as the effective date (retrospective), comply with the Board''s procedural requirements, and address the assessor''s valuation methodology. The appraiser should present two arguments: (1) the market value is lower than assessed, supported by comparable sales, and (2) the assessment is not uniform/equitable compared to similar properties (if applicable). The appraiser should be prepared to testify before the Board and should understand the Board''s rules of procedure. Competency in the local tax appeal process is required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.3: Neighbor Dispute — Encroachment Impact
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 3, 'basic', 'Neighbor Dispute — Encroachment Impact', 'An attorney is representing a homeowner whose neighbor''s fence, driveway, and landscaping encroach approximately 4 feet onto the client''s property along a 120-foot boundary line. The encroachment has existed for 8 years. The attorney needs to establish the diminution in value caused by the encroachment to support a damages claim. The subject is a 3-bedroom ranch on a 0.40-acre lot in a suburban neighborhood.

— Problem Identification (from Section 1) —
Client: Attorney Lisa Wong (representing affected homeowner)
Intended Users: Lisa Wong, Esq.; opposing counsel; the court
Intended Use: Establish diminution in value from encroachment for damages claim
Type and Definition of Value: Market Value (before and after encroachment, or diminution)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — valued as if no encroachment exists (for ''before'' value)
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full interior/exterior inspection plus detailed encroachment documentation. The encroachment area must be precisely measured and photographed from multiple angles. The survey showing the true boundary vs. the encroachment is critical evidence. Inspect the encroaching improvements (fence, driveway, landscaping) to assess permanence and cure cost.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Detailed inspection and measurement of encroachment area","Photographic documentation of encroachment from multiple angles","Review of survey/plat showing boundary and encroachment","Inspection of neighboring property''s encroaching improvements","Exterior inspection of comparables"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with a dedicated diminution-in-value analysis section. The report must clearly present the ''before'' value (unencumbered), the ''after'' value (with encroachment), and the calculated diminution. This is a damages analysis that will be scrutinized in court — narrative format is essential.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format with Diminution Analysis)","Restricted Appraisal Report","Consulting Report (not an appraisal)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for both before and after values. For diminution analysis, attempt to find sales of properties affected by similar encroachments (rare but ideal). More likely, use standard comparables for the ''before'' value and then quantify the encroachment impact through analysis.","Useful for quantifying the cost to cure the encroachment (removal of fence, driveway reconfiguration, landscaping). The cost-to-cure provides one measure of damages, though it may differ from the market-based diminution.","Omit; owner-occupied residential. Not relevant."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus: survey/plat (essential legal evidence), title search for existing easements or boundary agreements, cost-to-cure estimates, and research on comparable encroachment situations. Finding sales of properties with known encroachment issues is difficult but ideal for direct market support. Legal research helps the appraiser understand how courts in the jurisdiction treat encroachment damages.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for comparable sales","County assessor/tax records","Survey/plat of subject showing encroachment","Title search for easements or boundary agreements","Cost to cure estimates (fence removal, driveway, landscaping)","Legal research on encroachment impacts in the jurisdiction","Sales of properties with known boundary/encroachment issues","Market perception studies on encroachment stigma"]}'::jsonb),
    ('compParams', 'Standard parameters for the ''before'' value: 1–2 miles, 6–12 months. For encroachment-impacted sales, expand search significantly — these are rare. The appraiser may need to develop the diminution through analytical methods rather than direct comparable evidence. Consider both the loss of usable land area and any stigma effect.', NULL, '{"values":{"searchRadius":"2","timeframeClosed":"12","glaRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'Hypothetical Condition for the ''before'' value: "The property is valued under the hypothetical condition that no encroachment from the adjacent property exists and the subject''s lot dimensions conform to the recorded plat." The ''after'' value reflects the property in its current encroached condition. The HC is necessary to establish the baseline for the diminution calculation. Note: the appraiser relies on the survey provided by the client for boundary determination — the appraiser is not a surveyor.', NULL, NULL, NULL),
    ('justification', 'This is a diminution-in-value assignment requiring a before-and-after analysis. The scope must support two value conclusions and the quantification of damages. The ''before'' value uses standard comparable analysis under an HC of no encroachment. The ''after'' value must quantify the impact of the encroachment on market value — this includes both the physical loss of usable area and any market perception/stigma effect. The cost-to-cure analysis provides an alternative measure of damages. The appraiser must be prepared to testify and should understand the legal framework for encroachment damages in the jurisdiction. This requires competency in litigation support and diminution-in-value methodology.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.4: Partition Action — Inherited Property, Unequal Contributions
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 4, 'intermediate', 'Partition Action — Inherited Property, Unequal Contributions', 'Three siblings inherited a lakefront vacation home from their parents. Two siblings want to sell; one wants to keep the property. The sibling who wants to keep it has invested $85,000 in improvements (new dock, screened porch, updated kitchen) over the past 5 years. The court needs a current market value and an opinion on the contributory value of the improvements to determine equitable buyout terms. The property is a 2,400 SF cottage built in 1972 on a lake lot.

— Problem Identification (from Section 1) —
Client: Judge Martha Chen (court-appointed) / Attorney for petitioning siblings
Intended Users: All three siblings; their respective attorneys; the court
Intended Use: Determine market value and contributory value of improvements for equitable partition
Type and Definition of Value: Market Value; Contributory Value of Improvements
Effective Date: Current
Property Interest: Fee Simple (1/3 undivided interest held by each sibling — valued as whole)
Extraordinary Assumptions / Hypothetical Conditions: HC — valued as if a single owner holds fee simple (not fractional interest)
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive inspection with specific emphasis on documenting each improvement made by the investing sibling. Must differentiate between the property''s base condition and the improvements — this distinction drives the partition equity calculation. Document lake frontage, dock, access. Obtain before-improvement records (photos, permits) if possible to establish baseline.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Detailed documentation of all improvements made by sibling","Measurement and photography of dock, porch, kitchen updates","Documentation of pre-improvement condition (from records/photos)","Lake frontage measurement and access documentation","Exterior inspection of comparables","Inspection of comparable lakefront properties"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with a dedicated contributory value section. The report must clearly present: (1) current market value of the whole property, (2) estimated value without the sibling''s improvements, and (3) contributory value of each improvement. Multiple parties with competing interests will review this report — clarity and transparency are essential.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format with Contributory Value Analysis)","Restricted Appraisal Report","Consulting Report with Valuation Component"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for current market value. Use lakefront sales with and without similar improvements to extract contributory values where possible. Paired sales analysis for dock, porch, kitchen.","Essential for contributory value analysis. Document cost of each improvement, then analyze depreciation and market contribution. Cost does not equal value — this distinction is critical in partition cases.","Consider; lakefront vacation properties may have rental income potential. If the property has been rented, income analysis supports the value conclusion and provides context for the partition decision."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus partition-specific data: permit records and contractor invoices to document actual costs, paired sales analysis to extract market contribution of each improvement type, deed/title confirming ownership shares, and rental data if applicable. The appraiser must distinguish between cost invested and value contributed.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for lakefront comparable sales","County assessor/tax records","Permit records for sibling''s improvements","Contractor invoices/receipts for improvements","Paired sales analysis for improvement contributions","Rental income data for lakefront properties","Deed/title records confirming ownership interests","Cost estimation for dock, porch, kitchen"]}'::jsonb),
    ('compParams', 'Lakefront sales on the same lake are ideal; expand to comparable nearby lakes if needed. 5–10 miles, 12 months. Need two categories of comparables: (1) properties with similar improvements (dock, updated kitchen, etc.) and (2) properties without them — the difference supports contributory value extraction. Seasonal sales patterns may affect lakefront markets.', NULL, '{"values":{"searchRadius":"10","timeframeClosed":"12","glaRange":"25"}}'::jsonb, NULL),
    ('eaHc', 'HC: "The property is valued as if held in fee simple by a single owner, not as a fractional/undivided interest." The court needs the whole-property value to determine buyout terms — fractional interest discounting is not applicable here. Also note: "The appraiser has relied on contractor invoices and permit records provided by [sibling] to document improvement costs. The appraiser has not independently verified all costs." This is an EA regarding the accuracy of cost documentation.', NULL, NULL, NULL),
    ('justification', 'This assignment requires two interrelated analyses: market value of the whole property and contributory value of specific improvements. The contributory value analysis is the more complex element — the appraiser must develop market evidence that cost invested does not necessarily equal value contributed, and must present this in a way that a court can rely on for equitable distribution. The lakefront location adds complexity through limited comparable data and seasonal market patterns. Multiple parties with competing interests require exceptional transparency and balance in the report. The appraiser should avoid advocacy for any party. Court appointment (if applicable) reinforces the expectation of independence.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.5: Eminent Domain — Partial Taking for Road Widening
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 5, 'intermediate', 'Eminent Domain — Partial Taking for Road Widening', 'A state DOT is acquiring a 15-foot strip along the front of a residential property for road widening. The subject is a 3-bedroom ranch on a 0.60-acre lot on a busy secondary road. The taking will remove 2 mature trees, require relocation of the mailbox and front landscaping, and reduce the front yard setback to the minimum allowed. The remaining property will still be functional but the home will be closer to the road. The DOT has made an initial offer that the homeowner''s attorney considers inadequate.

— Problem Identification (from Section 1) —
Client: Attorney David Park (representing homeowner/condemnee)
Intended Users: David Park, Esq.; DOT/acquiring authority; condemnation commission or court
Intended Use: Establish just compensation for partial taking in eminent domain proceedings
Type and Definition of Value: Market Value Before Taking; Market Value After Taking; Just Compensation (difference)
Effective Date: Date of taking (as established by DOT)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated — but before/after methodology requires specific analytical framework
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; Uniform Appraisal Standards for Federal Land Acquisitions (Yellow Book) if federally funded'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection plus detailed measurement and documentation of the taking area and everything affected. Must document the before condition exhaustively — after the taking occurs, this evidence is lost. Review DOT plans to understand the full scope of the project. Assess the remainder property: reduced setback, proximity to widened road, noise impact, visual impact. If DOT''s appraisal is available, review it to understand their methodology and address discrepancies.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Detailed measurement of taking area","Documentation of improvements within taking area (trees, landscaping)","Review of DOT plans/right-of-way maps","Assessment of remainder property after taking","Noise/traffic impact assessment (before and after)","Exterior inspection of comparables","Review of DOT''s appraisal (if available)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format, organized in the before-and-after framework standard for eminent domain. If the road project is federally funded, the Yellow Book (UASFLA) applies and has additional requirements beyond USPAP. The report must clearly separate the before value, the after value, and the damages calculation. Confirm with the attorney whether Yellow Book compliance is required.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, Before-and-After Format)","Yellow Book Compliant Appraisal Report","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for both before and after values. For the ''after'' value, try to find sales of properties affected by similar road-widening projects or reduced setbacks. Paired analysis of road-proximity impact is ideal.","Essential for quantifying the value of improvements taken (trees, landscaping) and for analyzing any cost-to-cure elements. Also useful for analyzing the proximity damage to the remainder.","Omit for this owner-occupied residential property. Not applicable."]}'::jsonb, NULL),
    ('dataResearch', 'Extensive research required. DOT plans and project specs are essential to understand the full impact. Sales of properties near similar road projects provide direct market evidence of proximity damage. Arborist estimates and landscaping costs document tangible losses. Traffic and noise studies support the intangible damages to the remainder. Must verify minimum setback requirements to confirm the remainder is still conforming.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for comparable sales","County assessor/tax records","DOT right-of-way plans and project specifications","DOT''s appraisal and offer documentation","Sales of properties impacted by similar road projects","Arborist estimate for tree replacement value","Landscaping replacement/restoration costs","Traffic studies (before and projected after)","Noise impact studies","Setback/zoning requirements"]}'::jsonb),
    ('compParams', 'Before value: standard parameters, 1–3 miles, 6–12 months. After value: expanded search (10–15 miles) to find properties impacted by road widening or similar projects. Impact comparables are rare — may need to search broadly. Must bracket the subject and demonstrate the measurable impact of the partial taking on the remainder.', NULL, '{"values":{"searchRadius":"3","afterRadius":"15","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'The before-and-after framework is not technically an HC — it is the standard eminent domain methodology. However, for the ''after'' value: "The property is valued as if the taking has been completed per the DOT plans dated [date], the road has been widened, and the remainder property has been restored to a usable condition." The appraiser assumes the project will be completed as planned. Also: "The appraiser has relied on the arborist''s estimate for tree replacement value and has not independently assessed arboricultural values." Jurisdictional rules may affect which damages are compensable — confirm with the attorney.', NULL, NULL, NULL),
    ('justification', 'Eminent domain requires a specialized before-and-after methodology and compliance with jurisdictional condemnation law. The scope must support two complete value conclusions and the quantification of both tangible damages (land taken, improvements destroyed) and intangible damages (proximity, noise, reduced privacy, aesthetics). The appraiser must understand what damages are compensable in the jurisdiction — not all impacts translate to compensable damages under the law. Yellow Book compliance adds requirements if the project is federally funded. The appraiser must be competent in eminent domain appraisal methodology and prepared for testimony before a condemnation commission or court. This is a specialized practice area requiring specific competency beyond general residential appraisal.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.6: Construction Defect — New Home, Multiple Systems
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 6, 'advanced', 'Construction Defect — New Home, Multiple Systems', 'Homeowners purchased a new-construction home 3 years ago for $520,000. They have discovered multiple construction defects: improper roof flashing causing water intrusion, foundation cracks from inadequate soil compaction, HVAC ductwork incorrectly sized, and window installation defects. They are suing the builder for damages. Their attorney needs the diminution in value caused by the defects, including both the cost to repair and any residual stigma after repairs are complete.

— Problem Identification (from Section 1) —
Client: Attorney Rebecca Torres (representing homeowners)
Intended Users: Rebecca Torres, Esq.; builder''s counsel; the court; potential mediator
Intended Use: Establish damages (diminution in value) from construction defects
Type and Definition of Value: Market Value As-Is (with defects); Market Value As-If-Repaired; Market Value As-If-No-Defects-Existed; Diminution/Stigma Analysis
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — as if defects never existed (for undamaged value); HC — as if repairs completed (for stigma analysis)
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with detailed defect documentation. However, the appraiser is not a structural engineer, roofer, or HVAC specialist — the appraiser must rely on expert reports for the technical assessment of defects. Review all engineering/inspection reports, contractor repair estimates, and original plans. The appraiser''s role is to translate the physical defects into market value impact, not to diagnose the defects themselves.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Detailed documentation of all visible defects","Review of engineering/inspection reports on defects","Review of contractor repair estimates","Review of original construction plans/specifications","Comparison of as-built vs. plans","Exterior inspection of comparables","Review of builder''s other projects for pattern"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with a comprehensive damages analysis presenting multiple value scenarios: (1) as-is with defects, (2) as-if-repaired, (3) as-if-no-defects-existed, and (4) residual stigma analysis (difference between repaired value and no-defects value). This multi-scenario approach is standard for construction defect litigation.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, Multi-Value Damages Analysis)","Restricted Appraisal Report","Consulting Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for all value scenarios. For stigma analysis, research sales of properties with known prior defects that were subsequently repaired — this is the most direct evidence of residual stigma. Paired analysis is ideal but rare.","Critical for repair cost analysis and for establishing the cost differential between proper and defective construction. The cost approach helps bridge between the engineering reports and the market value impact.","Omit; owner-occupied residential."]}'::jsonb, NULL),
    ('dataResearch', 'Extensive multi-disciplinary research. The appraiser must compile expert reports from multiple specialists and translate them into a unified market value impact analysis. Academic and industry research on construction defect stigma is important — courts have recognized that repaired defects can still impair market value. Building code analysis establishes the standard of care the builder failed to meet.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10]}'::jsonb, '{"options":["MLS for comparable sales","County assessor/tax records","Engineering/structural inspection reports","HVAC specialist reports","Roofing contractor repair estimates","Foundation repair specialist estimates","Original builder contract and specifications","Sales of properties with known/disclosed defect history","Academic/industry research on construction defect stigma","Builder warranty documentation","Building code requirements (to establish standard of care)"]}'::jsonb),
    ('compParams', 'Standard comparables: 1–3 miles, 6–12 months for the baseline (no-defect) value. Stigma comparables: broad regional search for properties with known/disclosed defect histories — may need to search 25+ miles and review disclosure records. This is the most challenging data to find and the most critical for the damages analysis.', NULL, '{"values":{"standardRadius":"3","stigmaRadius":"25","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'Multiple HCs needed: (1) "Valued as if no construction defects exist" — for the undamaged baseline. (2) "Valued as if all defects have been repaired per the specifications in [engineering firm]''s report" — for the repaired scenario. Also EA: "The appraiser has relied on the engineering and specialist reports identified herein for the technical assessment of construction defects. The appraiser is not an engineer and has not independently verified the technical findings." The stigma analysis itself requires no HC — it is the measured difference between repaired value and no-defect value.', NULL, NULL, NULL),
    ('justification', 'This is a multi-scenario damages analysis requiring coordination with multiple technical experts. The appraiser must quantify three elements of damages: (1) cost to repair, (2) value impact beyond repair cost (if as-repaired value is less than no-defect value), and (3) residual stigma. The stigma analysis is the most complex and contested element — opposing counsel will challenge it vigorously. The appraiser must have competency in construction defect damages methodology and understand the legal framework for damages in the jurisdiction. The appraiser should not opine on the technical defects themselves — that is the engineers'' role. The appraiser''s role is to translate physical defects into market value impact.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.7: Lending Fraud — Inflated Appraisal Claim
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 7, 'advanced', 'Lending Fraud — Inflated Appraisal Claim', 'A bank is suing a borrower and the original appraiser, alleging the original appraisal was inflated by $120,000 to facilitate a fraudulent loan. The bank''s attorney needs a retrospective appraisal as of the original loan date (3 years ago) to establish what the market value actually was at that time. The subject is a 4-bedroom home that sold at foreclosure 18 months ago for $285,000 after the original appraisal of $480,000. The bank''s loss exceeded $150,000.

— Problem Identification (from Section 1) —
Client: Attorney James Sullivan (representing lending institution)
Intended Users: James Sullivan, Esq.; defense counsel; the court; potential regulatory investigators
Intended Use: Establish retrospective market value at original loan date to quantify appraisal fraud damages
Type and Definition of Value: Market Value (retrospective — as of original loan date 3 years ago)
Effective Date: Date of original appraisal/loan closing (3 years ago)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: EA — property condition assumed consistent with original appraisal description (no current interior access)
USPAP / Other Standards: Standards 1 & 2, Standards 3 (Appraisal Review), Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Exterior inspection of current condition if accessible, but primary reliance on the original appraisal''s description and photos for the retrospective effective date. The property may have deteriorated since the loan date — current condition is NOT the condition being valued. MLS photos from the original sale period are critical. Must also review the original appraisal''s comparable selections to identify potential manipulation (cherry-picked comps, unsupported adjustments, omitted superior data).', NULL, '{"selected":[1,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject (current condition)","Exterior-only inspection of subject (current)","No inspection — property may be inaccessible or condition changed","Review of original appraisal report''s description and photos","Review of MLS listing photos from original sale period","Review of foreclosure sale documentation and condition","Exterior inspection of original comparable properties","Review original appraiser''s comparable selections"]}'::jsonb),
    ('reportType', 'Combined Standards 1 & 2 retrospective appraisal AND Standards 3 appraisal review report. The attorney needs both: (1) what the property was actually worth (Standards 1 & 2), and (2) a professional review of the original appraisal identifying the specific deficiencies, errors, or manipulations (Standards 3). These are complementary but distinct USPAP analyses.', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, Retrospective with Fraud Analysis)","USPAP Standards 3 Appraisal Review Report Only","Combined Standards 1 & 2 Appraisal Report plus Standards 3 Review Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required — using sales data as of the original loan date. Must reconstruct the market as it existed 3 years ago. Also analyze the original appraiser''s comparable selections to identify manipulation (inferior comps omitted, excessive positive adjustments, bracket violations).","Include to provide independent value support. Also compare against original appraiser''s cost analysis (if any) to identify discrepancies.","Omit; owner-occupied residential."]}'::jsonb, NULL),
    ('dataResearch', 'Must reconstruct the comparable market as of the original date. Independently identify ALL available comparables — not just the ones the original appraiser selected. This reveals whether better comparables were deliberately omitted. Review the complete loan file for red flags. If the original appraiser''s workfile is available through discovery, it may reveal the selection and adjustment process. Pattern evidence (other appraisals by the same appraiser) may support the fraud allegation.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS data as of original loan date (historical)","County records from original time period","Original appraisal report (complete review)","Loan file documentation","Borrower''s purchase contract from original transaction","Foreclosure documentation and timeline","Market conditions as of original loan date","All available comparables from original period (not just original appraiser''s selections)","Original appraiser''s workfile (if obtainable through discovery)","Pattern evidence — other appraisals by same appraiser"]}'::jsonb),
    ('compParams', 'Standard parameters applied to the retrospective date. Search for sales within ±6 months of the original loan date. The key analysis is not just finding comparables — it is demonstrating that the original appraiser''s selections were manipulated by showing which better comparables were available and were not used.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"6"}}'::jsonb, NULL),
    ('eaHc', 'EA: "The subject property''s condition as of the effective date (original loan date) is assumed to be consistent with the description and photographs contained in the original appraisal report dated [date]. No interior inspection was performed as of the effective date, and the current condition may differ from the retrospective effective date condition." This EA is necessary because the appraiser cannot inspect the property as it was 3 years ago. If the original appraisal''s condition description is itself suspected of being fraudulent, this must be disclosed as a limitation.', NULL, NULL, NULL),
    ('justification', 'This dual-purpose assignment combines a retrospective appraisal with an appraisal review — both serving litigation. The retrospective appraisal establishes what the property was worth at the time of the alleged fraud. The Standards 3 review identifies the specific deficiencies in the original appraisal. Together, they quantify the damages caused by the inflated appraisal. The appraiser must maintain independence — the analysis must be objective even though the client is the alleged victim. If the retrospective analysis shows the original appraisal was within a reasonable range, the appraiser must report that finding. This requires competency in retrospective valuation, Standards 3 review, and litigation support methodology. The appraiser should be prepared for extensive cross-examination on methodology, comparable selection, and the distinction between a poor-quality appraisal and a fraudulent one.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.8: Bankruptcy — Underwater Property, Strip-Off Analysis
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 8, 'expert', 'Bankruptcy — Underwater Property, Strip-Off Analysis', 'A homeowner has filed Chapter 13 bankruptcy. They own a primary residence with a first mortgage of $310,000 and a second mortgage (HELOC) of $85,000, totaling $395,000 in debt. The debtor''s attorney believes the property is worth less than $310,000, which would allow the second mortgage to be ''stripped off'' (treated as unsecured debt). The bankruptcy trustee has ordered an appraisal. If the value is even $1 above $310,000, the strip-off fails. The property is a 3-bedroom townhome in a declining market.

— Problem Identification (from Section 1) —
Client: Bankruptcy Trustee (court-ordered)
Intended Users: Bankruptcy Trustee; debtor''s attorney; second lienholder''s attorney; bankruptcy judge
Intended Use: Determine market value for lien strip-off analysis under Chapter 13
Type and Definition of Value: Market Value (per bankruptcy code — fair market value)
Effective Date: Date of bankruptcy petition filing
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated — but effective date is the petition filing date
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; Bankruptcy Code considerations'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Thorough interior/exterior inspection with enhanced documentation. In bankruptcy strip-off cases, the value threshold is binary and exact — every dollar matters. Any deferred maintenance must be documented as it supports a lower value (the debtor has incentive to understate condition; the second lienholder has incentive to overstate). The appraiser must be scrupulously objective as a court-appointed neutral. Review prior appraisals and AVMs to understand the full valuation history.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Enhanced condition documentation","Documentation of any deferred maintenance","Exterior inspection of comparables","Enhanced comparable verification","Review of prior appraisals (original loan, refinance)","Review of Automated Valuation Model (AVM) outputs for context"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with contextual explanation of the lien strip-off threshold. The bankruptcy judge needs to understand the value conclusion in the context of the $310,000 threshold. The report must be clear enough for judicial reliance and withstand challenge by the second lienholder''s attorney and potentially their own appraiser.', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format for Bankruptcy Court)","Restricted Appraisal Report","USPAP Appraisal Report (Narrative with Lien Analysis Context)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Must be developed with extraordinary precision — the value threshold is a specific dollar amount ($310,000). Comparable selection, adjustments, and reconciliation will be scrutinized by both sides.","Include as supporting evidence. In a declining market with a townhome, cost approach with heavy depreciation may confirm below-threshold value.","Consider if the townhome complex has significant rental activity; gross rent multiplier analysis may provide additional support. Otherwise omit."]}'::jsonb, NULL),
    ('dataResearch', 'Comprehensive research with emphasis on market decline documentation. Foreclosure activity, expired listings, and days-on-market trends all support a declining market narrative. AVM outputs provide context (though not determinative). HOA status is relevant for townhomes — financial distress in the HOA can impact value. Prior appraisals create a valuation timeline. Every data point matters when the threshold is a specific dollar amount.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["MLS for comparable sales near petition date","County assessor/tax records","Market conditions analysis (declining market documentation)","Foreclosure and distressed sale activity in the market","Prior appraisals of the subject","AVM outputs (Zillow, Redfin, etc.) for context","HOA financial status and assessments","Pending listings and expired listings analysis","Loan origination documents"]}'::jsonb),
    ('compParams', 'Tight parameters — this threshold analysis demands the closest possible comparables. Same complex/subdivision is ideal for townhomes. 1–2 miles, sales bracketing the petition date (3–6 months before and after). ±10% GLA for precision. Expect the second lienholder to challenge any comparable with aggressive positive adjustments, so select conservatively and support every adjustment.', NULL, '{"values":{"searchRadius":"2","timeframeClosed":"6","glaRange":"10"}}'::jsonb, NULL),
    ('eaHc', 'The effective date is the petition filing date, which may be weeks or months ago — this is a retrospective analysis if not current. No HC should be needed if the property is accessible and the petition date is recent. The appraiser should note: "The value conclusion represents the appraiser''s independent opinion and was not influenced by the lien threshold. The appraiser was not informed of the lien amounts prior to completing the analysis" (if true — discuss with the trustee whether to remain blind to the threshold).', NULL, NULL, NULL),
    ('justification', 'This assignment has extraordinary precision requirements — the value conclusion will determine whether a $85,000 lien survives or is eliminated. Both sides have strong financial incentives to challenge the appraisal. Court appointment as a neutral requires absolute objectivity. The appraiser must develop the analysis as if unaware of the threshold, document every step with litigation-grade thoroughness, and present a value conclusion with a narrow confidence interval. The declining market context must be supported by data, not assumed. The appraiser should be prepared for cross-examination by the second lienholder''s attorney, who will attempt to push the value above $310,000. Competency in bankruptcy-related valuation and understanding of the lien strip-off legal framework is required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.9: Environmental Contamination — Adjacent Property Stigma
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 9, 'expert', 'Environmental Contamination — Adjacent Property Stigma', 'A dry cleaner adjacent to a residential subdivision was found to have perchloroethylene (PCE) soil and groundwater contamination. A plume has been identified extending beneath 12 residential properties in the subdivision. Three homeowners are suing the dry cleaner''s property owner for diminution in value. The contamination is being actively remediated but full cleanup is estimated at 5–8 years. No physical damage to the homes has occurred — the claim is based on market stigma and the presence of monitoring wells on the residential lots.

— Problem Identification (from Section 1) —
Client: Attorney group (representing three homeowners as co-plaintiffs)
Intended Users: Plaintiff attorneys; defense counsel; the court; potential mediator; environmental consultants
Intended Use: Establish diminution in value from environmental contamination stigma
Type and Definition of Value: Market Value Unimpaired; Market Value Impaired; Diminution (for each of 3 properties)
Effective Date: Date contamination was publicly disclosed
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — unimpaired values assume no contamination; various EAs regarding remediation timeline
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection of all three properties with extensive documentation of contamination-related features: monitoring wells, remediation equipment, proximity to source. Photographic evidence is critical for court presentation. Must review all environmental reports — the appraiser is not an environmental scientist but must understand the contamination sufficiently to translate it into market impact. Inspect the broader neighborhood for visible stigma indicators.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of all three subject properties","Documentation of monitoring wells and remediation equipment on lots","Documentation of proximity to dry cleaner/contamination source","Review of environmental site assessment (Phase I & II)","Review of remediation plan and timeline","Review of plume maps showing contamination extent","Inspection of comparable properties (impaired and unimpaired)","Neighborhood impact assessment (signage, odor, visual)"]}'::jsonb),
    ('reportType', 'Combined USPAP Appraisal Report — narrative format with shared environmental analysis and individual property sections. Common elements (contamination description, market stigma analysis, remediation timeline) apply to all three properties. Individual sections address each property''s specific characteristics, proximity to the plume, and individual value conclusions. This is more efficient than three separate reports and provides consistent methodology that strengthens the analysis.', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, Environmental Diminution Analysis)","Three Separate Narrative Reports (one per property)","Combined Report with Individual Property Analyses and Common Elements"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0],"justifications":["Required and primary. Must develop unimpaired values (standard comparables) and impaired values. For impaired values, research sales near other known contamination sites. Environmental stigma studies and case law provide supplemental support. May need to apply environmental case study models (e.g., Mundy, Simons, or similar frameworks).","Limited utility — there is no physical damage to the homes. Cost approach cannot capture stigma. Omit with explanation.","Consider if properties have rental potential — environmental stigma may differentially affect rental vs. sale value. Otherwise omit."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum research scope. This assignment requires both traditional comparable data and specialized environmental impact research. Published stigma studies provide percentage-based diminution estimates. Sales near other contamination sites provide direct market evidence. Before-and-after sales in the subject neighborhood (if any have sold since disclosure) are the strongest evidence. Must understand disclosure requirements — ongoing disclosure obligations perpetuate stigma.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10]}'::jsonb, '{"options":["MLS for unimpaired comparable sales","Sales near other known contamination sites (regional/national)","Environmental site assessment reports (Phase I & II)","Remediation plan, timeline, and cost estimates","Contamination plume maps and monitoring data","Published environmental stigma studies (academic/industry)","Environmental case law in the jurisdiction","Disclosure requirements for contaminated properties","Sales before and after contamination disclosure in subject neighborhood","Market survey of buyer/agent attitudes toward contamination","Insurance implications and lender restrictions"]}'::jsonb),
    ('compParams', 'Unimpaired: standard parameters, same subdivision pre-disclosure or adjacent unaffected areas. Contamination-impacted: extremely broad search (50–100+ miles, statewide, potentially national) for sales near other PCE or similar contamination sites. Published case studies provide supplemental evidence beyond local comparable data.', NULL, '{"values":{"unimpairedRadius":"3","contaminationRadius":"50","timeframeClosed":"12","studyRadius":"100"}}'::jsonb, NULL),
    ('eaHc', 'HC for unimpaired values: "Each property is valued under the hypothetical condition that no contamination exists on or near the property, no environmental investigations have been conducted, and the property has no history of proximity to contaminated sites." EAs: (1) "The remediation will be completed per the current plan within the estimated 5–8 year timeline." (2) "The contamination has not affected the potability of domestic water supply." (3) "No additional contamination beyond that identified in the Phase II assessment exists." Each EA must disclose the consequence if the assumption proves false.', NULL, NULL, NULL),
    ('justification', 'This is among the most complex residential litigation assignments. Three properties, each requiring before-and-after environmental stigma analysis, with a common contamination source and shared expert evidence but individual value conclusions. The appraiser must develop competency in environmental valuation methodology — this is a specialized field with established academic frameworks (Mundy, Simons, Chalmers & Roehr, Jackson). The analysis must address multiple components of environmental stigma: risk perception, ongoing remediation disruption, disclosure obligations, lender/insurance restrictions, and uncertainty about remediation success. Expect vigorous opposition from the defense. Competency in environmental valuation, multi-property litigation, and expert testimony is essential.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 2.10: Inverse Condemnation — Regulatory Taking, Flood Rezoning
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 10, 'expert', 'Inverse Condemnation — Regulatory Taking, Flood Rezoning', 'The county adopted new floodplain regulations based on updated FEMA mapping that placed 45 homes in a previously unregulated subdivision into a Special Flood Hazard Area (Zone AE). The new regulations prohibit any expansion or substantial improvement of existing structures (the 50% rule). Homeowners have filed an inverse condemnation claim alleging a regulatory taking without just compensation. The lead plaintiff''s property is a 2,800 SF home on 1.2 acres purchased for $380,000 before the rezoning. Post-rezoning, the owner attempted to sell but received no offers above $265,000.

— Problem Identification (from Section 1) —
Client: Attorney group (representing class of 45 homeowners, lead plaintiff analysis)
Intended Users: Plaintiff attorneys; county attorney''s office; the court; potential class members
Intended Use: Establish damages from alleged regulatory taking for inverse condemnation class action
Type and Definition of Value: Market Value Before Rezoning; Market Value After Rezoning; Diminution; Transferable Framework for Class
Effective Date: Date of regulation adoption (retrospective for ''before''); current (for ''after'')
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — before value assumes no flood zone designation or associated regulations
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; Constitutional takings law considerations'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 2
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection of lead plaintiff property plus representative sampling of class properties to develop the transferable framework. Must document the flood zone boundary relative to each property, the regulatory restrictions that now apply, and the physical differences between properties inside and outside the new zone. Old and new FEMA maps must be compared side by side. The 50% rule''s practical impact must be analyzed for each property type.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Interior and exterior inspection of lead plaintiff''s property","Exterior inspection of representative properties in the class","Documentation of flood zone boundary relative to each property","Assessment of regulatory impact (what improvements are now prohibited)","Review of old and new FEMA flood maps","Review of county''s new floodplain regulations","Review of FEMA base flood elevation data","Exterior inspection of comparables (inside and outside flood zone)","Site inspection of overall subdivision relative to flood boundaries"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — comprehensive narrative with two components: (1) Complete before-and-after appraisal for the lead plaintiff with full comparable analysis and value conclusions, and (2) Transferable analytical framework for the class that establishes the methodology, market factors, and percentage-based diminution model applicable to the other 44 properties.', NULL, '{"selected":2}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, Individual Lead Plaintiff Analysis)","USPAP Appraisal Report (Narrative, Lead Plaintiff + Class Framework)","Consulting Report (non-appraisal framework only)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for both before and after values. Before: sales prior to rezoning without flood zone designation. After: sales of properties in flood zones with comparable regulatory restrictions. Also analyze sales within this specific subdivision before and after the rezoning date for direct market evidence.","Important for analyzing the 50% rule impact. The restriction on substantial improvement effectively caps renovation investment — this creates measurable functional obsolescence. Cost approach quantifies the development potential lost through regulation.","Include; the regulatory restrictions may affect highest and best use. The flood insurance requirement adds annual costs that can be capitalized to quantify the regulatory burden."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum scope — every listed source is relevant. The before/after sales within the subdivision are the strongest evidence. Paired analysis (inside vs. outside new zone) isolates the regulatory impact. Flood insurance costs quantify the ongoing financial burden. The 50% rule analysis requires understanding what improvements each property can and cannot make — this is the heart of the regulatory taking argument.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11,12,13]}'::jsonb, '{"options":["MLS for sales before and after rezoning in subject subdivision","MLS for sales in other flood-zone areas (comparable restrictions)","Sales of properties in and adjacent to flood zones (paired analysis)","County''s new floodplain ordinance (full text)","Old and new FEMA flood insurance rate maps","Base flood elevation data and certificates","Flood insurance cost analysis (NFIP rates)","Regulatory analysis: 50% rule, substantial improvement definition","Constitutional takings case law (Penn Central factors)","Published studies on flood zone impact on property values","Building permit data before/after rezoning (showing chilling effect)","Lead plaintiff''s failed marketing efforts and offers","Interviews with local agents on market perception of rezoning","Assessment data before/after for uniformity analysis"]}'::jsonb),
    ('compParams', 'Before-rezoning: standard parameters, 1–3 miles, 12 months prior to the regulation date. After-rezoning: expanded search (10–15 miles) for sales under comparable flood zone restrictions. Paired analysis: sales of similar properties inside and outside the new zone boundary, isolating the zone impact from other factors. Time adjustments across the regulation date must account for general market movement.', NULL, '{"values":{"beforeRadius":"3","afterRadius":"15","beforeTimeframe":"12","afterTimeframe":"12","pairedRadius":"5"}}'::jsonb, NULL),
    ('eaHc', 'HC for ''before'' value: "The property is valued as of the date immediately prior to the adoption of the county''s floodplain ordinance, under the hypothetical condition that the FEMA flood zone redesignation and the county''s floodplain regulations had not been adopted." The ''after'' value reflects the property under current conditions including all regulatory restrictions. EAs: (1) "The FEMA flood maps and base flood elevation data are accurate as published." (2) "The 50% substantial improvement threshold applies based on the county''s assessed improvement value." (3) "Properties within the class share sufficiently similar characteristics that a common diminution methodology is applicable."', NULL, NULL, NULL),
    ('justification', 'This is the most complex assignment in the Litigation Support module, combining regulatory analysis, class action methodology, retrospective valuation, and constitutional takings law considerations. The appraiser must develop a rigorous individual analysis for the lead plaintiff AND a transferable framework for 44 additional properties. The before-and-after analysis must isolate the regulatory impact from general market conditions — time-series analysis with paired comparisons is the most defensible methodology. The appraiser must understand the legal framework for regulatory takings (Penn Central test, Lucas test, relevant state law). This requires competency in flood zone analysis, regulatory impact valuation, class action methodology, and expert testimony. Fee and timeline must reflect what may be 60–100+ hours of research, analysis, and reporting.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- ─────────────── Category 3: Estate & Tax ───────────────
-- Scenarios for category M2-S2-C3

-- Scenario 3.1: Date-of-Death Valuation — Standard Estate Settlement
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 1, 'basic', 'Date-of-Death Valuation — Standard Estate Settlement', 'An estate attorney needs a date-of-death appraisal for a decedent''s primary residence — a 3-bedroom, 2-bath colonial built in 2001 in a well-established subdivision. The decedent passed away 4 months ago. The property is in good condition and the executor has maintained it since the death. The estate is below the federal estate tax threshold but the state requires a date-of-death value for probate. Active market with plentiful comparable sales.

— Problem Identification (from Section 1) —
Client: Attorney Karen Walsh (estate counsel)
Intended Users: Karen Walsh, Esq.; executor; probate court
Intended Use: Establish date-of-death value for probate and estate settlement
Type and Definition of Value: Market Value (as of date of death)
Effective Date: Date of death (4 months ago — retrospective)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: EA — property condition consistent with date-of-death condition
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection with verification that the current condition reflects the date-of-death condition. Interview the executor to confirm no changes, repairs, or deterioration since the death. If any changes occurred, document both the current and date-of-death conditions. The inspection occurs now but the effective date is 4 months ago — this gap must be addressed.', NULL, '{"selected":[0,1,2,3,4]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Enhanced condition documentation/photography","Verify condition has not changed since date of death","Interview executor regarding property condition at date of death","No physical inspection (desktop)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — form or narrative with an estate-specific addendum addressing the retrospective effective date, property condition at date of death, and estate/probate context. For straightforward estates, a form report with addendum is generally acceptable.', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report (Form 1004 with Estate/Retrospective Addendum)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Must use sales that bracket the date of death — ideally closed before the death date, with pending/closed sales shortly after as supporting evidence.","Include; property is relatively new and cost data is meaningful. Provides secondary support for the retrospective value conclusion.","Omit; owner-occupied SFR with no rental relevance."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources with emphasis on sales data as of the date of death. Market conditions analysis must reflect that specific date, not current conditions. Confirm ownership through deed/title records and verify the death certificate date — the effective date must match exactly.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for sales bracketing the date of death","County assessor/tax records","Flood zone determination","Market conditions as of date of death","Prior sale history of subject","Deed/title records confirming ownership","Estate documents (death certificate date, will/trust)"]}'::jsonb),
    ('compParams', '1–2 miles, sales within 6 months before and 3 months after the date of death. Prioritize sales closed before the death date — these most directly reflect market conditions at that time.', NULL, '{"values":{"searchRadius":"2","beforeDeath":"6","afterDeath":"3","glaRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'EA: "The property condition as of the date of death is assumed to be consistent with the condition observed at the time of inspection, as confirmed by the executor. No material changes to the property or its surroundings have occurred between the date of death and the inspection date."', NULL, NULL, NULL),
    ('justification', 'Standard scope with the key distinction of a retrospective effective date. The 4-month gap between death and inspection is manageable with executor verification. The primary analytical challenge is ensuring all market data reflects conditions as of the date of death. The appraiser should confirm with the attorney whether the IRS alternate valuation date (6 months after death) might also be needed.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.2: Stepped-Up Basis — Inherited Property for Capital Gains
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 2, 'basic', 'Stepped-Up Basis — Inherited Property for Capital Gains', 'A beneficiary inherited a home from a parent who passed away 2 years ago. No appraisal was done at the time of death. The beneficiary now wants to sell the property and needs a retrospective date-of-death appraisal to establish the stepped-up cost basis for capital gains tax purposes. The property is a 4-bedroom split-level built in 1978. The beneficiary has lived in the home since inheriting it and has made some updates (new flooring, painted interior).

— Problem Identification (from Section 1) —
Client: Beneficiary (Thomas Reed) through his CPA
Intended Users: Thomas Reed; CPA firm; IRS (if audited)
Intended Use: Establish stepped-up cost basis at date of death for capital gains tax calculation
Type and Definition of Value: Market Value (as of date of death — 2 years ago)
Effective Date: Date of death (2 years ago — retrospective)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: EA — property condition at date of death based on available evidence
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRS requirements'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full current inspection BUT the appraiser must reconstruct the date-of-death condition. The beneficiary has made changes (flooring, paint) — these must be identified and backed out of the analysis. Pre-improvement photos are critical. Interview the beneficiary in detail about the property''s condition 2 years ago.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["Interior and exterior inspection of subject (current condition)","Identify and document changes made since date of death","Obtain pre-improvement photographs (from beneficiary, MLS, assessor)","Interview beneficiary regarding condition at date of death","Review any home inspection reports from the estate period","Exterior inspection of comparables"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format recommended due to the 2-year retrospective gap and the need to reconstruct date-of-death condition. The report must clearly explain how the appraiser determined the property''s condition as of the effective date despite improvements made since.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative with Retrospective Condition Analysis)","Restricted Appraisal Report","USPAP Appraisal Report (Form 1004 with IRS Compliance Addendum)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Must use sales from 2 years ago, bracketing the date of death. The comparable market may look different than today — this is a historical analysis.","Include; supports the retrospective analysis and helps quantify the condition at date of death. Depreciation analysis for a 1978 property provides useful context.","Omit; owner-occupied residential."]}'::jsonb, NULL),
    ('dataResearch', 'Historical MLS data from 2 years ago is the primary source. Must reconstruct the market as it existed then. Contractor invoices document what improvements were made (and their cost, which must be excluded from the basis). Pre-improvement photos and insurance records help establish the date-of-death condition.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for sales near the date of death (2 years ago)","County assessor records (historical)","Market conditions as of date of death","Pre-improvement photographs of the subject","Contractor invoices for post-death improvements","Death certificate for exact date","Prior sale history of subject","Insurance records/photos from estate period"]}'::jsonb),
    ('compParams', '2–3 miles, sales within ±6 months of the date of death. Must match condition level — look for sales in original/dated condition (not updated) to reflect the subject''s date-of-death condition before the beneficiary''s improvements.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"6","glaRange":"20","ageRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'EA: "The property condition at the date of death is based on the beneficiary''s representation, pre-improvement photographs, and available records. The property has been modified since the date of death (new flooring, interior paint). The appraiser has relied on these sources to reconstruct the date-of-death condition. If the actual condition at the date of death differed materially, the value conclusion may require revision."', NULL, NULL, NULL),
    ('justification', 'The 2-year retrospective effective date and intervening improvements make this more complex than a standard date-of-death appraisal. The appraiser must reconstruct both the property condition and the market as they existed at the date of death. The IRS may scrutinize this appraisal in a capital gains audit — the stepped-up basis directly affects tax liability. The appraiser should document the reconstruction methodology clearly and acknowledge the limitations of retrospective condition analysis.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.3: Gift Tax Appraisal — Parent Gifting Property to Child
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 3, 'basic', 'Gift Tax Appraisal — Parent Gifting Property to Child', 'A parent is gifting a residential rental property to their adult child. The property is a 2-bedroom bungalow built in 1952, currently rented for $1,400/month. The CPA has advised that the gift exceeds the annual exclusion and requires a gift tax return (Form 709). The CPA needs a current market value appraisal to report on the return. The property is in fair condition with deferred maintenance — the parent has been a passive landlord.

— Problem Identification (from Section 1) —
Client: CPA firm (Miller & Associates) on behalf of the parent
Intended Users: Miller & Associates CPAs; parent (donor); IRS
Intended Use: Establish market value for gift tax reporting on IRS Form 709
Type and Definition of Value: Market Value (current — date of gift)
Effective Date: Date of gift transfer
Property Interest: Fee Simple (subject to existing lease)
Extraordinary Assumptions / Hypothetical Conditions: None anticipated — but existing lease must be addressed
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRS gift tax requirements'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection with detailed documentation of deferred maintenance — this directly affects value and the donor has an interest in an accurate (not inflated) value to minimize gift tax liability. Coordinate with the tenant for access.', NULL, '{"selected":[0,1,2,3,4]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Detailed deferred maintenance documentation","Tenant coordination for interior access","Exterior inspection of comparables","Rental unit condition documentation","No physical inspection (desktop)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — form with IRS-specific addendum. The IRS has specific requirements for appraisals supporting gift tax returns (qualified appraisal by a qualified appraiser). The report must meet IRS qualified appraisal standards.', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report (Form 1004 with IRS Gift Tax Addendum)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required and primary. Use sales of similar investor/rental properties in comparable condition.","Include; useful for quantifying deferred maintenance through depreciation analysis. The 1952 construction date makes physical deterioration a significant factor.","Include; the property IS a rental generating income. GRM analysis and/or basic income capitalization provides direct market support."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus rental/income data for the income approach. Review the existing lease — its terms may affect value if below or above market. Cost estimates for deferred maintenance items quantify the condition impact. Confirm IRS qualified appraisal requirements.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for comparable sales (rental/investment properties)","County assessor/tax records","Rental income data for comparable properties","Current lease agreement review","Deferred maintenance cost estimates","Market conditions analysis","Deed/title records","IRS qualified appraisal requirements review"]}'::jsonb),
    ('compParams', '1–2 miles, 6 months. Prioritize investor/rental property sales in similar condition — not updated owner-occupied homes. The 1952 bungalow with deferred maintenance needs comparables reflecting that market segment. Wider age range (±20 years) appropriate for older housing stock.', NULL, '{"values":{"searchRadius":"2","timeframeClosed":"6","glaRange":"20","ageRange":"20"}}'::jsonb, NULL),
    ('eaHc', 'The existing lease should be addressed: if the property is valued as fee simple (unencumbered by the lease), note that the lease is at or near market rent and does not materially affect value. If the lease is significantly below or above market, the property interest may need to be valued as leased fee. Discuss with the CPA whether the IRS expects fee simple or leased fee valuation.', NULL, NULL, NULL),
    ('justification', 'Standard scope with IRS compliance requirements. The income approach is warranted by the property''s income-producing status. Deferred maintenance must be thoroughly documented as it directly impacts value and the donor''s tax liability. The appraiser must meet IRS qualified appraiser standards. The effective date must precisely match the date of the gift transfer.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.4: Federal Estate Tax — High-Value Estate, IRS Scrutiny Expected
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 4, 'intermediate', 'Federal Estate Tax — High-Value Estate, IRS Scrutiny Expected', 'A decedent owned a 5,200 SF waterfront home valued by the family at approximately $1.8 million. The gross estate significantly exceeds the federal estate tax exemption. The estate attorney expects IRS scrutiny. The property is on 3 acres of direct waterfront with a private dock, guest cottage, and detached 3-car garage. The decedent passed away 6 weeks ago. Market data for waterfront properties in this range is limited.

— Problem Identification (from Section 1) —
Client: Attorney Richard Hoffman (estate counsel)
Intended Users: Richard Hoffman, Esq.; executor; IRS Estate Tax Division
Intended Use: Federal estate tax return (Form 706) — establish date-of-death value
Type and Definition of Value: Market Value (as of date of death)
Effective Date: Date of death (6 weeks ago)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRS Estate Tax requirements'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive inspection of ALL structures and site improvements. Every component contributes to value and will be analyzed by the IRS. Waterfront footage is a primary value driver and must be precisely measured. Enhanced comparable verification is essential given limited market data and IRS scrutiny expectations.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of main residence","Interior and exterior inspection of guest cottage","Measurement of all structures","Dock and waterfront improvements documentation","Waterfront footage measurement","Site improvements documentation (garage, landscaping, seawall)","Exterior inspection of comparables","Enhanced comparable verification (agent interviews)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — comprehensive narrative format. For a high-value estate expecting IRS scrutiny, the narrative must be exhaustive. The IRS Estate Tax Division employs appraisers who will review this report in detail. Form reports are inadequate for this complexity and value level.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format — IRS Estate Tax)","Restricted Appraisal Report","USPAP Appraisal Report (Form 1004 with Addenda)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required and primary. Must develop waterfront comparable analysis despite limited data. Expanded search with thorough adjustment support.","Essential; supports the value of the guest cottage, dock, and site improvements independently. Provides a cross-check against limited sales data.","Consider; waterfront properties with guest cottages have rental potential. GRM or income analysis provides additional value support and demonstrates thorough analysis under IRS scrutiny."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum research scope appropriate for IRS scrutiny. Waterfront-specific databases beyond standard MLS. Paired sales analysis to extract per-foot waterfront premium. Cost data for all ancillary improvements. Riparian rights verification through title/deed research.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for waterfront comparable sales","County assessor records","Waterfront property databases/brokerages","Cost estimation for guest cottage, dock, improvements","Waterfront footage value extraction (paired sales)","Rental income data for comparable properties","Prior sale history of subject","Deed/title records and riparian rights verification","Environmental/wetland considerations","Market conditions as of date of death"]}'::jsonb),
    ('compParams', 'Broad search (15–20+ miles) along comparable waterfront areas. 12 months bracketing date of death. Waterfront footage is a critical match criterion — comparables should bracket the subject''s frontage. Must also find non-waterfront sales of similar homes to isolate the waterfront premium through paired analysis.', NULL, '{"values":{"searchRadius":"20","timeframeClosed":"12","waterfrontMin":"100"}}'::jsonb, NULL),
    ('eaHc', 'The 6-week gap between death and inspection is minimal — likely no EA needed if condition is unchanged. Verify with executor. If the dock requires permits or has compliance issues, an EA may be needed regarding its legal status. Confirm riparian rights convey with the property.', NULL, NULL, NULL),
    ('justification', 'The combination of high value, IRS scrutiny, limited waterfront data, and multiple improvement components demands comprehensive scope. Three approaches provide triangulation that strengthens the conclusion. The appraiser must have competency in waterfront property valuation and high-value estate work. Consider whether the IRS alternate valuation date should also be analyzed.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.5: Alternate Valuation Date — Declining Market
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 5, 'intermediate', 'Alternate Valuation Date — Declining Market', 'An executor is considering electing the IRS alternate valuation date (6 months after death) because the real estate market declined significantly after the decedent''s death. The decedent owned a 4-bedroom home in a subdivision that experienced a 12% price decline in the 6 months following death due to a major local employer announcing layoffs and facility closure. The estate attorney needs both date-of-death and alternate-date values to determine which election minimizes estate tax.

— Problem Identification (from Section 1) —
Client: Attorney Sandra Chen (estate counsel)
Intended Users: Sandra Chen, Esq.; executor; IRS
Intended Use: Determine whether alternate valuation date election reduces estate tax liability
Type and Definition of Value: Market Value at Date of Death AND Market Value at Alternate Date (6 months later)
Effective Date: Date of death AND 6 months after death (two retrospective dates)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated — but two distinct market analyses required
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRC §2032 Alternate Valuation'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection plus documentation of the market decline''s physical manifestation in the neighborhood. Both valuation dates must be supported by the same property condition — verify no changes occurred in the 6-month window.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Verify condition unchanged across both valuation dates","Document neighborhood conditions (for-sale signs, vacancies)","Exterior inspection of comparables","Interview executor regarding condition at both dates","Document evidence of market decline (employer closure effects)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with dual-date analysis. One report with two value conclusions is most efficient and allows the market decline narrative to be presented cohesively. The IRS must see a clear causal relationship between the market event and the value change.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, Dual-Date with Market Decline Analysis)","Two Separate Appraisal Reports","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for both dates. The comparable analysis must demonstrate the market shift — using similar comparables at both dates to show the decline directly.","Include; the cost approach should be relatively stable between dates, which isolates the market decline in the sales comparison approach — a useful analytical tool.","Omit; owner-occupied residential."]}'::jsonb, NULL),
    ('dataResearch', 'Extensive market analysis required for both dates plus the decline narrative. Document the employer closure announcement date and market response. Statistical evidence (inventory increases, DOM expansion, price reductions) strengthens the case. IRC §2032 requires that the decline must be due to market conditions, not property deterioration.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for sales at date of death (first value)","MLS for sales at alternate date (second value)","Market trend data showing decline timeline","Employer closure announcement and timeline","News articles documenting local economic impact","Listing inventory analysis (before/after closure announcement)","Days-on-market trend analysis","Price reduction frequency analysis","County assessor records","IRC §2032 requirements and case law"]}'::jsonb),
    ('compParams', 'Tighter time windows (±3 months for each date) to isolate the market conditions at each specific point. Sales that closed between the two dates are valuable — they show the transition. Paired analysis of similar properties selling at different prices at each date is the strongest evidence of market decline.', NULL, '{"values":{"searchRadius":"3","dateOfDeathWindow":"3","alternateDateWindow":"3"}}'::jsonb, NULL),
    ('eaHc', 'No EA/HC needed if the property condition is unchanged between dates and both dates are in the past. The critical analytical element is demonstrating that the value change is due to market conditions (qualifying for §2032 election) rather than property deterioration or other non-market factors.', NULL, NULL, NULL),
    ('justification', 'This dual-date assignment requires two complete market analyses with a connecting narrative explaining the decline. The IRS will evaluate whether the alternate valuation election is justified under §2032. The report must demonstrate: (1) the value at each date, (2) the cause of the decline (employer closure, not property deterioration), and (3) the magnitude of the decline. The appraiser should understand the §2032 requirements.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.6: Charitable Donation — Conservation Easement Valuation
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 6, 'advanced', 'Charitable Donation — Conservation Easement Valuation', 'A property owner is donating a conservation easement on 40 acres of their 60-acre residential estate to a land trust. The easement will permanently restrict development on the 40 acres to agricultural/open space use. The remaining 20 acres include the 4,500 SF residence and outbuildings and will be unaffected. The owner will claim a charitable deduction on their tax return. The IRS requires a qualified appraisal determining the value of the easement (before-and-after methodology). Conservation easement deductions are an IRS audit priority.

— Problem Identification (from Section 1) —
Client: Property owner (Margaret Collins) through her tax attorney
Intended Users: Tax attorney; Margaret Collins; IRS; land trust
Intended Use: Establish value of donated conservation easement for IRS charitable deduction
Type and Definition of Value: Market Value Before Easement; Market Value After Easement; Easement Value (difference)
Effective Date: Date of easement donation
Property Interest: Fee Simple (before); Fee Simple subject to easement (after)
Extraordinary Assumptions / Hypothetical Conditions: HC for before value — valued as if no easement restrictions exist on any portion
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRS §170(h), Treasury Regulations §1.170A-14'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive inspection of the entire 60-acre property with specific focus on the development potential of the 40-acre easement area. The ''before'' value depends on what could be built there without the easement — this requires analysis of soils, topography, access, utilities, zoning, and subdivision potential.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Interior and exterior inspection of residence","Complete inspection of all 60 acres","Documentation of development potential of the 40-acre easement area","Soil analysis/topography for development suitability","Access, utilities, and infrastructure assessment","Documentation of conservation values (habitat, watershed, scenic)","Review of easement document terms and restrictions","Review of baseline documentation report","Exterior inspection of comparables"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — comprehensive narrative meeting IRS qualified appraisal requirements under §170(h) and Treasury Reg. §1.170A-14. Conservation easement deductions are an IRS audit priority — the report must anticipate and withstand aggressive IRS review.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, IRS Qualified Appraisal — Before & After)","Restricted Appraisal Report","Consulting Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for both before and after values. Before: value the entire 60 acres as developable. After: value with the easement encumbrance. Paired sales of encumbered vs. unencumbered land are ideal.","Include; supports the development potential analysis and the improvement value of the residence/outbuildings. Subdivision development cost analysis is relevant if the highest and best use of the 40 acres is residential development.","Include; agricultural income potential of the easement-restricted 40 acres supports the ''after'' value. Comparison of development value vs. agricultural value quantifies the easement impact."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum research scope — IRS Conservation Easement Audit Initiative specifically targets inflated deductions. Must independently analyze development potential. Zoning/subdivision analysis determines how many lots could be created. IRS Tax Court case law provides guidance on what the IRS challenges.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11]}'::jsonb, '{"options":["MLS for large acreage residential sales","MLS for subdivision-potential land sales","Sales of conservation easement-encumbered properties","Conservation easement registries","Zoning and subdivision regulations","Development cost analysis (roads, utilities, lots)","Agricultural land values and income data","Easement document and restrictions analysis","Baseline documentation report review","IRS §170(h) requirements and Tax Court case law","Comparable easement donations and claimed values","Environmental and conservation assessment"]}'::jsonb),
    ('compParams', 'Development land: 10–15 miles, 12–18 months. Easement-encumbered sales: 50+ miles (rare, broad search required). Agricultural land: 15–20 miles. The spread between these data sets establishes the easement value.', NULL, '{"values":{"developmentRadius":"15","easementRadius":"50","timeframeClosed":"18","agriculturalRadius":"20"}}'::jsonb, NULL),
    ('eaHc', 'HC for ''before'' value: "The property is valued as if no conservation easement or development restrictions exist on any portion of the 60-acre property, and the 40-acre area is available for its highest and best use, which may include residential subdivision development." EA: "The conservation easement will be accepted by the land trust, recorded, and enforced per its terms in perpetuity."', NULL, NULL, NULL),
    ('justification', 'Conservation easement valuation is one of the most scrutinized areas in IRS enforcement. The scope must be comprehensive, the methodology defensible, and the value conclusion independently derived. The development potential analysis (for the ''before'' value) is the most complex element. The appraiser must have demonstrated competency in conservation easement valuation. Fee and timeline must reflect 30–50+ hours.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.7: Irrevocable Trust Transfer — Valuation Discount Analysis
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 7, 'advanced', 'Irrevocable Trust Transfer — Valuation Discount Analysis', 'A property owner is transferring a 50% undivided interest in a residential rental duplex to an irrevocable trust for estate planning purposes. The tax attorney needs the value of the 50% fractional interest for gift tax reporting. The duplex is a side-by-side unit built in 1985, each unit 1,200 SF. Both units are rented. The attorney expects the fractional interest will warrant a valuation discount for lack of control and marketability.

— Problem Identification (from Section 1) —
Client: Tax attorney (William Park) on behalf of the property owner
Intended Users: William Park, Esq.; property owner; IRS; trustee
Intended Use: Establish value of 50% undivided fractional interest for gift tax reporting
Type and Definition of Value: Market Value of 50% undivided interest (including applicable discounts)
Effective Date: Date of trust transfer
Property Interest: 50% undivided interest in fee simple (fractional interest)
Extraordinary Assumptions / Hypothetical Conditions: None anticipated — but fractional interest analysis required
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRS gift tax requirements'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection of both duplex units — the whole-property value is the foundation for the fractional interest analysis. Review leases and operating history since income data supports both the whole-property value and the fractional interest analysis.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["Interior and exterior inspection of both units","Measurement and documentation of each unit","Rental condition documentation","Exterior inspection of comparables","Review of lease agreements for both units","Review of operating expenses and income history"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with a dedicated fractional interest and discount analysis section. The report must present: (1) the whole-property market value, (2) the pro-rata 50% share, and (3) the discounted fractional interest value with supported discount rates.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative with Fractional Interest/Discount Analysis)","Restricted Appraisal Report","USPAP Appraisal Report (Form 1025 — Small Income Property)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for the whole-property value. Duplex sales in the market. Also research sales of fractional/undivided interests if available.","Include; 1985 construction allows meaningful cost analysis. Supports the whole-property value.","Essential; this IS an income property. Develop GRM and direct capitalization analyses using both units'' income."]}'::jsonb, NULL),
    ('dataResearch', 'Standard duplex data plus specialized fractional interest research. Published discount studies (e.g., Mandelbaum factors, restricted stock studies, partnership interest studies) provide the basis for the discount rate. IRS Tax Court cases establish the parameters courts accept for lack-of-control and lack-of-marketability discounts.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["MLS for duplex comparable sales","County assessor/tax records","Rental income data (both units)","Operating expense history","Capitalization rate data","Sales of fractional/undivided interests (if available)","Published fractional interest discount studies","IRS guidelines and Tax Court cases on valuation discounts","Partnership interest discount data (analogous market)"]}'::jsonb),
    ('compParams', 'Duplex sales: 3–5 miles, 12 months. Fractional interest data: national scope. Published discount studies, Tax Court decisions, and ESOP/partnership interest data provide the range. Typical residential fractional interest discounts range from 15–35% combined, but must be specifically supported.', NULL, '{"values":{"searchRadius":"5","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'The fractional interest analysis is not an HC — it reflects the actual property interest being transferred. The appraiser should note the specific characteristics that affect the discount: (1) the other 50% owner retains control, (2) the fractional interest cannot be independently financed, (3) the market for undivided fractional interests is extremely limited, and (4) partition costs represent significant transaction friction.', NULL, NULL, NULL),
    ('justification', 'This assignment requires two layers of analysis: whole-property valuation of the duplex and fractional interest valuation with discount analysis. The discount analysis is the more complex and contested element. The appraiser must develop a supportable combined discount rate referencing published studies, Tax Court precedent, and the specific characteristics of this interest. Competency in fractional interest valuation methodology is required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.8: Property Tax Dispute — Contaminated Former Gas Station Parcel
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 8, 'expert', 'Property Tax Dispute — Contaminated Former Gas Station Parcel', 'A homeowner purchased a property 5 years ago that was formerly a gas station, remediated, and converted to residential use with a new 3-bedroom home. Underground storage tanks were removed and the state DEP issued a No Further Action letter. However, the county assessor is assessing the property at full residential value ($340,000) without any consideration for the environmental history. The homeowner''s tax attorney argues that the site''s contamination history creates permanent stigma that reduces market value, and is appealing the assessment. Deed disclosure of the former use is required in perpetuity.

— Problem Identification (from Section 1) —
Client: Tax attorney (Amy Nguyen) representing homeowner
Intended Users: Amy Nguyen, Esq.; homeowner; county Board of Assessment Appeals; county assessor
Intended Use: Property tax appeal — establish that environmental stigma reduces market value below assessed value
Type and Definition of Value: Market Value (as of assessment date, accounting for environmental stigma)
Effective Date: Assessment date (January 1 of current year)
Property Interest: Fee Simple (subject to perpetual disclosure requirement)
Extraordinary Assumptions / Hypothetical Conditions: None — the stigma IS the condition being valued
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection plus comprehensive environmental documentation review. Even though the DEP issued a No Further Action letter, the environmental history is permanently attached to the property through deed disclosure. The appraiser''s role is to determine whether the market assigns a stigma discount to remediated sites — not whether the property is actually safe.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Documentation of any visible environmental remediation evidence","Review of state DEP No Further Action letter","Review of environmental site assessment reports","Review of deed disclosure language","Review of monitoring well status (if any remain)","Exterior inspection of comparables","Research comparable remediated properties"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with dedicated environmental stigma analysis and assessment comparison. Must present: (1) the property''s market value accounting for stigma, (2) the basis for the stigma discount, and (3) comparison to the assessor''s methodology which ignores the stigma.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative with Environmental Stigma Analysis)","Restricted Appraisal Report","USPAP Appraisal Report (Narrative with Assessment Comparison)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Must develop paired analysis: sales of remediated former-contamination sites vs. comparable properties without environmental history. This directly measures stigma.","Include; the cost approach for the improvement compared to land value establishes the disproportionate impact of stigma on the land component. The house itself is uncontaminated — the stigma attaches to the land.","Omit unless the property could be rented."]}'::jsonb, NULL),
    ('dataResearch', 'Comprehensive environmental stigma research. Published studies provide percentage-based stigma estimates. Lender and insurance restrictions compound stigma — if conventional lenders won''t finance or require environmental insurance, the buyer pool is restricted. Assessment comparison shows the assessor''s failure to account for these factors.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10]}'::jsonb, '{"options":["MLS for standard comparable sales","Sales of properties with known environmental history","State DEP No Further Action letter and conditions","Environmental site assessment reports","Deed disclosure requirement documentation","Published environmental stigma studies","Assessor''s property record and methodology","Comparable property assessment values","Case law on environmental stigma in property tax appeals","Lender attitudes toward former contamination sites","Insurance availability and cost for environmental risk"]}'::jsonb),
    ('compParams', 'Standard comparables: 1–3 miles for unimpaired value. Remediated-site sales: 50+ miles (statewide search) — these are rare but critical. Time frame 12–18 months. If direct comparable sales are unavailable, published stigma studies and regression analyses provide alternative support.', NULL, '{"values":{"standardRadius":"3","stigmaRadius":"50","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'No HC needed — the property IS being valued with its environmental history. EA: "The appraiser has relied on the state DEP No Further Action letter as evidence that active contamination has been remediated to regulatory standards. The appraiser is not an environmental scientist and has not independently assessed the completeness of remediation." The stigma analysis addresses MARKET PERCEPTION, not actual environmental risk.', NULL, NULL, NULL),
    ('justification', 'This assignment requires the appraiser to quantify environmental stigma — the market''s negative reaction to a property''s contamination history even after remediation. The assessor''s mass appraisal system likely cannot account for individual property stigma, creating systematic over-assessment. The argument is not that the property is unsafe — it is that the market values it lower due to its history and the perpetual disclosure requirement. Competency in environmental stigma valuation is required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.9: Estate Tax — Life Estate & Remainder Interest Valuation
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 9, 'expert', 'Estate Tax — Life Estate & Remainder Interest Valuation', 'A decedent held a life estate in a 3,500 SF residence; the remainder interest was held by the decedent''s two children. Upon the decedent''s death, the life estate terminated and the children now hold fee simple. The estate attorney needs: (1) the market value of the fee simple interest as of date of death, (2) the value of the life estate interest that terminated, and (3) actuarial analysis of the prior life estate/remainder split. The decedent was 84 years old at death. The property is a custom home on 2 acres in an affluent area.

— Problem Identification (from Section 1) —
Client: Attorney Elizabeth Grant (estate counsel)
Intended Users: Elizabeth Grant, Esq.; executor; IRS Estate Tax Division; beneficiaries/remaindermen
Intended Use: Estate tax — value life estate interest at death and fee simple for estate settlement
Type and Definition of Value: Market Value Fee Simple; Life Estate Value (actuarial); Remainder Interest Value
Effective Date: Date of death
Property Interest: Life Estate (decedent); Remainder Interest (children); Fee Simple (merged at death)
Extraordinary Assumptions / Hypothetical Conditions: None anticipated — but multiple property interest analyses required
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRS §7520 actuarial tables; IRC §2036/2037'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with assessment of whether the life tenant maintained the property adequately. The life estate deed may contain maintenance obligations that affect the condition analysis. Review the IRS §7520 rate — it changes monthly and the rate as of the date of death determines the actuarial split.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Enhanced documentation for high-value estate","Assessment of maintenance during life estate (waste analysis)","Documentation of any deferred maintenance by life tenant","Exterior inspection of comparables","Review of life estate deed/instrument","Review of IRS §7520 actuarial rate as of date of death"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with comprehensive property interest analysis. Must present: (1) fee simple market value, (2) life estate actuarial value using IRS §7520 tables, (3) remainder interest value, and (4) discussion of whether the actuarial values accurately reflect market values of the interests.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative with Life Estate/Remainder Analysis)","Restricted Appraisal Report","Two Separate Reports (Fee Simple + Interest Analysis)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for the fee simple value. Standard comparable analysis for the whole-property value.","Include; custom home on acreage warrants cost approach support. Also useful for analyzing maintenance condition and any deferred maintenance by the life tenant.","Important for this assignment — the life estate''s economic value is essentially the right to the income/occupancy stream for the remaining lifetime. Income analysis provides a market-based test of the actuarial values."]}'::jsonb, NULL),
    ('dataResearch', 'Standard property data plus specialized life estate/remainder research. IRS §7520 rate and Table S are required for the actuarial calculation. Rental data supports the income-based test of actuarial values.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for comparable sales","County assessor records","Life estate deed and terms","IRS §7520 actuarial rate (month of death)","IRS Table S (single life remainder factors)","Rental income data for comparable properties","Life expectancy tables (IRS Table 90CM or current)","Sales of life estate or remainder interests (if available)","Market conditions as of date of death","Published research on life estate/remainder valuation"]}'::jsonb),
    ('compParams', 'Standard parameters for the fee simple value: 3–5 miles, 12 months bracketing date of death. Rental data for the income-based life estate test: expanded to 10 miles for comparable rental homes.', NULL, '{"values":{"searchRadius":"5","timeframeClosed":"12","rentalRadius":"10"}}'::jsonb, NULL),
    ('eaHc', 'The life estate terminated at death, so the current interest is fee simple — no HC needed for the fee simple value. The appraiser should note: "The life estate and remainder interest values are derived using IRS §7520 actuarial tables as required for estate tax reporting. These actuarial values may not reflect the actual market values of the respective interests, which could differ based on the life tenant''s health, property condition, and market conditions for fractional interests."', NULL, NULL, NULL),
    ('justification', 'This assignment bridges traditional real estate appraisal and estate tax actuarial analysis. The fee simple valuation is the foundation — it must be accurate because the actuarial split is applied to it. The income-based cross-check tests whether the actuarial values are reasonable in market terms. Competency in estate/trust property interest analysis and familiarity with IRS actuarial requirements is essential.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 3.10: Estate Tax Dispute — Qualified Personal Residence Trust (QPRT) Remainder
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 10, 'expert', 'Estate Tax Dispute — Qualified Personal Residence Trust (QPRT) Remainder', 'A decedent transferred their primary residence into a QPRT 12 years ago when the property was valued at $650,000. The QPRT had a 10-year term; the decedent survived the term, so the property transferred to the children 2 years ago. The decedent has now died. The IRS is auditing the estate, challenging: (1) the original $650,000 value at QPRT creation (alleging undervaluation), (2) the gift tax paid, and (3) whether the decedent truly relinquished control (§2036 retained interest). The estate attorney needs retrospective appraisals at QPRT creation (12 years ago) and at term expiration (2 years ago), plus current value.

— Problem Identification (from Section 1) —
Client: Attorney Diana Morrison (estate tax litigation counsel)
Intended Users: Diana Morrison, Esq.; IRS Estate Tax Audit Division; U.S. Tax Court (if litigated)
Intended Use: Defend QPRT valuation against IRS audit challenge; establish retrospective and current values
Type and Definition of Value: Market Value at QPRT Creation (12 years ago); Market Value at Term Expiration (2 years ago); Current Market Value; Remainder Interest Values at Each Date
Effective Date: Three dates: QPRT creation (12 years ago), term expiration (2 years ago), and date of death (current)
Property Interest: Fee Simple; Remainder Interest (at QPRT creation); Fee Simple (at term expiration and death)
Extraordinary Assumptions / Hypothetical Conditions: EA — property condition at QPRT creation based on historical records
USPAP / Other Standards: Standards 1 & 2, Standards 3 (if reviewing original appraisal), Ethics Rule, Competency Rule; IRC §2702, §2036, §7520'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 3
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full current inspection plus comprehensive reconstruction of the property''s condition at two historical dates. Twelve years of changes must be identified and documented. The original QPRT appraisal must be reviewed for the IRS challenge. If the decedent paid rent to the remaindermen after the term (required to avoid §2036 inclusion), that lease/rental evidence supports the valid transfer argument.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Interior and exterior inspection (current condition)","Document all improvements/changes over 12-year QPRT period","Obtain historical photos (assessor, MLS, insurance, family)","Interview family members regarding condition at QPRT creation","Review original QPRT appraisal report","Review building permits over 12 years","Review assessor''s property card history","Exterior inspection of comparables (current and historical)","Review lease/rental agreement (if decedent paid rent post-term)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — comprehensive narrative addressing all three valuation dates, all applicable property interests, and the Standards 3 review of the original QPRT appraisal. This will be a substantial document (potentially 60–80+ pages) presenting: (1) retrospective appraisal at QPRT creation, (2) retrospective at term expiration, (3) current market value, (4) remainder interest calculations, and (5) analysis addressing IRS challenges.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Comprehensive Narrative — Multi-Date, Multi-Interest, with Review)","Three Separate Appraisal Reports","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required at all three dates. Must reconstruct the comparable market as it existed 12 years ago, 2 years ago, and currently. The 12-year retrospective is the most challenging and most likely to be contested.","Essential — particularly for the 12-year retrospective where the cost approach provides a stable cross-check. Also critical for documenting improvements made during the QPRT term.","Include; the decedent was required to pay fair market rent after the QPRT term expired. The rental analysis validates whether the rent paid was at market rate — this supports the estate''s position that the transfer was valid."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum scope across three time periods. Historical MLS data reconstruction is essential for all retrospective dates. The original QPRT appraisal must be critically reviewed — if the IRS claims it was undervalued, the review must address whether the original methodology and comparable selections were appropriate for that date.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11,12,13]}'::jsonb, '{"options":["MLS data from 12 years ago (QPRT creation date)","MLS data from 2 years ago (term expiration)","Current MLS data","Original QPRT appraisal report (complete review)","IRS §7520 rates for month of QPRT creation","IRS §7520 rates for month of death","QPRT trust instrument and terms","Post-term lease/rental agreement and payments","Building permits and improvement documentation (12 years)","County assessor records (historical progression)","Market conditions at all three dates","IRC §2702 QPRT requirements and Tax Court cases","IRC §2036 retained interest case law","Original appraiser''s qualifications and methodology"]}'::jsonb),
    ('compParams', 'Three independent comparable searches: (1) ±6 months of QPRT creation 12 years ago, (2) ±6 months of term expiration 2 years ago, (3) ±6 months of current date. The 12-year retrospective search is most challenging — MLS data availability may be limited. County records and archived MLS data may be needed.', NULL, '{"values":{"searchRadius":"5","qprtDateWindow":"6","termDateWindow":"6","currentWindow":"6"}}'::jsonb, NULL),
    ('eaHc', 'Multiple EAs for the retrospective analyses: (1) "Property condition at QPRT creation (12 years ago) is based on the original appraisal description, building permit records, assessor history, historical photographs, and family member representations." (2) "Property condition at term expiration (2 years ago) represents the condition after documented improvements." (3) For the remainder interest: "The §7520 rate as of the QPRT creation month is applied per IRS requirements. This actuarial rate may not reflect the actual market discount for a remainder interest."', NULL, NULL, NULL),
    ('justification', 'This is the most complex assignment in the Estate & Tax module, combining three retrospective/current valuations, actuarial interest analysis, appraisal review, and IRS audit defense. The appraiser must reconstruct market conditions at three different dates spanning 12 years, perform §7520 actuarial calculations, review and potentially defend the original QPRT appraisal, and analyze the post-term rental arrangement. Requires the highest level of competency in estate tax appraisal, retrospective valuation, and litigation support. Fee and timeline must reflect 60–100+ hours.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- ─────────────── Category 4: Private/Consulting ───────────────
-- Scenarios for category M2-S2-C4

-- Scenario 4.1: Pre-Listing Appraisal — Seller Pricing Strategy
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 1, 'basic', 'Pre-Listing Appraisal — Seller Pricing Strategy', 'A homeowner is considering selling their 3-bedroom, 2-bath ranch built in 2003 in a suburban subdivision. They want an independent appraisal before listing to set a realistic asking price and avoid overpricing. The property is in good condition with a recently updated kitchen. The market is balanced with moderate inventory. The homeowner is the only intended user and does not plan to share the report with the listing agent or any buyer.

— Problem Identification (from Section 1) —
Client: Homeowner (Patricia Miller)
Intended Users: Patricia Miller (homeowner only)
Intended Use: Establish market value for listing price determination
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection of subject with attention to marketability factors — the homeowner wants pricing guidance, so features that affect buyer appeal (updated kitchen, layout flow, curb appeal) should be documented. Exterior inspection of comparables. Standard scope — the single intended user and straightforward purpose don''t require enhanced documentation.', NULL, '{"selected":[0,1,5]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Enhanced condition documentation/photography","Measurement of outbuildings/site improvements","No physical inspection (desktop)","Document marketability factors (curb appeal, layout, updates)"]}'::jsonb),
    ('reportType', 'Restricted Appraisal Report is appropriate here. The sole intended user is the homeowner — no lender, no court, no IRS. A Restricted Report provides the value conclusion with supporting data at lower cost to the client. However, the appraiser must clearly state the use restriction and that the report is not intended for lending or any third-party reliance.', NULL, '{"selected":2}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report with Market Commentary Addendum"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0],"justifications":["Required and primary. This is what the homeowner needs — what are comparable homes selling for? Focus on recent closed sales, pending sales, and active listings to give the full market picture for pricing strategy.","May omit; the property is 20+ years old and cost data adds limited value for a pricing decision. The homeowner cares about what buyers will pay, not replacement cost.","Omit; owner-occupied, not relevant to the pricing question."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sales data PLUS active/pending listings and expired listings — critical for pricing strategy. Active listings represent the competition; expired listings reveal pricing mistakes. DOM and absorption trends help the homeowner understand market timing. This is where a pre-listing appraisal adds value beyond a CMA.', NULL, '{"selected":[0,1,2,3,4,6]}'::jsonb, '{"options":["MLS for comparable closed sales","MLS for active and pending listings (competition analysis)","County assessor/tax records","Market conditions analysis (DOM, inventory, absorption)","Price per square foot trends in the subdivision","Flood zone determination","Expired/withdrawn listings analysis"]}'::jsonb),
    ('compParams', '1–1.5 miles, same subdivision preferred. 6 months closed sales. ALL current active and pending listings in the competitive set. ±15% GLA. For pricing purposes, also note the listing-to-sale price ratio for recent sales — this helps the homeowner calibrate their asking price relative to market value.', NULL, '{"values":{"searchRadius":"1.5","timeframeClosed":"6","glaRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'None required. The appraiser should note that the value conclusion reflects market value as of the effective date — if market conditions change between the appraisal date and the listing date, the value may need to be reconsidered.', NULL, NULL, NULL),
    ('justification', 'Standard scope is appropriate for this straightforward private-client assignment. The Restricted Report format is suitable given the single intended user. The key value-add for the client is the market analysis beyond a simple value conclusion — active listing competition, expired listing analysis, and DOM trends help the homeowner make an informed pricing decision.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.2: Pre-Purchase Consultation — Buyer Due Diligence
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 2, 'basic', 'Pre-Purchase Consultation — Buyer Due Diligence', 'A prospective buyer wants an independent appraisal before making an offer on a 1940s Cape Cod listed for $299,000. The buyer is concerned about potential over-pricing and wants to know the market value before negotiating. The property has had two prior contracts fall through (reasons unknown). The buyer is paying cash — no lender is involved. The property has original hardwood floors, an updated bathroom, and a detached garage.

— Problem Identification (from Section 1) —
Client: Prospective buyer (Daniel Kim)
Intended Users: Daniel Kim (buyer only)
Intended Use: Pre-purchase due diligence — determine market value for offer negotiation
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with enhanced attention to condition issues for this 1940s home. The two failed contracts are a red flag — observable conditions (foundation issues, water staining, knob-and-tube wiring, asbestos indicators) that might explain the failed deals should be noted. Verify listing square footage against actual measurement — older homes are frequently mis-measured.', NULL, '{"selected":[0,1,2,3,4]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Enhanced condition documentation (1940s home concerns)","Note observable conditions that may explain failed contracts","Measurement verification against listing data","No physical inspection (desktop)"]}'::jsonb),
    ('reportType', 'Restricted Appraisal Report is appropriate — single intended user, private purpose. However, consider including more condition commentary than a typical Restricted Report since the buyer''s concern extends beyond value to property risks.', NULL, '{"selected":2}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report with Due Diligence Commentary"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Focus on similar-vintage homes in comparable condition — not updated homes that would overstate this property''s value.","Include; for a 1940s home, the cost approach with depreciation analysis highlights condition-based value impacts. Effective age vs. actual age analysis is informative for the buyer.","Omit; the buyer intends owner-occupancy."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus detailed listing history analysis — the two failed contracts and the listing timeline are critical context. Research whether the price was reduced after each failed contract. Permit history may reveal work done on the property. This is due diligence research beyond standard appraisal scope but directly serves the client''s needs.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for comparable sales","MLS listing history of subject (price changes, DOM, prior contracts)","County assessor/tax records","Market conditions analysis","Permit history of subject","Prior sale history of subject","Active/pending comparable listings"]}'::jsonb),
    ('compParams', '1–2 miles, 6 months. Wider age range (±20 years) for older housing stock. Prioritize comparable-condition homes — not extensively renovated properties. Include both similar-condition and updated sales to bracket the value.', NULL, '{"values":{"searchRadius":"2","timeframeClosed":"6","glaRange":"20","ageRange":"20"}}'::jsonb, NULL),
    ('eaHc', 'None required for the value conclusion. However: "The appraiser is not a home inspector. Observable conditions have been noted, but a professional home inspection is recommended before purchase. The reasons for the two prior contract failures are unknown to the appraiser and may reflect issues not observable during the appraisal inspection."', NULL, NULL, NULL),
    ('justification', 'This private buyer engagement requires standard appraisal scope with enhanced due diligence commentary. The buyer''s concern about over-pricing is addressed by the value conclusion; the concern about the failed contracts is addressed by enhanced condition observation and listing history analysis. The appraiser should recommend a professional home inspection.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.3: Divorce Mediation — Both Parties as Intended Users
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 3, 'basic', 'Divorce Mediation — Both Parties as Intended Users', 'A divorcing couple in mediation has agreed to hire a single appraiser acceptable to both parties to value the marital home — a 4-bedroom colonial with a finished basement and in-ground pool. Both spouses are intended users. The mediator will use the value for asset division. Neither party has legal counsel at this stage. The property is in a desirable school district and the market is competitive with low inventory.

— Problem Identification (from Section 1) —
Client: Both spouses jointly (Maria and Robert Gonzalez)
Intended Users: Maria Gonzalez; Robert Gonzalez; mediator (Carol Davis)
Intended Use: Marital asset valuation for mediation/equitable distribution
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule (impartiality), Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with enhanced documentation for transparency. Both parties are intended users with potentially competing interests. Enhanced photography and documentation protect the appraiser and promote acceptance by both parties. Both spouses should be notified of the inspection date. Pool and finished basement require specific attention as significant value contributors.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Enhanced photography for transparency to both parties","Pool measurement and condition documentation","Finished basement documentation","Both spouses present or notified of inspection","Measurement verification"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format. With multiple intended users who have competing interests, a Restricted Report is risky. Narrative format provides the transparency both parties need to accept the result.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report (Narrative with Mediation Context)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. In mediation, both parties will scrutinize the comparable selections — include more comparables than minimum to demonstrate thoroughness and prevent either party from claiming bias.","Include; the pool and finished basement have quantifiable cost components. Cost approach helps establish contributory value for these features.","Omit; owner-occupied residential."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus specific analysis of contested features. Pool and finished basement contributory values should be supported by paired sales analysis, not just assumed amounts. Enhanced market analysis documents the competitive market conditions.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for comparable sales","County assessor/tax records","Market conditions analysis (low inventory impact)","Pool contributory value analysis (paired sales)","Finished basement contributory value analysis","School district premium analysis","Prior sale history of subject","Active/pending listings for market context"]}'::jsonb),
    ('compParams', '1–2 miles, same school district. 6 months closed. ±15% GLA. Use 5–6 comparables rather than the minimum 3 — more data points reduce the ability of either party to claim bias. Include both with-pool and without-pool sales for paired analysis.', NULL, '{"values":{"searchRadius":"2","timeframeClosed":"6","glaRange":"15","numComps":"5"}}'::jsonb, NULL),
    ('eaHc', 'None required. Document in the report: "This appraisal was engaged jointly by both parties in a marital dissolution mediation. The appraiser has maintained impartiality and the value conclusion is not intended to advocate for either party''s position. Both parties were notified of the inspection."', NULL, NULL, NULL),
    ('justification', 'The dual-client context requires enhanced scope for transparency and acceptance. Enhanced documentation, additional comparables, and explicit analysis of contested features (pool, basement, school district) reduce the likelihood of rejection by either party. The appraiser''s impartiality is paramount. If the mediation fails and the case moves to litigation, this report may be used by either party''s attorney.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.4: Investment Analysis — Rental Property Acquisition
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 4, 'intermediate', 'Investment Analysis — Rental Property Acquisition', 'A private investor is considering purchasing a 4-unit apartment building listed at $520,000. The building was constructed in 1972, has a mix of 1BR and 2BR units, and current rents are approximately 15% below market. The investor wants a market value appraisal and also needs a market rent study, capitalization rate analysis, and cash flow projection to support the investment decision. The investor plans to raise rents to market after acquisition.

— Problem Identification (from Section 1) —
Client: Private investor (James Chen)
Intended Users: James Chen
Intended Use: Investment acquisition decision — determine market value and investment potential
Type and Definition of Value: Market Value; Market Rent Analysis; Investment Analysis (consulting components)
Effective Date: Current
Property Interest: Fee Simple (subject to existing leases)
Extraordinary Assumptions / Hypothetical Conditions: None anticipated for the appraisal; HC for as-stabilized projection
USPAP / Other Standards: Standards 1 & 2 (appraisal); Standard 4 if consulting components included; Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full interior inspection of ALL units — condition varies by unit in multi-family. Building systems (roof, HVAC, plumbing, electrical) must be evaluated for capital expenditure planning. Deferred maintenance quantification directly affects the investment analysis. Lease review and expense history are essential for the income approach and investment projections.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior inspection of all four units","Exterior inspection of subject building","Common area and building systems inspection","Documentation of unit mix, condition by unit, and rent-readiness","Assessment of deferred maintenance and capital needs","Exterior inspection of comparable sales and rentals","Review of current lease agreements","Review of operating expense history (if available)"]}'::jsonb),
    ('reportType', 'Combined Standards 1 & 2 Appraisal plus Standard 4 Consulting Report. The appraisal (market value, market rent) falls under Standards 1 & 2. The investment analysis (cash flow projection, return analysis, rent growth modeling) falls under Standard 4 (consulting). Clear separation between the objective appraisal and the client-specific investment analysis is essential.', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1025 — Small Income Property)","USPAP Appraisal Report (Narrative with Investment Analysis Addendum)","Restricted Appraisal Report","Combined Standards 1&2 Appraisal + Standard 4 Consulting Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required; use small apartment building sales. Analyze sale prices relative to income (GRM, price per unit) to provide context for the investor.","Include; the 1972 building age makes depreciation analysis meaningful. Capital needs assessment feeds into the investment analysis.","Essential and primary for income property. Develop GRM analysis AND direct capitalization. For the consulting component, also develop a DCF model with rent-to-market assumptions."]}'::jsonb, NULL),
    ('dataResearch', 'Comprehensive income-property research. Market rent survey is critical since current rents are 15% below market. Cap rate data from multiple sources. Operating expense benchmarks. Capital needs assessment. For the consulting component: rent growth projections and holding period assumptions.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for small apartment building sales","County assessor/tax records","Market rent survey (comparable 1BR and 2BR units)","Operating expense analysis (comparable buildings)","Capitalization rate data (local and published sources)","Vacancy and collection loss data","Current lease agreements and rent roll","Historical operating statements (if available)","Capital expenditure estimates","Rent growth projections for the area"]}'::jsonb),
    ('compParams', 'Sales: 3–5 miles, 12 months, 3–6 unit buildings. Rental comparables: tighter radius (1–2 miles) for market rent accuracy — rent is hyper-local. Include both stabilized and below-market-rent sales to analyze the impact of in-place rent levels on sale price.', NULL, '{"values":{"salesRadius":"5","rentalRadius":"2","timeframeClosed":"12","unitCount":"3-6"}}'::jsonb, NULL),
    ('eaHc', 'For the appraisal: value as fee simple (unencumbered) unless the client wants leased fee (reflecting in-place below-market rents). For the consulting/investment analysis: HC — "The cash flow projection assumes rents are raised to market rate within 12 months of acquisition, subject to lease terms and applicable landlord-tenant law." This HC must be clearly disclosed as part of the consulting analysis, not the market value conclusion.', NULL, NULL, NULL),
    ('justification', 'This dual-purpose engagement combines an appraisal (market value under Standards 1 & 2) with investment consulting (cash flow and return analysis under Standard 4). The income approach is the primary indicator for this property type. The market rent study is critical because the 15% below-market rent creates both a value consideration and an investment opportunity. The consulting component must be clearly separated from the appraisal.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.5: Estate Planning — Value Optimization for Intrafamily Transfer
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 5, 'intermediate', 'Estate Planning — Value Optimization for Intrafamily Transfer', 'An estate planning attorney is advising a client who wants to transfer a lakefront vacation home to their children at the lowest defensible value to minimize gift tax. The attorney has asked the appraiser to identify all supportable value-reducing factors. The property is a 2,800 SF home on a lake lot with a grandfathered non-conforming setback — the home is 25 feet from the lake vs. the current 75-foot requirement. The septic system is aging and the dock permit is non-transferable under current regulations.

— Problem Identification (from Section 1) —
Client: Estate planning attorney (Margaret Liu)
Intended Users: Margaret Liu, Esq.; property owner; IRS (if gift return audited)
Intended Use: Minimize gift tax exposure through identification of all supportable value-reducing factors
Type and Definition of Value: Market Value (considering all property-specific limitations)
Effective Date: Date of proposed transfer
Property Interest: Fee Simple (subject to non-conforming use, septic limitations, dock restrictions)
Extraordinary Assumptions / Hypothetical Conditions: None — the limitations ARE the conditions being valued
USPAP / Other Standards: Standards 1 & 2, Ethics Rule (objectivity — not advocacy), Competency Rule; IRS requirements'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with meticulous documentation of every value-reducing factor. The non-conforming setback must be measured and compared to current code. Septic age and condition must be documented. Dock permit non-transferability must be verified through the local regulatory authority. Each of these factors represents a supportable deduction from value that the IRS could accept.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Documentation of non-conforming setback with measurements","Septic system age and condition assessment","Dock condition and permit status documentation","Lake frontage and access documentation","Zoning verification (current requirements vs. grandfathered status)","Exterior inspection of comparables","Review of comparable properties'' conforming/non-conforming status"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — narrative format with dedicated analysis of each value-reducing factor. The IRS is the ultimate audience if audited. Each value reduction must be independently supported by market evidence — the appraiser cannot simply list limitations and assert a discount.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative with Property Limitation Analysis)","Restricted Appraisal Report","Consulting Report on Value-Reducing Factors"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required and primary. Must develop paired sales to quantify each limitation: conforming vs. non-conforming setback, transferable vs. non-transferable dock, updated vs. aging septic.","Essential for quantifying the cost to cure or replace deficient items (septic replacement, dock reconstruction). The non-conforming setback creates functional obsolescence captured in the cost approach.","Consider; if the property has rental potential, the value-reducing factors may affect rental value differently. Market rent analysis showing lower rent potential supports the sales comparison findings."]}'::jsonb, NULL),
    ('dataResearch', 'Extensive research to support each value-reducing factor independently. Zoning regulations documenting the non-conformity. Septic replacement costs from contractors. Dock permit regulations verified from the relevant authority. Paired sales isolating each factor''s impact. Each reduction must have its own evidentiary basis.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for lakefront comparable sales","County assessor/tax records","Zoning ordinance (current setback requirements)","Grandfathered use/non-conforming use regulations","Septic system replacement cost estimates","Dock permit regulations and transferability rules","Sales of properties with non-conforming setbacks","Sales of properties with/without docks","Sales of properties with aging/deficient septic systems","IRS precedent on property-specific value reductions"]}'::jsonb),
    ('compParams', 'Lakefront sales: same lake + comparable lakes, 5–10 miles. Paired sales for limitation analysis: expanded (15–20 miles) to find specific pairs. 12 months. Multiple paired analyses — setback, dock, septic — each requiring its own comparable set.', NULL, '{"values":{"lakefrontRadius":"10","pairedRadius":"20","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'No HC — the property is being valued with its actual limitations. EA: "The dock permit is assumed to be non-transferable based on the appraiser''s review of current regulations. If regulations change, the value conclusion could be affected." Also: "The septic system is assumed to be functional but at or near the end of its useful life. A professional septic inspection has not been performed."', NULL, NULL, NULL),
    ('justification', 'This engagement requires the appraiser to identify and quantify all supportable value-reducing factors — but the Ethics Rule prohibits advocacy. Each reduction must be market-supported, not assumed. The IRS has successfully challenged inflated deductions where limitations were asserted but not quantified. The attorney''s role is strategy; the appraiser''s role is objective market evidence. This distinction must be maintained.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.6: Insurance Replacement Cost — High-Value Custom Home
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 6, 'advanced', 'Insurance Replacement Cost — High-Value Custom Home', 'A homeowner has received an insurance renewal showing coverage of $850,000 for their 5,500 SF custom timber-frame home built in 2008 on a mountainside lot. The homeowner believes this is inadequate given the custom construction, high-altitude site access limitations, and specialty materials (heavy timber, standing seam metal roof, stone fireplace, radiant floor heating). The insurance company has agreed to accept an appraiser''s replacement cost estimate. This is NOT a market value assignment.

— Problem Identification (from Section 1) —
Client: Homeowner (Katherine Stowe)
Intended Users: Katherine Stowe; insurance company (Mountain State Insurance)
Intended Use: Establish replacement cost new for insurance coverage purposes
Type and Definition of Value: Replacement Cost New (NOT market value)
Effective Date: Current
Property Interest: N/A — cost estimate, not a property interest valuation
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standard 4 (Consulting) — this is not an appraisal of market value; Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Exhaustive interior and exterior inspection focused on construction details — every custom feature must be individually documented. Timber-frame construction has significantly different cost characteristics than conventional framing. Mountain site access increases material delivery and labor costs. The inspection is focused on WHAT IT WOULD COST TO REBUILD, not what a buyer would pay. No comparable sales inspection needed.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Detailed measurement of all living space and structural components","Documentation of all custom features and specialty materials","Timber frame system documentation (size, species, joinery)","Mechanical systems documentation (radiant heat, HVAC)","Site access assessment (impact on construction costs)","Foundation and retaining wall documentation","No comparable inspection needed (cost assignment, not market value)"]}'::jsonb),
    ('reportType', 'USPAP Standard 4 Consulting Report — replacement cost estimate. This is not a market value appraisal. Standard 4 governs consulting, which includes cost estimates for insurance purposes. The report should clearly state this is a cost estimate, not a market value opinion.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Standard 4 Consulting Report — Replacement Cost Estimate","USPAP Appraisal Report (Cost Approach Only)","Non-USPAP Insurance Cost Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[1],"justifications":["Not applicable — this is not a market value assignment. Sales comparison is irrelevant to replacement cost.","This IS the assignment — develop a detailed replacement cost new estimate. Must account for: custom timber-frame construction, specialty materials, mountain site premium, current labor and material costs.","Not applicable to an insurance replacement cost assignment."]}'::jsonb, NULL),
    ('dataResearch', 'All cost data sources are relevant. Standard cost services (Marshall & Swift) provide base costs but underestimate custom construction — supplement with timber-frame builder quotes and specialty subcontractor pricing. Mountain site premium includes material transport, equipment access, extended timelines, and specialized foundation work. Soft costs (architect, engineering, permits) are part of replacement cost but often overlooked.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["Cost estimation services (Marshall & Swift/CoreLogic)","Timber-frame builder cost data","Specialty material costs (standing seam metal, stone, heavy timber)","Local contractor labor rates","Mountain/altitude site premium data","Material delivery cost premium for remote sites","Radiant floor heating system costs","Foundation/retaining wall costs for sloped sites","Permit and development fees","Architect/engineering fees for custom design"]}'::jsonb),
    ('compParams', 'Use at least 3 independent cost sources for cross-validation. Obtain at least 2 timber-frame builder quotes. Site premium for mountain construction typically ranges 25–40% above standard. The goal is a supportable cost estimate the insurance company will accept.', NULL, '{"values":{"costSources":"3","builderQuotes":"2","sitePremium":"25-40"}}'::jsonb, NULL),
    ('eaHc', '"The replacement cost estimate assumes the structure is destroyed and must be rebuilt to current building codes using materials of like kind and quality, using current labor and material costs." Also: "This is a replacement cost estimate, not a reproduction cost estimate — functional equivalents of custom features are used where exact replication would be impractical."', NULL, NULL, NULL),
    ('justification', 'This is a consulting assignment focused entirely on replacement cost — the scope is fundamentally different from a market value appraisal. No sales comparison or income analysis is needed. The cost analysis must be detailed and component-specific, not a simple per-square-foot estimate. The site premium is a significant factor that insurance cost calculators often miss. Competency in custom construction cost estimating is required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.7: Relocation Appraisal — Corporate Transferee, Two-Appraisal Process
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 7, 'advanced', 'Relocation Appraisal — Corporate Transferee, Two-Appraisal Process', 'A Fortune 500 company is relocating an employee and has engaged a relocation management company (RMC) to facilitate the home sale. Under the company''s relocation policy, two independent appraisals are required. If the values are within 5%, they are averaged to set the guaranteed offer price. If they differ by more than 5%, a third appraisal is ordered. The property is a 4-bedroom, 3-bath home with a 3-season sunroom, detached workshop, and extensive landscaping on a 1-acre lot in a suburban area.

— Problem Identification (from Section 1) —
Client: Relocation Management Company (GlobalMove Inc.)
Intended Users: GlobalMove Inc.; employer (TechCorp); transferee/employee
Intended Use: Establish market value for guaranteed buyout offer under corporate relocation program
Type and Definition of Value: Market Value (anticipated sale price in a typical marketing period)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; ERC/Worldwide ERC Relocation Appraisal Guidelines'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection per ERC relocation guidelines, which typically exceed standard lending inspection requirements. Detailed measurement of sunroom (is it heated? year-round?), workshop (size, condition, market appeal), and landscaping. The transferee interview provides context about the property and neighborhood that may not be observable.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Detailed documentation per ERC/relocation standards","Measurement of sunroom, workshop, and all improvements","Condition documentation with marketability commentary","Landscaping documentation and contributory value assessment","Transferee interview regarding property features and neighborhood"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — ERC/Worldwide ERC relocation format. Most RMCs have specific report requirements including a residential appraisal report form with relocation-specific addenda covering: probable sale price, estimated marketing time, condition/marketability commentary, and ERC certifications. Confirm the specific format with GlobalMove.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (ERC Relocation Appraisal Report Format)","Restricted Appraisal Report","USPAP Appraisal Report (Narrative Format)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. The focus is on probable sale price — comparable selection should emphasize properties that actually sold in normal marketing conditions.","Include; the sunroom, workshop, and landscaping have quantifiable cost components. Cost analysis helps support adjustments for these features.","Omit; owner-occupied residential in a relocation context."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources with relocation-specific emphasis. Sale condition verification is critical — relocation sales may reflect different motivation. Listing-to-sale price ratios help establish the ''probable sale price.'' Marketing time estimate is required and must be supported by absorption data.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for comparable sales with detailed sale condition verification","County assessor/tax records","Market conditions analysis (absorption, DOM, inventory)","Active/pending listings (competitive inventory)","Listing-to-sale price ratios","Contributory value analysis (sunroom, workshop, landscaping)","Prior relocation sales in the area (if identifiable)","ERC/RMC specific requirements checklist"]}'::jsonb),
    ('compParams', '1–3 miles, 6 months. ±15% GLA, similar lot size (0.5–2.0 acres). The 5% threshold between the two appraisals creates implicit pressure for precision. DO NOT attempt to coordinate or match the other appraiser''s analysis — independence is required.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"6","glaRange":"15","lotSize":"0.5-2.0"}}'::jsonb, NULL),
    ('eaHc', 'None required for a standard relocation appraisal. Note the ERC certification requirements: the appraiser certifies they performed the appraisal independently, have no interest in the property, and that the value represents a probable sale price achievable in a typical marketing period. The appraiser should NOT be told the other appraiser''s value conclusion before completing their analysis.', NULL, NULL, NULL),
    ('justification', 'Relocation appraisals operate under specific ERC/Worldwide ERC guidelines. The two-appraisal process demands precision — if values differ by more than 5%, a third appraisal is ordered. The focus on ''probable sale price'' requires thinking like the market. Marketing time and competitive market analysis are required components. Competency in relocation appraisal methodology and ERC guidelines is beneficial.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.8: Feasibility Study — Renovation vs. Teardown Analysis
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 8, 'expert', 'Feasibility Study — Renovation vs. Teardown Analysis', 'A private buyer has a contract on a 1,500 SF 1948 bungalow on a large lot (0.75 acres) in a transitioning neighborhood where new construction homes of 3,000+ SF are selling for $600,000–$750,000 while original bungalows sell for $250,000–$320,000. The buyer wants to know: (1) market value as-is, (2) market value if renovated/expanded to 2,800 SF, (3) market value if demolished and rebuilt as new construction, and (4) which option yields the highest return on investment. The lot zoning allows up to 4,000 SF.

— Problem Identification (from Section 1) —
Client: Private buyer (Alex Rivera) through their real estate attorney
Intended Users: Alex Rivera; attorney
Intended Use: Investment decision — renovation vs. teardown feasibility analysis
Type and Definition of Value: Market Value As-Is; Market Value As-Renovated; Market Value As-New-Construction; Feasibility/ROI Analysis
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC for as-renovated and as-new-construction scenarios
USPAP / Other Standards: Standards 1 & 2 (appraisals); Standard 4 (feasibility consulting); Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with dual focus: (1) renovation feasibility — can the structure support expansion? Is the foundation adequate? What''s salvageable? (2) New construction feasibility — what are the site constraints? Both scenarios require detailed physical and regulatory assessment. The appraiser is not a structural engineer but should identify factors requiring engineering evaluation.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Structural assessment (renovation feasibility)","Foundation capacity assessment for second-story addition","Site assessment for new construction (setbacks, topography, utilities)","Documentation of salvageable vs. replacement components","Exterior inspection of comparable properties (original and new)","Review of zoning setbacks, height limits, FAR restrictions","Review of demolition requirements and permit process"]}'::jsonb),
    ('reportType', 'Combined Standards 1 & 2 Appraisal (three value conclusions) plus Standard 4 Feasibility/ROI Analysis. The three market values are appraisal assignments. The ROI analysis comparing the three scenarios is a consulting assignment under Standard 4. Clear separation between the objective value conclusions and the client-specific investment analysis is essential.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","Combined Standards 1&2 Appraisal (3 Values) + Standard 4 Feasibility Analysis","Standard 4 Consulting Report Only","USPAP Appraisal Report (Narrative, Multi-Scenario)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for all three scenarios. As-Is: original bungalow sales. As-Renovated: renovated/expanded home sales. As-New-Construction: new construction sales. Three distinct comparable sets needed.","Essential for all scenarios. As-Is: depreciation analysis. Renovation: cost to renovate/expand (drives the feasibility). New Construction: land value + construction cost (drives the teardown feasibility).","Consider; the transitioning neighborhood may have investor-buyers evaluating rental returns. If the buyer might rent the property, income analysis at each scenario level adds decision-making value."]}'::jsonb, NULL),
    ('dataResearch', 'Three distinct market analyses plus comprehensive cost data for both scenarios. Contractor estimates for renovation AND new construction drive the feasibility math. Demolition costs. Carrying costs affect the ROI. Neighborhood transition analysis determines whether the market is moving toward new construction values.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for original bungalow sales","MLS for renovated/expanded home sales","MLS for new construction sales","Renovation contractor estimates","New construction builder estimates","Demolition cost estimates","Zoning/building regulations and permit costs","Land value analysis (extraction from new construction sales)","Construction timeline and carrying cost analysis","Neighborhood transition analysis (pace and direction)"]}'::jsonb),
    ('compParams', 'Three comparable sets: (1) Original bungalows in similar transition areas, ±20% GLA, (2) Renovated/expanded homes (bungalow-to-larger conversions), (3) New construction on comparable lots. Renovated-sale comparables are the most critical and hardest to find — they directly test whether the renovation premium exceeds the renovation cost.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"12","bungalowGla":"20","newConstGla":"15"}}'::jsonb, NULL),
    ('eaHc', 'HC for As-Renovated: "The property is valued as if renovated and expanded to approximately 2,800 SF per a scope of work consistent with neighborhood standards." HC for As-New-Construction: "The property is valued as if the existing bungalow has been demolished and replaced with a new-construction home of approximately 3,200 SF." EA for renovation: "The existing foundation is assumed to support the proposed expansion. A structural engineering assessment has not been performed."', NULL, NULL, NULL),
    ('justification', 'This triple-scenario analysis with feasibility consulting is one of the most analytically demanding private-client assignments. Three independent value conclusions require three distinct comparable analyses and cost studies. The feasibility analysis synthesizes all three scenarios: As-Is value vs. (As-Renovated value minus renovation cost minus carrying cost) vs. (As-New-Construction value minus demolition + construction + carrying cost). Competency in renovation cost estimating, new construction cost analysis, and investment feasibility methodology is required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.9: Dispute Resolution — Neighbor Damage Claim, Tree Removal
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 9, 'expert', 'Dispute Resolution — Neighbor Damage Claim, Tree Removal', 'A homeowner''s neighbor hired a tree service that mistakenly removed 8 mature hardwood trees (oaks and maples, 60–80 years old, 24–36 inch DBH) from the client''s property along the rear boundary, eliminating a mature tree screen that provided privacy from a commercial property behind the homes. The client''s attorney needs: (1) diminution in value from the tree loss, (2) the cost of replacement/restoration, and (3) an analysis of which measure of damages is appropriate. The property is a 4-bedroom colonial on a 0.85-acre lot in an upscale neighborhood.

— Problem Identification (from Section 1) —
Client: Attorney John Harris (representing property owner)
Intended Users: John Harris, Esq.; tree service''s insurer; opposing counsel; the court (if litigated)
Intended Use: Establish damages from wrongful tree removal — diminution in value and restoration cost
Type and Definition of Value: Market Value Before Removal; Market Value After Removal; Diminution; Restoration Cost
Effective Date: Current (post-removal condition); retrospective (pre-removal)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC for before value — as if trees still existed
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; Standard 4 if consulting on damage methodology'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with comprehensive tree-loss documentation. Stumps provide evidence of tree size (DBH) and species. Pre-removal photos are critical — Google Street View historical imagery is an excellent source. The loss of privacy screening from a commercial property is a specific, documentable impact. An arborist consultation is essential for tree valuation and replacement feasibility.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Detailed documentation of tree removal area","Stump measurement and species identification","Photography of loss of privacy screening (commercial exposure)","Review of pre-removal photographs (client, Google Street View historical)","Arborist consultation for tree valuation and replacement planning","Assessment of replacement feasibility (access, planting conditions)","Exterior inspection of comparables","Documentation of neighboring properties'' mature landscaping"]}'::jsonb),
    ('reportType', 'Combined Standards 1 & 2 Appraisal (before/after values and diminution) plus Standard 4 Consulting (analysis of which damage measure is appropriate). In many jurisdictions, the plaintiff can recover the greater of diminution or restoration cost, up to the diminished property value. The appraiser should present both measures and analyze their relationship.', NULL, '{"selected":2}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative, Diminution + Restoration Cost Analysis)","Combined Standards 1&2 Appraisal + Standard 4 Damages Methodology Consulting","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for both before and after values. Paired sales analysis of properties with and without mature tree screening (especially backing to commercial) is ideal.","Essential for restoration cost analysis. Arborist-provided replacement costs, installation costs, and the cost of interim screening during years required for replacement trees to mature.","Omit; owner-occupied residential."]}'::jsonb, NULL),
    ('dataResearch', 'Comprehensive dual-track research: real estate diminution AND arboricultural restoration. Large caliper specimen trees (8–10 inch) may cost $5,000–$15,000+ each installed — but still won''t replicate 60–80 year old trees for decades. Published research (USDA Forest Service, CTLA) quantifies tree contribution to property value at 10–20% in many studies.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10]}'::jsonb, '{"options":["MLS for comparable sales","Sales of properties with/without mature tree screening","Sales backing to commercial vs. buffered from commercial","Arborist report (CTLA trunk formula valuation)","Replacement tree cost estimates (large caliper specimen trees)","Installation and transplanting cost estimates","Interim screening solutions and costs","Time-to-maturity analysis for replacement trees","Pre-removal photographs (all available sources)","Published research on tree value contribution to property value","Jurisdictional case law on tree damage measures"]}'::jsonb),
    ('compParams', 'Standard comparables: 1–3 miles for the baseline values. Paired analysis for tree/screening impact: expanded (5–10 miles) to find properties backing to commercial with and without screening. 12 months. The paired analysis is the most critical and challenging element.', NULL, '{"values":{"standardRadius":"3","pairedRadius":"10","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'HC for before value: "The property is valued under the hypothetical condition that the 8 mature hardwood trees along the rear boundary are still in place and providing a full privacy screen, consistent with pre-removal photographs." EA: "The tree species and sizes are based on stump measurements. The pre-removal condition and health is assumed to be good based on available photographs. A pre-removal arborist assessment was not performed."', NULL, NULL, NULL),
    ('justification', 'This assignment combines real estate appraisal with arboricultural valuation and damages methodology consulting. In upscale neighborhoods, mature trees and privacy screening are significant value components, and the loss may exceed replacement cost because the time-to-maturity of replacement trees means years without equivalent screening. Coordination with a certified arborist is essential but the appraiser must independently translate the tree loss into market value impact.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 4.10: Multi-Property Portfolio Valuation — Family Office
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 10, 'expert', 'Multi-Property Portfolio Valuation — Family Office', 'A family office managing a high-net-worth family''s real estate holdings needs a comprehensive portfolio valuation of 7 residential properties across 3 states for estate planning, insurance coverage review, and potential 1031 exchange planning. The portfolio includes: (1) a primary residence — 7,000 SF estate on 10 waterfront acres, (2) a ski vacation condo, (3) a beach house with erosion concerns, (4) a 6-unit apartment building, (5) a single-family rental in a college town, (6) an undeveloped lakefront lot, and (7) a historic home being used as an Airbnb.

— Problem Identification (from Section 1) —
Client: Family Office (Westbrook Capital Management)
Intended Users: Westbrook Capital Management; family members; estate attorneys; CPAs; insurance carriers
Intended Use: Comprehensive portfolio valuation for estate planning, insurance review, and exchange planning
Type and Definition of Value: Market Value for each property; Replacement Cost for insurance; Exchange value analysis for 1031
Effective Date: Current (all 7 properties as of the same date)
Property Interest: Fee Simple (most); property-specific interests where applicable
Extraordinary Assumptions / Hypothetical Conditions: Multiple property-specific EAs anticipated
USPAP / Other Standards: Standards 1 & 2 (each property), Standard 4 (portfolio/consulting), Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 4
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection of all 7 properties requiring multi-state travel. Each property has unique inspection requirements. The beach house needs coastal erosion assessment. The apartment building needs all-unit inspection plus income review. The undeveloped lot needs development feasibility assessment. The historic Airbnb needs preservation compliance review plus short-term rental income analysis. This requires 5–7 days of field work across 3 states.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Full inspection of all 7 properties (3-state travel required)","Waterfront estate: comprehensive with site improvements","Ski condo: interior, common areas, HOA review","Beach house: erosion/coastal hazard assessment","Apartment building: all 6 units, building systems, income review","College rental: standard SFR plus rental condition","Undeveloped lot: development potential, environmental, access","Historic Airbnb: historic features, preservation requirements, income","Exterior inspection of comparables in each market"]}'::jsonb),
    ('reportType', 'Seven individual USPAP Appraisal Reports (each property gets its own Standards 1 & 2 compliant report), PLUS a Standard 4 Portfolio Summary/Consulting Report synthesizing the portfolio-level analysis for estate planning, insurance review, and 1031 exchange planning. Individual reports allow each to be used independently. Format varies by property type.', NULL, '{"selected":1}'::jsonb, '{"options":["Seven Individual USPAP Appraisal Reports","Portfolio Report: 7 Individual Appraisals + Standard 4 Portfolio Summary","Single Combined USPAP Appraisal Report covering all 7","Restricted Appraisal Reports for all 7"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for all 7 properties. Each requires its own market analysis in its local market — 3 states means at least 5–7 distinct comparable searches.","Required for the waterfront estate (insurance replacement), useful for the beach house (erosion-adjusted depreciation), and the undeveloped lot. Also needed for the historic home (reproduction cost of historic features).","Essential for the apartment building (primary approach), the college rental (GRM/rent analysis), and the Airbnb (short-term rental income analysis). Consider for the ski condo if it has rental history."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum research scope multiplied by 7 properties. Each property requires its own complete data set in its local market. The Competency Rule may require associating with local appraisers in unfamiliar markets. Short-term rental data for the Airbnb is a distinct data set from traditional rentals. Coastal erosion data may require consultation with a coastal engineer.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11]}'::jsonb, '{"options":["MLS data in each of the 3 states / multiple markets","County records in each jurisdiction","Income/rental data for 3 income-producing properties","Short-term rental data (Airbnb/VRBO) for historic home","Coastal erosion maps and studies for beach house","HOA financials and condo documents for ski condo","Development regulations for undeveloped lot","Historic preservation requirements and restrictions","Insurance replacement cost data for estate home","1031 exchange timing and identification requirements","Estate planning value considerations for each property","Local market expert consultation in unfamiliar markets"]}'::jsonb),
    ('compParams', '5–7 distinct market areas across 3 states. Approximately 45–60 total comparable sales across all properties. Standard 6–12 month timeframe per market. The waterfront estate, beach house, undeveloped lot, and historic Airbnb likely require expanded search parameters. Each market has its own dynamics.', NULL, '{"values":{"marketsCount":"5-7","totalComps":"45-60","timeframeClosed":"12","propertiesRequiringExpanded":"4"}}'::jsonb, NULL),
    ('eaHc', 'Multiple property-specific EAs: (1) Beach house: "EA that the current rate of coastal erosion will continue at the historical average; an acceleration could materially affect value." (2) Historic Airbnb: "EA that current short-term rental regulations will remain in effect; if STR regulations change, income potential could be materially affected." (3) Undeveloped lot: "EA that the lot is developable per current zoning and that no environmental contamination exists; assessment not performed." (4) Ski condo: "EA that the HOA financial condition is stable and no special assessments are pending."', NULL, NULL, NULL),
    ('justification', 'This is the most comprehensive private consulting engagement in the module — 7 individual appraisals across 3 states plus a portfolio-level consulting analysis. The Competency Rule is the critical threshold — the appraiser must honestly assess whether they have competency in all 7 property types across 3 states. Association with local appraisers may be necessary. The family office expects a single point of contact managing the entire engagement — project management competency is required alongside appraisal competency. Fee and timeline must reflect 100–200+ hours.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- ─────────────── Category 5: Government & Public Use ───────────────
-- Scenarios for category M2-S2-C5

-- Scenario 5.1: Municipal Property Acquisition — Voluntary Sale for Park Expansion
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 1, 'basic', 'Municipal Property Acquisition — Voluntary Sale for Park Expansion', 'A city parks department wants to purchase a single-family home adjacent to an existing park to expand the park''s footprint. The homeowner is willing to sell. The city requires an independent appraisal to establish fair market value for the voluntary acquisition. The property is a 3-bedroom, 1.5-bath ranch built in 1975 on a 0.30-acre lot. The home is in average condition. The city is using local funds (no federal funding involved). Active market with adequate comparable sales.

— Problem Identification (from Section 1) —
Client: City of Maplewood Parks Department
Intended Users: City of Maplewood; homeowner (seller); city council (approval authority)
Intended Use: Establish market value for voluntary municipal property acquisition
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; local government procurement requirements'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Interior and exterior inspection with documentation of the property''s relationship to the adjacent park. The park proximity may affect value positively (amenity) or negatively (traffic, noise during events) — the appraiser must analyze both effects. Standard scope is appropriate for a voluntary acquisition with local funding — no federal requirements apply.', NULL, '{"selected":[0,1,2,3,4]}'::jsonb, '{"options":["Interior and exterior inspection of subject","Exterior inspection of comparables","Documentation of proximity to existing park","Assessment of any park-related impacts (traffic, noise, views)","Measurement verification","No physical inspection (desktop)"]}'::jsonb),
    ('reportType', 'USPAP Appraisal Report — form with municipal acquisition addendum. A standard form report is generally acceptable for voluntary local acquisitions. The addendum should address the park proximity impact and confirm the property is valued at its current highest and best use (residential), not its proposed use (park).', NULL, '{"selected":3}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","USPAP Appraisal Report (Narrative Format)","Restricted Appraisal Report","USPAP Appraisal Report (Form 1004 with Municipal Acquisition Addendum)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Standard residential comparable analysis. Note any premium or discount for park adjacency through market evidence.","Include; the 1975 construction date makes cost analysis with depreciation meaningful. Provides secondary support for the municipal decision-makers.","Omit; owner-occupied SFR. Not relevant."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus municipal context. Review the park expansion plans — while the property is valued at its current use, understanding the project helps ensure the appraisal addresses the right property interest. Zoning verification confirms the highest and best use determination.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["MLS for comparable sales","County assessor/tax records","Market conditions analysis","Flood zone determination","Municipal zoning and land use plans","Park expansion plans (to understand proposed use)","Prior sales of properties to municipalities in the area"]}'::jsonb),
    ('compParams', 'Standard parameters: 1–1.5 miles, 6 months, ±15% GLA, ±15 years age. Include at least one park-adjacent sale if available to directly analyze the amenity/nuisance impact. The value must reflect what a willing buyer would pay for this property as a residence — the city''s intended park use is irrelevant to the market value conclusion.', NULL, '{"values":{"searchRadius":"1.5","timeframeClosed":"6","glaRange":"15","ageRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'None required. The appraiser should explicitly state: "The property is valued at its current highest and best use as a residential property. The acquiring agency''s intended use as parkland is not considered in the valuation." This is not an EA/HC but an important clarification for the municipal client and the homeowner.', NULL, NULL, NULL),
    ('justification', 'Standard scope for a straightforward voluntary municipal acquisition. The key distinction is ensuring the value reflects market conditions independent of the acquiring agency''s intended use. Local funding means no Yellow Book or Uniform Act requirements apply, but good government practice still requires an independent, USPAP-compliant appraisal. No unusual competency requirements.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.2: HUD/Public Housing Authority — Fair Market Rent Determination
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 2, 'basic', 'HUD/Public Housing Authority — Fair Market Rent Determination', 'A local Public Housing Authority (PHA) needs fair market rent determinations for 15 single-family homes it administers under the Housing Choice Voucher (Section 8) program. The homes are scattered-site units ranging from 2–4 bedrooms in various neighborhoods. The PHA needs rent reasonableness determinations to ensure the rents charged do not exceed comparable unassisted units. An annual re-evaluation is required.

— Problem Identification (from Section 1) —
Client: Metro Area Public Housing Authority
Intended Users: PHA; HUD (oversight); landlords; voucher holders
Intended Use: Rent reasonableness determination under Housing Choice Voucher program
Type and Definition of Value: Fair Market Rent (not market value of the property)
Effective Date: Current
Property Interest: Leasehold (tenant''s interest under voucher program)
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standard 4 (Consulting — rent study, not property appraisal); HUD regulations 24 CFR 982.507'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Exterior inspection of all 15 units to verify location and condition. Interior inspection of a representative sample (5–6 units covering the range of bedroom counts and neighborhoods) to establish condition benchmarks. Full interior of all 15 may not be cost-effective. Document amenities and condition per unit since these drive rent levels.', NULL, '{"selected":[0,2,3,4]}'::jsonb, '{"options":["Exterior inspection of all 15 subject units","Interior inspection of all 15 subject units","Interior inspection of a representative sample (5–6 units)","Condition and amenity documentation per unit","Exterior survey of comparable rental properties","No inspection — desktop rent analysis only"]}'::jsonb),
    ('reportType', 'USPAP Standard 4 Consulting Report — Rent Reasonableness Study. This is a rent analysis, not a property value appraisal. Standard 4 is the appropriate USPAP standard for consulting assignments including rent studies. The report can cover all 15 units in a single document organized by bedroom count and neighborhood.', NULL, '{"selected":1}'::jsonb, '{"options":["15 Individual USPAP Appraisal Reports","USPAP Standard 4 Consulting Report — Rent Reasonableness Study","Restricted Appraisal Report for each unit","Non-USPAP Rent Reasonableness Certification"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[2],"justifications":["Not applicable — this is a rent study, not a property sale value analysis.","Not applicable to a rent determination.","This IS the assignment — rental comparison analysis. Compare the subject units'' proposed rents to unassisted comparable rentals in each neighborhood. Must compare: rent level, bedroom count, size, condition, amenities, location, and utilities included."]}'::jsonb, NULL),
    ('dataResearch', 'Comprehensive rental data from multiple sources. HUD FMR schedules provide the ceiling framework. Unassisted comparable rentals (not other voucher units) are the benchmark per HUD regulations. Utility allowances affect the net rent comparison. Multiple data sources are needed because no single rental database is comprehensive.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS/rental databases for comparable unassisted rentals","Online rental platforms (Zillow, Apartments.com, Craigslist)","PHA records for subject unit characteristics","HUD Fair Market Rent schedules for the metro area","Utility allowance schedules","Neighborhood-level rental market analysis","Landlord interviews for comparable rental data","HUD 24 CFR 982.507 rent reasonableness requirements"]}'::jsonb),
    ('compParams', 'Tight radius (0.5–1 mile per neighborhood) — rent is hyper-local. Current rentals only (within 3 months). Minimum 3 comparable unassisted rentals per subject unit. Must match bedroom count, approximate size, condition, and amenities. Utility inclusion must be comparable or adjusted.', NULL, '{"values":{"searchRadius":"1","timeframe":"3","compsPerUnit":"3"}}'::jsonb, NULL),
    ('eaHc', 'EA for sampled units: "For units not individually inspected, the condition and amenities are assumed to be consistent with the PHA''s representations and the sampled units of comparable type. If actual conditions differ, the rent conclusions for those units may require adjustment."', NULL, NULL, NULL),
    ('justification', 'This is a consulting assignment (Standard 4) focused on rent analysis, not property valuation. The scope must comply with HUD rent reasonableness requirements while being cost-effective for 15 units. The key analytical challenge is finding truly comparable unassisted rentals — subsidized and assisted rentals cannot serve as comparables per HUD rules. Annual re-evaluation means this is a recurring engagement.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.3: County Tax Assessment — Mass Appraisal Review
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 3, 'basic', 'County Tax Assessment — Mass Appraisal Review', 'A county assessor''s office has contracted with an appraisal firm to review and validate the mass appraisal values for a residential subdivision of 120 homes. The subdivision was built in phases from 2010–2018 and includes 3 and 4-bedroom models on lots ranging from 0.20–0.40 acres. The county''s CAMA system generated assessed values that the assessor wants independently verified before the assessment rolls are finalized. Several homeowners have complained about perceived inconsistencies.

— Problem Identification (from Section 1) —
Client: County Assessor''s Office (Washington County)
Intended Users: County Assessor; Board of Equalization; taxpayers (indirectly)
Intended Use: Validate mass appraisal values for assessment roll certification
Type and Definition of Value: Market Value (assessment standard per state statute)
Effective Date: Assessment date (January 1 of current year)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2 (if individual appraisals); Standard 5 (Mass Appraisal); Standard 6 (Mass Appraisal Review); Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Exterior inspection of a statistically valid sample (not all 120). The sample must be representative of the subdivision''s range of models, ages, and lot sizes. Compare CAMA data against actual observed characteristics for each sampled property — data errors are the most common source of assessment inconsistencies. Verify calibration sales used in the CAMA model.', NULL, '{"selected":[1,3,4,5,6]}'::jsonb, '{"options":["Exterior inspection of all 120 properties","Exterior inspection of a statistically valid sample","Interior inspection of a representative sample","Comparison of CAMA data to actual property characteristics","Verification of CAMA model variables (SF, lot size, quality, condition)","Inspection of recent sales used as calibration points","Neighborhood-level condition survey"]}'::jsonb),
    ('reportType', 'USPAP Standard 6 Mass Appraisal Review Report. This is a review of the assessor''s mass appraisal — Standard 6 governs mass appraisal review. The report should include: statistical analysis of assessment-to-market ratios, identification of systematic errors, evaluation of the CAMA model''s accuracy and equity, and recommendations for adjustments.', NULL, '{"selected":1}'::jsonb, '{"options":["120 Individual USPAP Appraisal Reports","USPAP Standard 6 Mass Appraisal Review Report","Consulting Report on CAMA System Accuracy","Statistical Ratio Study Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for ratio study analysis. Recent sales in the subdivision provide the benchmark to test whether CAMA-generated values are accurate. Calculate assessment-to-sale price ratios for all available sales to measure accuracy and equity.","Review the CAMA system''s cost model — mass appraisal typically relies heavily on cost approach with market calibration. Evaluate whether the cost tables, depreciation schedules, and quality ratings produce reasonable results.","Not applicable for single-family residential mass appraisal review."]}'::jsonb, NULL),
    ('dataResearch', 'Statistical analysis is the primary research method. Pull all sales for ratio testing. Calculate COD (measure of assessment uniformity — IAAO standard is COD <15 for residential) and PRD (measure of vertical equity — should be 0.98–1.03). Review the CAMA model''s specifications to understand how it generates values. Address the specific homeowner complaints.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["All sales in the subdivision (12–24 months)","CAMA database records for all 120 properties","CAMA model specifications and calibration methodology","Assessment-to-sale ratio calculations","Coefficient of dispersion (COD) analysis","Price-related differential (PRD) analysis","Comparable subdivision assessments for equity testing","State assessment standards and ratio requirements","Homeowner complaints and specific properties flagged"]}'::jsonb),
    ('compParams', 'Use all available sales (likely 15–25 in the subdivision over 12–24 months). Field sample of 20–30 properties for data verification. Target assessment ratio per state statute (often 100% of market value). COD target <15 per IAAO standards.', NULL, '{"values":{"salesCount":"15-25","sampleSize":"20-30","ratioTarget":"100","codTarget":"15"}}'::jsonb, NULL),
    ('eaHc', 'EA: "The CAMA data provided by the assessor''s office is assumed to be complete and accurate for properties not individually verified through field inspection. Data errors identified in the sample may indicate broader data quality issues in the unsampled population." The report should recommend full data verification if the sample reveals a high error rate.', NULL, NULL, NULL),
    ('justification', 'This is a Standard 5/6 mass appraisal review assignment — fundamentally different from individual appraisals. The scope is statistical and system-level. The appraiser must evaluate whether the CAMA system produces values that are accurate (ratio analysis) and equitable (COD/PRD analysis). The appraiser must be competent in mass appraisal methodology, IAAO standards, and statistical analysis. The deliverable is a recommendation: certify, adjust, or recalibrate.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.4: Federally Funded Acquisition — Uniform Act Compliance
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 4, 'intermediate', 'Federally Funded Acquisition — Uniform Act Compliance', 'A state transportation department is acquiring a residential property for a federally funded highway interchange project. The property is a 4-bedroom bi-level on a 0.50-acre lot. The project requires a complete take of the property. The acquisition must comply with the Uniform Relocation Assistance and Real Property Acquisition Policies Act (Uniform Act) and the Uniform Appraisal Standards for Federal Land Acquisitions (Yellow Book). The property has a detached garage, above-ground pool, and a storage shed.

— Problem Identification (from Section 1) —
Client: State Department of Transportation (DOT)
Intended Users: State DOT; FHWA (federal funding oversight); property owner; relocation specialist
Intended Use: Establish just compensation for complete taking under Uniform Act
Type and Definition of Value: Market Value (Yellow Book definition)
Effective Date: Date of valuation (as set by DOT)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2; UASFLA (Yellow Book); Uniform Act (49 CFR Part 24); Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive inspection per Yellow Book standards, which exceed USPAP minimums. The Uniform Act REQUIRES that the property owner be given the opportunity to accompany the appraiser during inspection. All improvements contributing value must be measured, documented, and photographed. Personal property items must be identified and excluded from the valuation.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of subject (owner-accompanied)","Measurement of all improvements including garage, pool, shed","Documentation exceeding standard residential scope","Exterior inspection of comparables","Property owner given opportunity to accompany inspection","Review of DOT project plans and right-of-way maps","Documentation of personal property items (not included in value)","Photograph all improvements per Yellow Book standards"]}'::jsonb),
    ('reportType', 'Yellow Book compliant narrative appraisal report. The Yellow Book has specific requirements beyond USPAP including: larger parcel determination, project influence analysis, identification of compensable and non-compensable items, and specific certification language. Form reports are generally not acceptable for Yellow Book work.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","Yellow Book Compliant Appraisal Report (Narrative)","Restricted Appraisal Report","USPAP Appraisal Report (Form with Federal Addenda)"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required and primary. Yellow Book emphasizes the sales comparison approach for residential properties. Must analyze the market without considering the project''s influence on values (project influence must be excluded per Uniform Act).","Required by Yellow Book for improved properties when cost data is available and reliable. Provides independent support. Must separately value the site improvements (garage, pool, shed).","Omit; owner-occupied residential. Not applicable."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus Yellow Book requirements. Project influence analysis is critical — the Uniform Act requires that any increase or decrease in value caused by the project itself be excluded from the valuation. Title report confirms ownership and interests. Relocation benefits are separate from just compensation but should be noted.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for comparable sales","County assessor/tax records","DOT project plans and right-of-way maps","Analysis of project influence on comparable sales","Cost data for all site improvements","Flood zone determination","Zoning verification","Title report/deed records","Market conditions analysis (excluding project influence)","Relocation eligibility considerations (noted, not valued)"]}'::jsonb),
    ('compParams', '1–3 miles, 12 months, ±15% GLA. Critical: exclude or adjust for any project influence on comparable sales. If the highway interchange announcement has elevated or depressed nearby values, those effects must be stripped out. Select comparables outside the project''s influence area if possible.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"12","glaRange":"15"}}'::jsonb, NULL),
    ('eaHc', 'The Yellow Book requires that the property be valued without project influence — this is a statutory requirement, not an HC. State: "In compliance with the Uniform Act and UASFLA, the value conclusion excludes any increase or decrease in value attributable to the highway interchange project. Comparable sales have been analyzed for project influence and adjusted or excluded accordingly."', NULL, NULL, NULL),
    ('justification', 'Federal funding triggers Yellow Book compliance, which imposes requirements beyond USPAP. The appraiser must be familiar with: UASFLA/Yellow Book standards, Uniform Act property owner rights, project influence exclusion requirements, and the federal review process. The appraisal will be reviewed by a qualified review appraiser before the DOT establishes the just compensation offer. Competency in Yellow Book methodology is essential.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.5: Community Development Block Grant — Neighborhood Rehabilitation Baseline
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 5, 'intermediate', 'Community Development Block Grant — Neighborhood Rehabilitation Baseline', 'A city is receiving CDBG funding for a neighborhood rehabilitation program targeting a 6-block area with 85 residential properties showing significant deterioration. The city needs baseline appraisals of 20 representative properties (before rehabilitation) and will need post-rehabilitation appraisals to demonstrate program impact for HUD reporting. The properties range from modest bungalows to multi-family duplexes, all built between 1930–1955, in fair to poor condition.

— Problem Identification (from Section 1) —
Client: City of Riverside Community Development Department
Intended Users: City of Riverside; HUD (CDBG oversight); program beneficiaries
Intended Use: Establish pre-rehabilitation baseline values for CDBG program impact measurement
Type and Definition of Value: Market Value As-Is (pre-rehabilitation baseline)
Effective Date: Current (baseline date prior to rehabilitation)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None for baseline — post-rehabilitation will require HC analysis
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; HUD CDBG reporting requirements'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection of all 20 properties using a STANDARDIZED protocol — consistency across properties is critical because these appraisals will be compared to post-rehabilitation appraisals. The same condition rating system, photography angles, and deficiency documentation must be applied uniformly. Environmental hazards must be noted given the pre-1978 construction.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection of all 20 subject properties","Standardized condition documentation protocol across all properties","Detailed deficiency cataloging for each property","Photography protocol consistent across all 20 properties","Neighborhood-level condition documentation","Exterior inspection of comparables","Documentation of environmental hazards (lead, asbestos potential)","Coordinate inspection access with property owners/tenants"]}'::jsonb),
    ('reportType', '20 individual USPAP Appraisal Reports using a standardized narrative template. Each property needs its own report for individual value conclusion, but a consistent template ensures comparability for the post-rehabilitation analysis. The template should include standardized condition scoring and structured sections that will mirror the post-rehab reports.', NULL, '{"selected":1}'::jsonb, '{"options":["20 Individual USPAP Appraisal Reports (Form 1004)","20 Individual USPAP Appraisal Reports (Standardized Narrative Template)","Single Portfolio Report covering all 20 properties","Restricted Appraisal Reports for each property"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for all 20 properties. Must use sales reflecting the pre-rehabilitation condition — not updated/rehabilitated properties. This distressed-condition market segment may have limited data.","Essential for baseline — the cost approach with heavy depreciation analysis documents the physical deterioration that the CDBG program aims to correct. Pre- and post-rehabilitation cost approach comparison will quantify the physical improvement.","Include for duplexes and any rental properties in the 20. Baseline rental income documents the pre-rehabilitation income potential."]}'::jsonb, NULL),
    ('dataResearch', 'Comprehensive neighborhood-level data beyond individual property analysis. The CDBG program impact measurement requires understanding baseline neighborhood conditions: vacancy rates, code enforcement patterns, demographic trends, and sales trends. This contextual data will be compared to post-rehabilitation conditions.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["MLS for comparable sales (distressed condition)","County assessor/tax records","Neighborhood demographic and economic data","Vacancy rate data","Rental income data for duplexes","Code enforcement records","CDBG program scope and rehabilitation standards","Historical sales trend data for the target area","Comparable neighborhood rehabilitation program data"]}'::jsonb),
    ('compParams', '1–2 miles within comparable neighborhoods. 12 months. CONDITION MATCHING IS CRITICAL — must use sales of properties in similar deteriorated condition. Updated or rehabilitated sales would overstate the baseline values. This may require extended time frames or search areas if distressed sales are limited.', NULL, '{"values":{"searchRadius":"2","timeframeClosed":"12","conditionMatch":"critical"}}'::jsonb, NULL),
    ('eaHc', 'No EA/HC for the baseline appraisals. Document: "These baseline appraisals reflect pre-rehabilitation market values. Post-rehabilitation appraisals will be prepared under a hypothetical condition that the rehabilitation has been completed per CDBG program specifications." Note any environmental hazard assumptions regarding pre-1978 construction.', NULL, NULL, NULL),
    ('justification', 'This baseline/post-rehabilitation appraisal program serves a program measurement purpose beyond standard appraisal. The scope must ensure consistency across all 20 properties so that pre- and post-rehabilitation comparisons are valid. Standardized protocols, consistent templates, and uniform condition scoring are essential. This is a recurring engagement requiring consistency over time.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.6: Military Base Realignment — Off-Base Housing Market Impact Study
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 6, 'advanced', 'Military Base Realignment — Off-Base Housing Market Impact Study', 'A congressional committee has requested a study of the off-base housing market impact following the announced realignment of Fort Hamilton, which will reduce the installation''s military and civilian workforce by 3,500 personnel over 3 years. The surrounding community of 25,000 residents has an economy significantly dependent on the base. The committee needs: (1) current market conditions, (2) projected market value impacts by neighborhood, (3) estimated timeline and magnitude of housing market depression, and (4) recommended mitigation strategies.

— Problem Identification (from Section 1) —
Client: U.S. House Armed Services Committee (through defense consulting firm)
Intended Users: Committee members; community leaders; OEA (Office of Economic Adjustment); affected homeowners (indirectly)
Intended Use: Inform policy decisions regarding BRAC community assistance and mitigation planning
Type and Definition of Value: Market analysis and impact projections (not individual property values)
Effective Date: Current (baseline) with projections over 3-year realignment period
Property Interest: N/A — market study, not individual property appraisal
Extraordinary Assumptions / Hypothetical Conditions: Multiple scenarios projected based on realignment assumptions
USPAP / Other Standards: Standard 4 (Consulting); Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'No individual property inspections — this is a market-level study. Neighborhood windshield surveys document current conditions across the affected area. Map military housing concentrations to identify which neighborhoods will be most impacted. Commercial district assessment documents the economic ecosystem.', NULL, '{"selected":[0,1,2,3,5,6,7]}'::jsonb, '{"options":["No individual property inspections (market study)","Neighborhood-level windshield surveys of all affected areas","Condition assessment of representative neighborhoods","Documentation of for-sale/vacancy indicators","Base access for on-post housing condition assessment","Commercial district condition survey","Mapping of military housing concentrations off-base","Infrastructure and amenity assessment by neighborhood"]}'::jsonb),
    ('reportType', 'USPAP Standard 4 Consulting Report — Housing Market Impact Study. This is a consulting assignment that uses real estate appraisal expertise to analyze market impacts and project outcomes. Standard 4 applies because the work involves analysis and recommendations related to real property. The report must clearly distinguish between data-supported findings and projections/assumptions.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report","USPAP Standard 4 Consulting Report — Housing Market Impact Study","Non-USPAP Policy Analysis","Combined Market Study and Policy Recommendation Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,2],"justifications":["Market analysis methodology (not individual comparable analysis). Study historical sales trends, current market conditions, and model projected price impacts based on the workforce reduction. Analyze prior BRAC closures/realignments for comparable market impact data.","Not directly applicable to a market impact study.","Include rental market analysis. Military personnel are significant renters — the rental market will be affected first and most severely. Vacancy projections and rent decline estimates are critical outputs."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum scope across real estate, economic, and demographic data. Prior BRAC studies are the most valuable precedent. The base dependency ratio predicts severity. Demographic projections inform the scale of demand reduction. Multi-sector analysis captures the cascading effects.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11]}'::jsonb, '{"options":["MLS historical sales data (5+ year trends)","Current inventory, DOM, absorption rate analysis","Rental vacancy and rent level data","Base workforce data (military, civilian, contractor)","Housing occupancy data by neighborhood","Prior BRAC closure market impact studies (comparable bases)","Local economic data (base dependency ratio)","Demographic projections with workforce reduction","School enrollment projections","Commercial/retail impact projections","OEA resources and prior community transition data","Census and ACS data for the community"]}'::jsonb),
    ('compParams', 'Study area: 10–15 mile radius from the base gate. Historical trends: 10+ years. Projection: 5 years (3-year realignment plus 2-year stabilization). 4–6 prior BRAC comparable communities of similar size and dependency ratio. Segment the impact by neighborhood — areas with higher military concentration will be affected more severely.', NULL, '{"values":{"studyArea":"15","trendPeriod":"10","projectionPeriod":"5","bracComps":"4-6"}}'::jsonb, NULL),
    ('eaHc', 'Multiple scenario projections: (1) Base Case: "Assumes the realignment proceeds as announced — 3,500 workforce reduction over 3 years with no replacement economic activity." (2) Mitigated Case: "Assumes successful OEA-assisted economic redevelopment replaces 40% of lost economic activity within 5 years." (3) Worst Case: "Assumes additional workforce reductions and no significant replacement activity."', NULL, NULL, NULL),
    ('justification', 'This is a policy-level consulting engagement that uses real estate appraisal expertise at a market scale. The appraiser must have competency in: market analysis at a community scale, economic impact methodology, scenario modeling, and familiarity with BRAC processes and OEA resources. The study must be objective — neither overstating impacts nor understating them. Fee and timeline reflect a major consulting engagement — likely 200+ hours across 2–3 months.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.7: Floodplain Buyout Program — FEMA Hazard Mitigation Grant
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 7, 'advanced', 'Floodplain Buyout Program — FEMA Hazard Mitigation Grant', 'Following a major flood event, FEMA has approved a Hazard Mitigation Grant Program (HMGP) buyout of 30 flood-damaged residential properties in a repetitive-loss floodplain. The county is the sub-grantee managing the acquisitions. Each property must be appraised at pre-flood market value (the value before the flood event). Properties range from severely damaged to total losses. Some owners have already gutted interiors; others remain as-damaged. The properties will be demolished and the land maintained as open space in perpetuity.

— Problem Identification (from Section 1) —
Client: County Office of Emergency Management
Intended Users: County OEM; FEMA (grant oversight); state emergency management; property owners
Intended Use: Establish pre-flood market value for FEMA HMGP voluntary buyout
Type and Definition of Value: Market Value (pre-flood/pre-disaster — retrospective)
Effective Date: Day before the flood event (retrospective)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — valued as if the flood had not occurred (pre-disaster condition)
USPAP / Other Standards: Standards 1 & 2; FEMA HMGP requirements; Uniform Act (49 CFR Part 24); Yellow Book (if applicable); Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Current exterior inspection of all 30 to document damage, BUT the valuation is pre-flood condition. Pre-flood condition must be reconstructed from insurance records, assessor data, prior photos, and owner interviews. FEMA Substantial Damage Determinations document the extent of damage. The current inspection documents what happened; the pre-flood reconstruction documents what is being valued.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Exterior inspection of all 30 properties (current damaged condition)","Interior inspection of accessible properties","Documentation of current flood damage for each property","Review of pre-flood photographs (assessor, MLS, insurance, Google)","Review of pre-flood condition from insurance files","Review of FEMA damage assessments (Substantial Damage Determinations)","Inspection of comparable sales (pre-flood condition)","Floodplain mapping and flood zone verification"]}'::jsonb),
    ('reportType', '30 individual USPAP Appraisal Reports using a standardized template meeting FEMA HMGP requirements. Each property needs its own report for the individual offer. FEMA and the Uniform Act require individual appraisals. Yellow Book compliance may be required if federal funds trigger Uniform Act — confirm with the county and FEMA.', NULL, '{"selected":2}'::jsonb, '{"options":["30 Individual USPAP Appraisal Reports (Form 1004)","30 Individual Yellow Book Narrative Reports","30 Individual USPAP Reports (Standardized Template per FEMA Requirements)","Single Portfolio Report covering all 30"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for all 30 properties. Must use pre-flood sales data — sales after the flood may be influenced by the disaster. Adjust for the floodplain location (a pre-existing condition) but NOT for the specific flood event (excluded per the HC).","Essential for reconstructing pre-flood value when the current condition is damaged/destroyed. Estimate replacement cost minus pre-flood depreciation. The cost approach provides a cross-check when the subject cannot be inspected in its pre-flood condition.","Consider for any rental properties in the 30; otherwise omit."]}'::jsonb, NULL),
    ('dataResearch', 'Pre-flood data reconstruction is the primary challenge. Insurance files are often the best source of pre-flood condition data. Repetitive loss data establishes the property''s flood risk history. Must carefully distinguish between the pre-existing flood zone condition (included in value) and the specific flood event (excluded per HC).', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["MLS for pre-flood comparable sales","County assessor records (pre-flood valuations)","Pre-flood condition documentation (all available sources)","FEMA Substantial Damage Determinations","Insurance claims data and pre-flood valuations","FEMA flood maps (pre- and post-event)","Prior flood history for each property (repetitive loss data)","Uniform Act/Yellow Book requirements verification","HMGP program guidelines and offer procedures","Market conditions as of the pre-flood date"]}'::jsonb),
    ('compParams', '3–5 miles, sales in the 12 months preceding the flood. Post-flood sales should generally be excluded as they may be distressed or influenced by the disaster. The 30 properties likely span multiple price points and condition levels — comparable selection must be tailored to each property.', NULL, '{"values":{"searchRadius":"5","preFloodWindow":"12","glaRange":"20"}}'::jsonb, NULL),
    ('eaHc', 'HC: "Each property is valued under the hypothetical condition that the flood event had not occurred, and the property is in its pre-flood condition. The property''s location in a flood zone is a pre-existing condition that IS reflected in the value; the specific flood damage is NOT." EA: "The pre-flood condition is based on available records including insurance files, assessor data, photographs, and owner representations."', NULL, NULL, NULL),
    ('justification', 'This is a large-scale disaster buyout requiring 30 individual retrospective appraisals under a hypothetical condition. Federal funding triggers Uniform Act compliance and potentially Yellow Book standards. The appraiser must maintain the critical distinction between the pre-existing flood zone condition and the specific disaster damage. The scale (30 properties) requires efficient workflow management. Competency in disaster-related appraisal, federal acquisition standards, and FEMA program requirements is essential.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.8: Tribal Trust Land — BIA Fee-to-Trust Conversion Impact
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 8, 'expert', 'Tribal Trust Land — BIA Fee-to-Trust Conversion Impact', 'A federally recognized Native American tribe is seeking to take 120 acres of fee simple land into trust status through the Bureau of Indian Affairs (BIA) fee-to-trust process. The land includes 15 residential properties on the perimeter that are currently owned by non-tribal members. The county and several property owners have filed objections, claiming the fee-to-trust conversion will negatively impact the value of adjacent non-tribal residential properties through changes in jurisdiction, taxation, zoning, and law enforcement. The BIA needs an independent analysis of whether the conversion will impact surrounding property values.

— Problem Identification (from Section 1) —
Client: Bureau of Indian Affairs (through contracted consulting firm)
Intended Users: BIA; tribal government; county government; objecting property owners; Interior Board of Indian Appeals (if appealed)
Intended Use: Analyze potential property value impact of fee-to-trust conversion on surrounding residential properties
Type and Definition of Value: Market analysis of potential impact (not individual appraisals of affected properties)
Effective Date: Current (pre-conversion baseline) with projected post-conversion analysis
Property Interest: Fee Simple (surrounding properties); Trust (proposed conversion)
Extraordinary Assumptions / Hypothetical Conditions: HC scenarios — with and without the fee-to-trust conversion
USPAP / Other Standards: Standard 4 (Consulting); Ethics Rule, Competency Rule; BIA fee-to-trust regulations (25 CFR Part 151)'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Exterior survey of adjacent properties to document their relationship to the trust parcel. Site inspection of the 120-acre parcel to understand current conditions. Map the jurisdictional changes — which services will shift from county to tribal authority. Review tribal development plans — the actual impact depends on what the tribe plans to do with the land. No interior inspections needed for a market impact study.', NULL, '{"selected":[0,2,3,4,5,6]}'::jsonb, '{"options":["Exterior survey of all 15 adjacent non-tribal properties","Interior inspection not needed (market study, not individual appraisals)","Site inspection of the 120-acre trust conversion parcel","Documentation of current land use and improvements on trust parcel","Mapping of jurisdictional boundary changes","Assessment of current services (water, sewer, fire, police) to adjacent properties","Review of tribal development plans for the trust land","Comparable fee-to-trust conversion site inspections (if accessible)"]}'::jsonb),
    ('reportType', 'USPAP Standard 4 Consulting Report — Property Value Impact Analysis. This is a consulting assignment analyzing whether a proposed government action will affect surrounding property values. Individual appraisals of each affected property are not needed. The report must be objective and useful to all parties (BIA, tribe, county, and objectors).', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Reports for each affected property","USPAP Standard 4 Consulting Report — Property Value Impact Analysis","Non-USPAP Policy Analysis","Combined Appraisal and Consulting Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0],"justifications":["Market analysis methodology. Research sales near other fee-to-trust conversions and near existing tribal trust land to determine whether empirical evidence supports or refutes the claim of property value impact. Paired sales analysis (near vs. not-near trust land) is the most direct evidence.","Not applicable to a market impact study.","Not directly applicable, though rental market impacts could be included if relevant."]}'::jsonb, NULL),
    ('dataResearch', 'Both real estate market research and policy/regulatory analysis are required. Empirical evidence from other fee-to-trust conversions is most persuasive. The tribal development plans are critical — the impact depends entirely on what will be built/operated on the trust land. Service agreements between the tribe and county can mitigate many objectors'' concerns. The analysis must be factual and evidence-based, not speculative.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11]}'::jsonb, '{"options":["Sales near other fee-to-trust conversions (regional/national)","Sales near existing tribal trust land for market impact evidence","Current market conditions in the affected area","BIA fee-to-trust regulations (25 CFR Part 151)","Tribal development plans and proposed land uses","County zoning and service provision agreements","Tax revenue impact analysis","Law enforcement/emergency services impact analysis","Published research on trust land impacts on adjacent values","Interior Board of Indian Appeals precedent decisions","Environmental impact considerations","Intergovernmental agreements (tribe-county service agreements)"]}'::jsonb),
    ('compParams', 'Local: 3–5 miles for the current market baseline. National: identify 5–8 comparable fee-to-trust conversions and analyze before/after market data in each. Historical: 10 years of trend data near existing trust land to measure long-term impact (if any).', NULL, '{"values":{"localRadius":"5","trustLandComps":"5-8","trendPeriod":"10"}}'::jsonb, NULL),
    ('eaHc', 'Two scenarios: (1) "Assumes the fee-to-trust conversion is approved and the tribe develops the land per its stated plan." (2) "Assumes the fee-to-trust conversion does not occur and the land remains in fee simple status with current county jurisdiction." EA: "The tribal development plans as represented to the BIA are assumed to accurately reflect the tribe''s intentions."', NULL, NULL, NULL),
    ('justification', 'This is a highly sensitive consulting assignment at the intersection of real estate valuation, federal Indian law, and community relations. The appraiser must be rigorously objective — the analysis will be cited by all parties. The empirical approach is essential: do property values near other trust land actually decline, or are objectors'' concerns speculative? Cultural competency and sensitivity to tribal sovereignty issues is required alongside real estate expertise. This may involve testimony before the BIA or Interior Board of Indian Appeals.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.9: Historic Preservation — Section 106 Review, Demolition Impact Analysis
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 9, 'expert', 'Historic Preservation — Section 106 Review, Demolition Impact Analysis', 'A federally funded highway project will require the demolition of 5 contributing structures in a National Register Historic District — a residential neighborhood of 1880s–1920s homes. Section 106 of the National Historic Preservation Act requires analysis of the project''s effect on the historic district, including the impact on remaining property values. The State Historic Preservation Office (SHPO) has requested a comprehensive analysis of how the removal of 5 contributing structures will affect the value and integrity of the remaining 40 properties in the district.

— Problem Identification (from Section 1) —
Client: State DOT (through Section 106 consulting process)
Intended Users: State DOT; SHPO; FHWA; Advisory Council on Historic Preservation; affected property owners
Intended Use: Assess property value impact of demolishing contributing structures in a historic district
Type and Definition of Value: Market Value Impact Analysis — before and after demolition on remaining district properties
Effective Date: Current (pre-demolition baseline); projected (post-demolition impact)
Property Interest: Fee Simple (subject to historic district designation)
Extraordinary Assumptions / Hypothetical Conditions: HC — projected condition after demolition of 5 structures and highway construction
USPAP / Other Standards: Standards 1 & 2 (representative appraisals); Standard 4 (district-wide impact consulting); Yellow Book; Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Comprehensive exterior documentation of the entire district — the streetscape cohesion and visual integrity are critical to historic district value. Interior inspection of the 5 condemned properties and a sample of remaining properties. Map the demolition locations relative to the district. Consult with SHPO on district integrity concerns.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Exterior inspection of all 45 properties (5 condemned + 40 remaining)","Interior inspection of the 5 properties to be demolished","Interior inspection of representative sample of remaining properties","Documentation of historic architectural features per structure","Historic district streetscape and cohesion documentation","Assessment of which remaining properties are most impacted by demolition gaps","Review of National Register nomination and contributing/non-contributing status","Review of DOT project plans and proposed mitigation","SHPO consultation regarding district integrity thresholds"]}'::jsonb),
    ('reportType', '5 individual Yellow Book-compliant appraisals for the properties being acquired, PLUS a Standard 4 Consulting Report analyzing the district-wide impact on remaining properties. The consulting report should: (1) establish current district value premium, (2) analyze the impact of removing 5 contributing structures on district integrity, (3) project the value impact on remaining properties, and (4) evaluate proposed mitigation measures.', NULL, '{"selected":1}'::jsonb, '{"options":["Individual USPAP Appraisals for all 45 properties","5 Yellow Book Appraisals + Standard 4 District Impact Consulting Report","Single District-Wide USPAP Appraisal Report","Standard 4 Consulting Report Only"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for the 5 individual appraisals. For the district impact study: paired sales analysis of properties inside vs. outside historic districts to quantify the historic district value premium, then analyze how that premium might change with reduced district integrity.","Essential for the 5 condemned properties — historic structures have high replacement/reproduction costs. Also useful for analyzing the historic district premium lost when contributing structures are demolished.","Consider if any properties are rental; otherwise not primary."]}'::jsonb, NULL),
    ('dataResearch', 'Extensive dual-track research: individual property data for the 5 appraisals, and district-level research for the impact study. Published research on historic district premiums (typically 5–20% above comparable non-district properties) provides the baseline. The critical question: does removing 5 of 45 contributing structures push the district below a critical mass threshold?', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11]}'::jsonb, '{"options":["MLS for sales within the historic district","MLS for comparable sales outside the district (paired analysis)","Sales in other historic districts that lost contributing structures","National Register nomination document","Historic district design guidelines","SHPO records and Section 106 precedent","DOT project plans and demolition scope","Proposed mitigation measures (design, landscaping, interpretation)","Published research on historic district value premiums","Published research on district integrity and critical mass thresholds","County assessor records showing district premium trends","Advisory Council on Historic Preservation guidance"]}'::jsonb),
    ('compParams', 'In-district: all available sales within the district. Paired analysis: comparable properties 1–2 miles away outside the district to isolate the district premium. Impact comparables: 4–6 other historic districts nationally that experienced contributing structure loss. 18-month timeframe given the likely limited sales volume within the district.', NULL, '{"values":{"districtSales":"0.5","pairedRadius":"2","impactComps":"4-6","timeframeClosed":"18"}}'::jsonb, NULL),
    ('eaHc', 'For the 5 individual appraisals: standard Yellow Book methodology with project influence exclusion per Uniform Act. For the district impact study: HC — "The analysis projects the impact on remaining district properties under the hypothetical condition that the 5 contributing structures have been demolished and the proposed mitigation measures have been implemented." Also analyze a scenario without mitigation for comparison. EA: "The historic district designation is assumed to remain in place."', NULL, NULL, NULL),
    ('justification', 'This assignment combines federal acquisition appraisal (5 Yellow Book reports) with historic preservation consulting (district impact analysis). The district impact analysis requires quantifying the current historic district value premium, projecting how removing contributing structures affects district integrity and premium, and evaluating whether mitigation can offset the impact. The appraiser must have competency in: Yellow Book methodology, historic property valuation, historic district premium analysis, and Section 106 consulting. This may require a team approach. Fee and timeline reflect the comprehensive scope — likely 200+ hours.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 5.10: Disaster Recovery — FEMA Individual Assistance, Substantial Damage, and Community Rebuilding Strategy
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 10, 'expert', 'Disaster Recovery — FEMA Individual Assistance, Substantial Damage, and Community Rebuilding Strategy', 'A coastal community of 500 homes was devastated by a hurricane. FEMA has declared a major disaster. The community needs comprehensive appraisal services for multiple concurrent programs: (1) FEMA Individual Assistance — verified loss assessments for 200 homes, (2) Substantial Damage Determinations — determining which homes exceeded the 50% damage threshold, (3) HMGP buyout evaluation — identifying 60 repetitive-loss properties for potential acquisition, (4) Community rebuilding strategy — advising the local government on land use, building elevation requirements, and economic recovery.

— Problem Identification (from Section 1) —
Client: County Emergency Management Agency (multi-program contract)
Intended Users: County; FEMA (IA, HMGP, PA programs); state emergency management; NFIP; 500 affected homeowners; local planning commission
Intended Use: Multi-program disaster recovery — verified loss, substantial damage, buyout evaluation, and rebuilding strategy
Type and Definition of Value: Multiple: Pre-disaster Market Value (200 properties); Damage Assessments; Pre-disaster values for 60 buyout candidates; Market analysis for rebuilding strategy
Effective Date: Pre-disaster (retrospective); current (damaged condition); prospective (rebuilding scenarios)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC — pre-disaster condition for retrospective values; multiple scenarios for rebuilding strategy
USPAP / Other Standards: Standards 1 & 2 (individual appraisals); Standard 4 (consulting/strategy); Standard 5/6 (if mass appraisal methodology used); Yellow Book (buyouts); Uniform Act; Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 5
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'All inspection elements are required for this multi-program engagement. The scale demands a team approach with standardized protocols — consistency across multiple appraisers is critical. Damage assessments must distinguish between flood damage, wind damage, and pre-existing conditions. Pre-disaster condition reconstruction requires every available data source. Community-level survey informs the rebuilding strategy component.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["Damage assessment of all 200 IA properties (may use teams)","Detailed inspection of 60 HMGP buyout candidates","Pre-disaster condition reconstruction from all available records","Substantial Damage Determination inspections","Coastal hazard zone documentation (surge, erosion, wave action)","Infrastructure damage assessment (roads, utilities, seawalls)","Community-level condition survey (block by block)","Review of FEMA preliminary damage assessments","Drone/aerial imagery for scope assessment","Standardized damage classification protocol across all teams"]}'::jsonb),
    ('reportType', 'Tiered reporting by program: (1) IA Verified Loss — standardized FEMA-format assessment reports (200 properties), (2) HMGP Buyout — individual USPAP/Yellow Book narrative appraisals (60 properties), (3) Substantial Damage — determination reports per NFIP requirements, and (4) Rebuilding Strategy — Standard 4 Consulting Report. Different programs have different reporting requirements.', NULL, '{"selected":1}'::jsonb, '{"options":["200 Individual Full Narrative Appraisal Reports","Tiered Reporting: Standardized Templates by Program + Strategy Consulting Report","Single Mass Appraisal Report covering all properties","FEMA-Format Verified Loss Reports Only"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for pre-disaster values (IA and HMGP). Must use pre-disaster sales data — post-disaster sales reflect damaged conditions and distressed motivations. The pre-disaster market must be reconstructed across 500 properties.","Critical for multiple programs: damage assessment, Substantial Damage Determinations (is repair cost >50% of pre-damage value?), and pre-disaster valuation. Cost data is the backbone of disaster recovery appraisal.","Include for any rental properties. Also relevant for the rebuilding strategy — rental market analysis informs whether the community can attract investment for recovery."]}'::jsonb, NULL),
    ('dataResearch', 'Maximum scope at community scale. Every data source is needed across multiple programs. Pre-disaster data reconstruction for 200+ properties requires systematic use of assessor records, insurance data, MLS, and aerial imagery. NFIP repetitive loss data identifies the 60 buyout candidates. Comparable disaster recovery data from other communities informs the rebuilding strategy.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9,10,11,12,13]}'::jsonb, '{"options":["Pre-disaster MLS data for the entire community","County assessor records (pre-disaster values for all 500 properties)","FEMA preliminary damage assessments","Insurance claims data and pre-disaster coverage","NFIP flood insurance data and repetitive loss records","Pre-disaster aerial/satellite imagery","Building permit records (pre-disaster improvements)","Post-disaster aerial/drone imagery","FEMA flood maps (pre- and post-event advisory)","Coastal engineering studies (erosion, surge, sea level rise)","Comparable disaster recovery data from other communities","FEMA program requirements (IA, HMGP, PA, NFIP)","State and local building code requirements","Economic impact data for rebuilding strategy"]}'::jsonb),
    ('compParams', 'Community-wide analysis within 10 miles. Pre-disaster sales: 12–24 months before the event. Team of 6–10 appraisers working under standardized protocols. Project timeline: 6–12 months for the full engagement. The HMGP buyout appraisals require the most time and expertise.', NULL, '{"values":{"communityRadius":"10","preDisasterWindow":"24","teamSize":"6-10","projectTimeline":"6-12"}}'::jsonb, NULL),
    ('eaHc', 'Multiple HCs/EAs across programs: (1) Pre-disaster values: HC that the hurricane had not occurred. (2) Substantial Damage: repair cost percentage based on current contractor estimates which may change. (3) HMGP buyout: HC that properties are valued in pre-disaster condition per HMGP requirements. (4) Rebuilding strategy: multiple scenarios — rebuild-in-place with elevation, managed retreat, mixed approach. For all: "Pre-disaster condition is reconstructed from available records. Actual conditions may have differed."', NULL, NULL, NULL),
    ('justification', 'This is the most complex engagement in the module — combining individual retrospective appraisals (200+ properties), federal acquisition appraisals (60 HMGP buyout candidates), regulatory determinations (Substantial Damage under NFIP), and community-level consulting. Multiple USPAP standards apply simultaneously. The lead appraiser must have competency in: disaster appraisal methodology, federal acquisition standards, NFIP substantial damage procedures, coastal hazard analysis, team management, and community planning consulting. This engagement requires a firm — no individual appraiser can handle this scope alone. Fee and timeline reflect a major consulting contract: $500,000+ over 6–12 months with a team of 6–10 professionals.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- ─────────────── Category 6: Specialty Situations ───────────────
-- Scenarios for category M2-S2-C6

-- Scenario 6.1: Accessory Dwelling Unit (ADU) - Garage Conversion
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 1, 'basic', 'Accessory Dwelling Unit (ADU) - Garage Conversion', 'A homeowner converted their detached 2-car garage into a 450 SF ADU with a kitchenette and bathroom under the city''s ADU ordinance. They need a refinance appraisal. The main house is a 3-bedroom ranch built in 1995 on 0.30 acres. The ADU is permitted with a CO. Few comparable sales include ADUs. The property no longer has a garage.

— Problem Identification (from Section 1) —
Client: Homeowner through lender (Summit Mortgage)
Intended Users: Summit Mortgage
Intended Use: Evaluate collateral adequacy for refinance
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, FIRREA, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection of both main house and ADU as separate living areas. ADU measured independently. Verify permits and CO. Document the garage loss as a functional trade-off.', NULL, '{"selected":[0,1,2,3,4,5]}'::jsonb, '{"options":["Interior and exterior inspection of main house","Interior and exterior inspection of ADU","Measurement of ADU (separate from main house GLA)","Verification of ADU permits and certificate of occupancy","Documentation of lost garage (functional trade-off)","Exterior inspection of comparables"]}'::jsonb),
    ('reportType', 'Form 1004 with ADU addendum per current Fannie Mae ADU guidelines. Addendum addresses: ADU description, legal conformity, utility metering, rental income potential, and contributory value analysis.', NULL, '{"selected":1}'::jsonb, '{"options":["USPAP Appraisal Report (Form 1004/URAR)","Form 1004 with ADU Addendum","Narrative Format","Restricted Appraisal Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required. Find ADU sales for paired analysis. Address garage-loss adjustment.","Include; conversion cost provides a floor for contributory value.","Include; ADU creates rental income potential. GRM analysis supports contributory value."]}'::jsonb, NULL),
    ('dataResearch', 'Standard sources plus ADU-specific: rental rates, conversion costs, GSE ADU policies, and municipal ordinance requirements.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for sales with and without ADUs","County assessor/tax records","ADU permit and CO verification","ADU rental rates in the market","Conversion cost documentation","Lender-specific ADU guidelines (GSE)","Municipal ADU ordinance"]}'::jsonb),
    ('compParams', '1-3 miles, 12 months. At least 1-2 ADU sales for direct comparison plus non-ADU/non-garage sales to isolate adjustments.', NULL, '{"values":{"searchRadius":"3","timeframeClosed":"12","aduComps":"1-2"}}'::jsonb, NULL),
    ('eaHc', 'None if ADU is permitted with CO. If permit status uncertain: EA that ADU is legally permitted. Appraiser should verify, not assume.', NULL, NULL, NULL),
    ('justification', 'ADU appraisals require expanded scope. Three approaches warranted. Must navigate evolving GSE guidelines and analyze ADU as separate value component.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.2: Solar Panel System - Leased vs. Owned Impact
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 2, 'basic', 'Solar Panel System - Leased vs. Owned Impact', 'A homeowner is selling a 4-bedroom colonial with a LEASED rooftop solar system with 16 years remaining at $185/month with 2.9% annual escalator. Transfer requires buyer assumption or seller buyout (~$28,000). Some buyers view the lease as encumbrance; others as benefit.

— Problem Identification (from Section 1) —
Client: Homeowner (Jennifer Walsh) - pre-listing
Intended Users: Jennifer Walsh; listing agent; prospective buyers
Intended Use: Determine market value including leased solar impact
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple (subject to solar lease)
Extraordinary Assumptions / Hypothetical Conditions: None - lease is factual encumbrance
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with detailed solar documentation. Lease agreement is critical: terms, transfer provisions, escalator, buyout amount, maintenance. Actual energy data demonstrates real savings.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection","Solar system documentation (size, type, age)","Review of solar lease agreement terms","Review of energy production data (actual kWh)","Review of utility bills pre/post-solar","Assessment of roof condition under panels","Exterior inspection of comparables"]}'::jsonb),
    ('reportType', 'Form 1004 with AI Green/Energy Addendum addressing: system specs, lease vs. owned distinction, energy savings analysis, and net contributory value or encumbrance effect.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Form 1004 with Solar/Green Addendum","Restricted Report","Narrative Format"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required. Distinguish OWNED vs. LEASED solar sales.","Include for context; leased system cost to homeowner was zero.","Essential for leased system. PV of net benefit/cost over remaining term quantifies impact."]}'::jsonb, NULL),
    ('dataResearch', 'Critical distinction: leased has different impact than owned. LBNL studies show positive for owned, mixed for leased. PV Value tool provides structured framework.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for sales with/without solar","Distinguish leased vs. owned solar in comps","Solar lease agreement (full terms)","Energy production history","Published solar value studies (LBNL)","PV Value tool analysis","Utility rates and projections"]}'::jsonb),
    ('compParams', 'Expanded 3-5 miles. 12 months. 2-3 solar sales for paired analysis.', NULL, '{"values":{"searchRadius":"5","timeframeClosed":"12","solarComps":"2-3"}}'::jsonb, NULL),
    ('eaHc', 'No HC needed. Leased solar is actual condition. Lease is a factual encumbrance, not hypothetical.', NULL, NULL, NULL),
    ('justification', 'Leased solar combines improvement with financial obligation. Income approach essential to quantify net benefit/cost. Competency in green feature valuation and lease analysis needed.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.3: Tiny Home on Permanent Foundation
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 3, 'basic', 'Tiny Home on Permanent Foundation', 'A 380 SF tiny home on permanent foundation, 0.15 acres, tiny home zoning. Built 2021, certified builder, full kitchen/bath, municipal utilities, CO as SFR. No tiny home sales within 10 miles.

— Problem Identification (from Section 1) —
Client: Mountain West Credit Union
Intended Users: Mountain West Credit Union
Intended Use: Evaluate collateral for purchase financing
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, FIRREA, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with classification verification: permanent foundation, CO, zoning, building code. If legally a SFR on permanent foundation, appraised as real property regardless of size.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection","Verify permanent foundation","Verify CO as SFR","Verify zoning compliance","Document construction quality","Building code verification","Exterior inspection of comparables"]}'::jsonb),
    ('reportType', 'Form 1004 with addendum documenting: legal classification, comparable data challenge methodology, and reliability limitations.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Form 1004 with Classification Addendum","Narrative Format","Restricted Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required but challenging. Expand search. Use small conventional homes.","Essential and likely most reliable. Builder cost data available.","Consider if rentable; tiny home STR may be active."]}'::jsonb, NULL),
    ('dataResearch', 'Local small homes closest comparables. Regional tiny homes supplemental. Builder cost critical. Land may be disproportionate share of value.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["MLS for small home sales locally","Tiny home sales regionally","Builder cost data","Zoning ordinance","CO and permit records","Tiny home rental data","Land value analysis"]}'::jsonb),
    ('compParams', 'Local: 5+ miles for 500-800 SF homes. Regional: 50+ miles for true tiny homes. 12 months.', NULL, '{"values":{"localRadius":"5","tinyRadius":"50","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'No HC. Include disclosure about emerging market with limited data and greater uncertainty.', NULL, NULL, NULL),
    ('justification', 'Primary challenge is data scarcity. Expanded search and cost approach weight appropriate. Classification verification is threshold question.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.4: Short-Term Rental (Airbnb) - Dual Value Analysis
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 4, 'intermediate', 'Short-Term Rental (Airbnb) - Dual Value Analysis', 'A 3-bedroom tourist-area cottage generates $78,000 gross annual STR revenue at 72% occupancy. Lender wants both traditional residential value and STR income-enhanced value. STR permitted with annual license.

— Problem Identification (from Section 1) —
Client: Coastal Community Bank
Intended Users: Coastal Community Bank
Intended Use: Evaluate collateral - traditional and STR-enhanced values
Type and Definition of Value: Market Value (owner-occupied) AND Market Value (STR-enhanced)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC for owner-occupied value
USPAP / Other Standards: Standards 1 & 2, FIRREA, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with STR-specific documentation. Income records essential. Platform data affects revenue sustainability. Tourism analysis determines if income is market-derived or operator-specific.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection","STR-specific feature documentation","STR license verification","Review 12-24 months income records","Review operating expenses","Review platform data (reviews, occupancy)","Exterior inspection of comparables","Tourism market assessment"]}'::jsonb),
    ('reportType', 'Narrative with dual value conclusions. Complexity exceeds form report capacity. Must clearly separate two valuations.', NULL, '{"selected":2}'::jsonb, '{"options":["Form 1004/URAR","Form 1004 with STR Addendum","Narrative (Dual-Value)","Restricted Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for both. Owner-occupied: standard comps. STR: sales with STR income.","Include as secondary, neutral regarding use.","Essential for STR-enhanced value. Capitalize using market-achievable income."]}'::jsonb, NULL),
    ('dataResearch', 'Dual-track research. AirDNA for market-level data. Must use market-achievable income. Regulatory stability critical.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["MLS traditional sales","Sales with STR history","AirDNA or similar analytics","STR expense benchmarks","Occupancy/seasonal patterns","Traditional rental rates","STR regulatory framework","Tourism statistics","STR cap rate data"]}'::jsonb),
    ('compParams', 'Traditional: 1-2 miles. STR: 3-5 miles within same tourism market. 12 months.', NULL, '{"values":{"residentialRadius":"2","strRadius":"5","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'HC for owner-occupied: as if not STR. EA for STR: regulatory framework assumed stable. Changes could reduce income-enhanced value materially.', NULL, NULL, NULL),
    ('justification', 'Emerging practice. Owner-occupied relies on sales comparison; STR-enhanced on income. Premium must be attributed to PROPERTY not OPERATOR. Regulatory risk must be assessed.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.5: Net-Zero Energy Home - Green Certification Premium
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 5, 'intermediate', 'Net-Zero Energy Home - Green Certification Premium', 'Custom 2,400 SF net-zero home (2020): 12kW owned solar, geothermal, triple-pane, R-50 walls, HERS -2, DOE Zero Energy Ready + LEED Platinum. Produces more energy than consumed. Limited net-zero comps locally.

— Problem Identification (from Section 1) —
Client: Homeowner (Dr. Sarah Kim) - pre-listing
Intended Users: Dr. Sarah Kim; listing agent; buyers
Intended Use: Establish value with green premium
Type and Definition of Value: Market Value (reflecting certifications)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None anticipated
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection. Every high-performance feature individually documented. Third-party certifications provide reliable verification. Actual energy data more persuasive than projections.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior inspection","Detailed green feature documentation","Solar production data","Geothermal system documentation","HERS/LEED/DOE certifications review","12-24 months energy bills","Exterior inspection of comparables","Assess comparables energy features"]}'::jsonb),
    ('reportType', 'Form 1004 with Appraisal Institute Green/Energy Efficient Addendum with structured sections for certifications, features, savings, and contributory value.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Form 1004 with AI Green/Energy Addendum","Narrative with Energy Analysis","Restricted Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required. Gradient approach: net-zero to solar+geothermal to ENERGY STAR to standard.","Essential; green features cost $65-95K+. Market may not fully value all features.","Critical; PV of avoided utility costs over 20-25 years is substantial. PV Value tool for solar."]}'::jsonb, NULL),
    ('dataResearch', 'Multi-layered: local data plus national research (LBNL, AI, Freddie Mac). PV Value for solar. Actual data trumps projections.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["MLS for green-certified sales","Sales with solar/geothermal","Published green premium studies","HERS and energy modeling","Actual energy bills/production","Green feature costs","PV Value tool analysis","Utility rate projections"]}'::jsonb),
    ('compParams', '5-10 miles local. National studies supplemental. Tiered gradient approach.', NULL, '{"values":{"localRadius":"10","nationalRef":"national","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'No HC. Valued with actual features. Note reliance on certifications and actual data. Future performance may vary.', NULL, NULL, NULL),
    ('justification', 'Specialty requiring green building competency. Three approaches essential. AI Green Addendum provides framework. Appraiser should have green building education.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.6: Floating Home - Non-Traditional Dwelling on Leased Slip
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 6, 'advanced', 'Floating Home - Non-Traditional Dwelling on Leased Slip', '1,100 SF floating home (on concrete float, permanently moored) in 45-unit marina. Built 2005, 2BR/1.5BA. Leased slip $850/month, 10-year renewable. Lender wants to finance as real property.

— Problem Identification (from Section 1) —
Client: Pacific Coast Lending
Intended Users: Pacific Coast Lending
Intended Use: Evaluate collateral for floating home financing
Type and Definition of Value: Market Value
Effective Date: Current
Property Interest: Classification threshold question
Extraordinary Assumptions / Hypothetical Conditions: EA regarding classification
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; state floating home laws'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection including float/hull (foundation equivalent). Marina condition affects value like HOA. Slip lease critical. State classification determines real vs. personal property.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior and exterior of floating home","Float/hull condition assessment","Utility connections","Mooring/anchoring documentation","Marina facilities inspection","Slip lease review","Marina rules and financials","State classification verification"]}'::jsonb),
    ('reportType', 'Narrative format, no standard form fits. Must address: classification, slip lease as land-equivalent, float as foundation-equivalent, comparability challenges.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Narrative with Classification Analysis","Restricted Report","Form 1004C"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required; same-community sales best, other communities supplemental.","Include; float + structure cost with separate depreciation curves.","Essential for leasehold analysis. Slip lease parallels manufactured home on leased land."]}'::jsonb, NULL),
    ('dataResearch', 'Specialized data from same and comparable communities. Marina financials affect lease security. Insurance limits buyer pool.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Same-community sales","Other community sales (regional)","Slip lease comparables","Marina financials","Float condition standards","State classification statutes","Construction cost data","Insurance availability"]}'::jsonb),
    ('compParams', 'Same community highest priority. Regional 50+ miles. 18 months.', NULL, '{"values":{"sameCommunity":"highest","regionalRadius":"50","timeframeClosed":"18"}}'::jsonb, NULL),
    ('eaHc', 'EA: Classification per state statute. EA: Slip lease renewal at consistent terms. Without a slip, home has minimal value.', NULL, NULL, NULL),
    ('justification', 'Niche specialty. Parallels manufactured home on leased land. Specific floating home competency required. Narrative essential for unfamiliar underwriters.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.7: Historic Rehabilitation Tax Credit - Pre/Post Values
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 7, 'advanced', 'Historic Rehabilitation Tax Credit - Pre/Post Values', 'Developer rehabilitating 1892 Queen Anne using federal/state historic tax credits. Needs pre-rehab value (distressed), post-rehab value (per NPS plans), and substantial rehabilitation test (expenses must exceed pre-rehab value). National Register Historic District.

— Problem Identification (from Section 1) —
Client: Developer through CPA
Intended Users: Developer; CPA; IRS; SHPO; NPS
Intended Use: Support historic rehabilitation tax credit applications
Type and Definition of Value: Pre-Rehab; Post-Rehab (prospective); Substantial Rehab Test
Effective Date: Current; prospective (completion)
Property Interest: Fee Simple (historic district)
Extraordinary Assumptions / Hypothetical Conditions: HC for post-rehab per NPS plans
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule; IRS Sec. 47, NPS Standards'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Document distressed condition AND historic features to preserve. NPS Standards dictate what can/cannot change, affecting cost and post-rehab configuration.', NULL, '{"selected":[0,1,2,3,4,5,6,7]}'::jsonb, '{"options":["Interior/exterior (current distressed)","Historic feature documentation","Character-defining features to preserve","Structural integrity assessment","Review NPS-approved plans","Review Secretary of Interior Standards","Inspect rehabilitated historic comparables","Inspect pre-rehab comparables"]}'::jsonb),
    ('reportType', 'Narrative with dual values and substantial rehab test analysis. One report bridges values through rehabilitation cost analysis.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Narrative Dual-Value with Tax Credit Analysis","Two Separate Reports","Restricted Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required for both. Pre-rehab: distressed historic sales. Post-rehab: rehabilitated sales.","Critical for substantial rehab test. Historic reproduction cost exceeds standard construction.","Consider if income potential exists (B&B, events, rental)."]}'::jsonb, NULL),
    ('dataResearch', 'Dual-track plus tax credit compliance. NPS plans define exact scope. Costs under NPS standards typically 20-40% above conventional renovation.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["In-district sales","Rehabilitated historic sales","Distressed historic sales","NPS plans and specifications","Rehabilitation cost estimates","Secretary of Interior Standards","Tax credit requirements","District premium analysis","Historic feature reproduction costs"]}'::jsonb),
    ('compParams', 'In-district: all available. Other districts: 10-15 miles. 18 months.', NULL, '{"values":{"districtRadius":"1","historicRadius":"15","timeframeClosed":"18"}}'::jsonb, NULL),
    ('eaHc', 'HC for post-rehab: completed per NPS-approved plans. EA: rehabilitation will achieve NPS compliance and tax credit approval.', NULL, NULL, NULL),
    ('justification', 'Combines historic appraisal with tax credit compliance. NPS Standards constrain rehabilitation. Substantial rehab test is specific IRS threshold. Competency required.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.8: Stigmatized Property - Notorious Crime Scene
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 8, 'expert', 'Stigmatized Property - Notorious Crime Scene', 'Bank-owned property was site of widely publicized triple homicide 18 months ago. Unstigmatized comps sell $550-625K. Two failed listing attempts at $375,000 (32% below market) produced no offers. State law requires disclosure.

— Problem Identification (from Section 1) —
Client: National Asset Recovery (bank)
Intended Users: National Asset Recovery; potential purchasers
Intended Use: Asset disposition - value accounting for stigma
Type and Definition of Value: Market Value (reflecting stigma)
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None - stigma IS the condition
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection confirming property is physically undamaged. Stigma is psychological, not physical. Verify biohazard remediation. Failed listing history provides direct stigma evidence.', NULL, '{"selected":[0,1,2,3,4,5,6]}'::jsonb, '{"options":["Interior and exterior inspection","Verify physical remediation complete","Document property as physically normal","Review failed listing history","Exterior inspection of comparables","Interview listing agents re: buyer feedback","Research state disclosure requirements"]}'::jsonb),
    ('reportType', 'Narrative with: unstigmatized value, stigmatized value, and quantified discount. Must be defensible for asset disposition decisions.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Narrative with Stigma/External Obsolescence Analysis","Restricted Report","Consulting Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for both values. Failed listings provide direct evidence.","Include for unstigmatized value. Gap between cost and market quantifies external obsolescence.","Consider if rentable. Stigma may affect rental differently than sale value."]}'::jsonb, NULL),
    ('dataResearch', 'Failed listings are strongest evidence. Published research documents 10-35% discounts declining over time. Media extent correlates with severity.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["MLS for unstigmatized comparables","Subject failed listing history","Other stigmatized property sales","Published stigma research","State disclosure requirements","Agent interviews on perception","Media coverage analysis","Remediation documentation","Insurance implications"]}'::jsonb),
    ('compParams', 'Unstigmatized: 1-2 miles. Stigmatized: 100+ miles (statewide/national). Subject own failed history may be most persuasive.', NULL, '{"values":{"unstigmatized":"2","stigmaRadius":"100","timeframeClosed":"12"}}'::jsonb, NULL),
    ('eaHc', 'No HC for stigmatized value. HC for baseline: as if event had not occurred. Stigma typically diminishes over time.', NULL, NULL, NULL),
    ('justification', 'Uncommon specialty. Stigma is external obsolescence, physically curable but psychologically persistent. Must quantify subjective market reaction. Sensitivity required alongside objectivity.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.9: Multi-Generational Compound - Complex Configuration
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 9, 'expert', 'Multi-Generational Compound - Complex Configuration', '8-acre property with: 3,200 SF farmhouse (1935/updated 2010), 1,600 SF cottage, 900 SF barn apartment, 2,400 SF workshop with 1,200 SF quarters above, plus ag outbuildings. One parcel, one engineered septic. Three generations reside. Family separating - need buyout value with component allocation. No comparable compounds locally.

— Problem Identification (from Section 1) —
Client: Family attorney (mediating buyout)
Intended Users: All family members; attorney; mediator
Intended Use: Establish value for equitable buyout
Type and Definition of Value: Market Value (whole) and contributory per component
Effective Date: Current
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: None - HABU analysis critical
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Every structure requires individual inspection, measurement, documentation. Septic serving multiple dwellings is critical infrastructure. Permit and zoning verification essential.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Farmhouse interior/exterior","Cottage interior/exterior","Barn apartment interior/exterior","Workshop/quarters interior/exterior","Agricultural outbuildings","8-acre site assessment","Septic system capacity documentation","Permit verification all dwellings","Zoning compliance for multiple dwellings"]}'::jsonb),
    ('reportType', 'Narrative with component analysis: whole-property value AND contributory value per dwelling for buyout allocation. Multiple competing interests require transparency.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Narrative with Component Value Analysis","Restricted Report","Multiple Separate Reports"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1,2],"justifications":["Required but extremely challenging. No comparable compounds. Build from components.","Essential and likely most reliable. Individual cost per structure supports buyout allocation.","Include; secondary dwellings have rental potential supporting contributory value."]}'::jsonb, NULL),
    ('dataResearch', 'Multi-component research. No single comparable matches. Build value from components. Cost data critical for buyout allocation.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8]}'::jsonb, '{"options":["Rural acreage sales","Multi-dwelling property sales","Secondary dwelling unit sales","Cost estimation per structure","Rental rates per dwelling type","Septic capacity/replacement costs","Zoning regulations","Permit records all structures","Agricultural outbuilding costs"]}'::jsonb),
    ('compParams', 'Rural: 10-15 miles. Multi-dwelling: 25+ miles. 18 months. No single comp adequate.', NULL, '{"values":{"ruralRadius":"15","multiDwelling":"25","timeframeClosed":"18"}}'::jsonb, NULL),
    ('eaHc', 'EA: All dwelling units assumed legally permitted. HABU must address whether compound is highest and best use or buyer would consolidate.', NULL, NULL, NULL),
    ('justification', 'Among most challenging residential assignments. Component analysis for buyout adds complexity. HABU is critical. Three approaches essential for triangulation.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;

-- Scenario 6.10: Cannabis-Adjacent Property - Diminution from Legal Facility
WITH ins AS (
  INSERT INTO scenarios (category_id, order_index, difficulty, title, scenario_text)
  SELECT cat.id, 10, 'expert', 'Cannabis-Adjacent Property - Diminution from Legal Facility', 'Homeowner adjacent to licensed cannabis cultivation/processing facility (2 years). Claims damage from: odor, traffic, security lighting, noise, safety concerns, lender reluctance. Purchased $420K pre-facility; listed at $350K, one offer at $310K. Facility fully licensed. Suing for diminution.

— Problem Identification (from Section 1) —
Client: Attorney (David Chen) representing homeowner
Intended Users: David Chen, Esq.; defense counsel; the court
Intended Use: Establish diminution from adjacent cannabis facility
Type and Definition of Value: Before Value; After Value; Diminution
Effective Date: Facility start (before); current (after)
Property Interest: Fee Simple
Extraordinary Assumptions / Hypothetical Conditions: HC for before value - as if no facility
USPAP / Other Standards: Standards 1 & 2, Ethics Rule, Competency Rule'
  FROM scenario_categories cat
  JOIN module_sections ms ON ms.id = cat.section_id
  WHERE ms.code = 'M2-S2' AND cat.order_index = 6
  RETURNING id
)
INSERT INTO model_answers (scenario_id, field_id, answer_text, commentary, model_data, field_options_override)
SELECT ins.id, sf.id, x.txt, x.cmt, x.dat, x.ovr
FROM ins,
  module_sections ms
  JOIN section_fields sf ON sf.section_id = ms.id,
  (VALUES
    ('inspection', 'Full inspection with extensive impact documentation. Each nuisance individually documented: odor, noise, lighting, traffic, visual. Pre-facility conditions reconstructed. Facility license defines what is permitted vs. violations.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["Interior and exterior inspection","Odor assessment at various times","Noise measurement from equipment","Security lighting impact (nighttime)","Traffic documentation","Visual impact from subject","Facility license and operating parameters","Exterior inspection of comparables","Neighbor interviews","Pre-facility condition reconstruction"]}'::jsonb),
    ('reportType', 'Narrative with: before value, after value, quantified diminution. Must distinguish legal operation from nuisance. Analysis quantifies market reaction to proximity.', NULL, '{"selected":1}'::jsonb, '{"options":["Form 1004/URAR","Narrative with Diminution/Nuisance Analysis","Restricted Report","Consulting Report"]}'::jsonb),
    ('approaches', NULL, NULL, '{"selected":[0,1],"justifications":["Required for both. Find sales near other cannabis facilities. Failed listing provides direct after-value evidence.","Include; gap between cost-derived and market value quantifies external obsolescence.","Consider: proximity may affect rental vs. sale differently."]}'::jsonb, NULL),
    ('dataResearch', 'Emerging but growing dataset. Sales near other facilities in legal states provide direct evidence. Failed listing powerful evidence. Lender reluctance compounds stigma.', NULL, '{"selected":[0,1,2,3,4,5,6,7,8,9]}'::jsonb, '{"options":["Standard comparable sales (before)","Sales near cannabis facilities (multi-state)","Subject failed listing history","Facility license/compliance records","Odor/noise complaint records","Published cannabis proximity research","Lender policies on adjacent properties","Insurance implications","Zoning regulations","Value trends pre/post facility"]}'::jsonb),
    ('compParams', 'Before: 1-3 miles. Cannabis-adjacent: 100+ miles (multi-state). 12 months. Subject neighborhood pre/post is most direct.', NULL, '{"values":{"beforeRadius":"3","cannabisRadius":"100","timeframeClosed":"12","studyScope":"national"}}'::jsonb, NULL),
    ('eaHc', 'HC for before: as if facility not constructed. EA: facility continues under current license. Appraiser quantifies market reaction, not legal merits.', NULL, NULL, NULL),
    ('justification', 'Most novel assignment. Cannabis-adjacent valuation is emerging with developing case law. Must document tangible nuisance, quantify stigma, analyze failed listings, navigate immature dataset, maintain objectivity. This property type will increase as legalization expands.', NULL, NULL, NULL)
  ) AS x(field_key, txt, cmt, dat, ovr)
WHERE ms.code = 'M2-S2' AND sf.field_key = x.field_key;
