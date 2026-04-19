// server/src/data/section1-problem-identification.js
// -----------------------------------------------------------
// Content data for Module 2 Section 1: Problem Identification.
//
// This is the SOURCE OF TRUTH for all Section 1 content.
// To correct a scenario or model answer, edit this file —
// the seed script reads it and loads the database on re-seed.
//
// STATUS: Step 1A — 3 sample scenarios loaded (one each for
// the Mortgage Lending, Litigation Support, and Specialty
// Situations categories) to prove wiring across multiple
// categories. The remaining 57 scenarios will be imported
// from the existing React artifacts in Step 1A-content
// (the next sub-step).
// -----------------------------------------------------------
 
export const SECTION_1_CODE = 'M2-S1';  // matches module_sections.code
 
// -----------------------------------------------------------
// The 6 categories within Problem Identification.
// Colors match the existing standalone React artifacts so
// the in-app experience is visually continuous with what
// you've already built.
// -----------------------------------------------------------
export const CATEGORIES = [
  { key: 'mortgage-lending',     order: 1, name: 'Mortgage Lending',        colorPrimary: '#1a1a2e', colorAccent: '#2a2a4e' },
  { key: 'litigation-support',   order: 2, name: 'Litigation Support',      colorPrimary: '#4a1942', colorAccent: '#6a2962' },
  { key: 'estate-tax',           order: 3, name: 'Estate & Tax',            colorPrimary: '#0f4c3a', colorAccent: '#1f6c5a' },
  { key: 'private-consulting',   order: 4, name: 'Private / Consulting',    colorPrimary: '#8b4513', colorAccent: '#ab6533' },
  { key: 'government-public',    order: 5, name: 'Government & Public Use', colorPrimary: '#1a3a5c', colorAccent: '#2a5a7c' },
  { key: 'specialty-situations', order: 6, name: 'Specialty Situations',    colorPrimary: '#6b1d1d', colorAccent: '#8b3d3d' },
];
 
// -----------------------------------------------------------
// The 9 fields every Problem Identification scenario asks
// students to complete.
// -----------------------------------------------------------
export const FIELDS = [
  { key: 'client',            order: 1, label: 'Client' },
  { key: 'intended_users',    order: 2, label: 'Intended User(s)' },
  { key: 'intended_use',      order: 3, label: 'Intended Use' },
  { key: 'value_type',        order: 4, label: 'Type & Definition of Value' },
  { key: 'effective_date',    order: 5, label: 'Effective Date' },
  { key: 'property_interest', order: 6, label: 'Property Interest Appraised' },
  { key: 'scope_of_work',     order: 7, label: 'Scope of Work Considerations' },
  { key: 'assumptions',       order: 8, label: 'Extraordinary Assumptions / Hypothetical Conditions' },
  { key: 'uspap',             order: 9, label: 'Relevant USPAP Obligations' },
];
 
// -----------------------------------------------------------
// Sample scenarios — one per selected category to prove
// wiring across multiple categories. Set in the Greenville/
// Spartanburg market for local relevance. Full content
// import (all 60 scenarios) happens in Step 1A-content.
// -----------------------------------------------------------
export const SCENARIOS = [
  {
    categoryKey: 'mortgage-lending',
    order: 1,
    difficulty: 'basic',
    title: 'Conventional Purchase — Single-Family Residence',
    scenarioText:
      'You receive an appraisal order from Carolina First Mortgage for a conventional loan. ' +
      'The borrower is purchasing a 3-bedroom, 2-bath single-family home at 412 Rutherford Street ' +
      'in Greenville, SC. The contract price is $295,000 with 20% down on a 30-year fixed mortgage. ' +
      'The loan officer requests a standard 1004 appraisal with a 10-day turnaround. The property ' +
      'is currently owner-occupied by the seller.',
    modelAnswers: {
      client:
        'Carolina First Mortgage.',
      intended_users:
        'Carolina First Mortgage as the lender, and any secondary-market investors (Fannie Mae, ' +
        'Freddie Mac, or private investors) to whom the loan may be sold.',
      intended_use:
        'To assist the lender in underwriting a residential mortgage loan secured by the subject ' +
        'property.',
      value_type:
        'Market Value as defined in the URAR (Fannie Mae Form 1004) and 12 CFR §34.42(h).',
      effective_date:
        'The date of inspection of the subject property.',
      property_interest:
        'Fee simple.',
      scope_of_work:
        'Complete 1004 scope: interior and exterior inspection of the subject, research and ' +
        'verification of at least three closed comparable sales, and application of the sales ' +
        'comparison approach as the primary indicator of value. Cost approach is optional on a ' +
        '1004; income approach is not applicable for this owner-occupied SFR.',
      assumptions:
        'None anticipated for a typical owner-occupied purchase with full interior access.',
      uspap:
        'STANDARDS 1 and 2 (development and reporting of a real property appraisal). Ethics Rule, ' +
        'Competency Rule, Record Keeping Rule, and Scope of Work Rule all apply.',
    },
  },
  {
    categoryKey: 'litigation-support',
    order: 1,
    difficulty: 'basic',
    title: 'Divorce — Equitable Distribution of Marital Residence',
    scenarioText:
      'An attorney, Harper & Vance LLP, contacts you to appraise the marital residence of their ' +
      "client, Ms. Elena Ruiz, in a divorce proceeding in Greenville County Family Court. The " +
      'property is a 4-bedroom home at 18 Wicklow Drive. Ms. Ruiz\'s attorney needs the appraisal ' +
      'for equitable distribution negotiations; the case is not yet in active litigation but may ' +
      'proceed to trial if settlement fails. The attorney requests a retrospective value as of ' +
      'the date of separation (March 14 of this year) as well as current market value.',
    modelAnswers: {
      client:
        'Harper & Vance LLP, attorneys representing Ms. Elena Ruiz.',
      intended_users:
        'Harper & Vance LLP and their client Ms. Ruiz. May extend to opposing counsel and the ' +
        'Family Court if the report is entered into evidence — the scope of intended users should ' +
        'be confirmed with the attorney in writing before delivery.',
      intended_use:
        'To support equitable distribution negotiations and, if necessary, litigation in ' +
        'Greenville County Family Court.',
      value_type:
        'Market Value per South Carolina family court practice (generally aligned with the ' +
        'USPAP/federal market value definition unless the court specifies otherwise).',
      effective_date:
        'Two effective dates: (1) retrospective — date of separation, March 14 of this year; and ' +
        '(2) current — date of inspection.',
      property_interest:
        'Fee simple.',
      scope_of_work:
        'Dual-date appraisal: interior and exterior inspection for the current value, plus ' +
        'retrospective research for the separation date (historical comparable sales, market ' +
        'conditions as of March 14). Sales comparison approach is primary for both dates. Report ' +
        'format should be suitable for court use.',
      assumptions:
        "An Extraordinary Assumption is likely required for the retrospective date regarding the " +
        "subject's condition as of March 14 (which cannot be verified through inspection today).",
      uspap:
        'STANDARDS 1 and 2. Ethics Rule (particularly the advocacy prohibition — the appraiser ' +
        'must remain impartial even though engaged by one party). Competency Rule (litigation ' +
        'work requires specific competency). Record Keeping Rule is elevated in litigation ' +
        'contexts; workfile must withstand subpoena.',
    },
  },
  {
    categoryKey: 'specialty-situations',
    order: 1,
    difficulty: 'basic',
    title: 'Manufactured Home on Leased Land',
    scenarioText:
      'A private party, Mr. Thomas Calder, hires you to appraise his 2019 double-wide ' +
      'manufactured home located in Mountain View MH Community in Greer, SC. Mr. Calder owns the ' +
      'home but leases the lot from the park operator ($485/month ground rent, one-year lease ' +
      'renewable). He is considering selling the home and wants to know what it is worth in the ' +
      'current market. The home is titled as personal property (not converted to real estate).',
    modelAnswers: {
      client:
        'Mr. Thomas Calder.',
      intended_users:
        'Mr. Thomas Calder only. No lender, no court, no third party identified.',
      intended_use:
        'To assist Mr. Calder in pricing his manufactured home for a potential private sale.',
      value_type:
        'Market Value of the manufactured home as personal property (chattel), not as real ' +
        'estate. The definition appropriate to personal property valuation should be stated and ' +
        'cited.',
      effective_date:
        'The date of inspection.',
      property_interest:
        'The home is titled as personal property; the underlying land is held by the park ' +
        'operator under a ground lease to the homeowner. The interest appraised is ownership of ' +
        'the manufactured home as a chattel, with the benefit of the leasehold on the underlying ' +
        'land.',
      scope_of_work:
        'Personal-property scope — not a URAR 1004. Inspection of the manufactured home ' +
        '(interior and exterior), research of comparable in-park manufactured home sales and ' +
        'nearby park sales. Sales comparison approach only. The depreciated replacement cost of ' +
        'the home may be used as a supporting indicator.',
      assumptions:
        'A Hypothetical Condition or Extraordinary Assumption may be needed regarding ' +
        'continuation of the current ground lease at current terms — resale value is heavily ' +
        'dependent on lease transferability to a buyer.',
      uspap:
        'STANDARDS 7 and 8 (personal property appraisal and reporting) — NOT Standards 1 and 2, ' +
        'because the home is titled as personal property, not real estate. Ethics Rule, ' +
        'Competency Rule, Record Keeping Rule, and Scope of Work Rule all apply.',
    },
  },
];
