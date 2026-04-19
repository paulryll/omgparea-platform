// server/src/seed.js
// -----------------------------------------------------------
// Seeds a working single-tenant state: one org (OMG PAREA),
// the 9-module curriculum spine, Module 2's 11 sections, and
// demo users (one admin + three students) with their 20 gates.
//
// Phase 2 Step 1A addition: seeds Section 1 (Problem
// Identification) content — categories, fields, sample
// scenarios, and model answers. The full 60-scenario content
// import comes in the next sub-step (Step 1A-content).
//
// Idempotent-ish: safe to re-run after db:init (which drops
// and recreates tables). Not safe to run against a populated
// production DB — use migrations for that later.
// -----------------------------------------------------------
 
import bcrypt from 'bcryptjs';
import { pool, withTx, initSchema } from './db.js';
import {
  SECTION_1_CODE,
  CATEGORIES as S1_CATEGORIES,
  FIELDS as S1_FIELDS,
  SCENARIOS as S1_SCENARIOS,
} from './data/section1-problem-identification.js';
 
const MODULES = [
  { order: 1, code: 'M1', name: 'Welcome & Orientation',       kind: 'orientation', hasGate: true,
    description: 'Onboarding videos, software orientation, program agreements requiring e-signature.' },
  { order: 2, code: 'M2', name: 'Exercises',                   kind: 'exercises',   hasGate: true,
    description: '11 sections of interactive residential appraisal exercises.' },
  { order: 3, code: 'M3', name: 'Report Writing',              kind: 'report',      hasGate: true,
    description: 'Report writing instruction plus 3 data entry reports.' },
  { order: 4, code: 'M4', name: 'Appraisal Assignments 1–3',   kind: 'assignment',  hasGate: true,
    description: 'First three full appraisal reports with VR property tours.' },
  { order: 5, code: 'M5', name: 'Appraisal Assignments 4–6',   kind: 'assignment',  hasGate: true,
    description: 'Assignments 4 through 6.' },
  { order: 6, code: 'M6', name: 'Appraisal Assignments 7–9',   kind: 'assignment',  hasGate: true,
    description: 'Assignments 7 through 9.' },
  { order: 7, code: 'M7', name: 'Business Basics',             kind: 'business',    hasGate: true,
    description: 'LLC setup, taxes, marketing fundamentals.' },
  { order: 8, code: 'M8', name: 'Appraisal Assignments 10–12', kind: 'assignment',  hasGate: true,
    description: 'Assignments 10 through 12 (certified residential track).' },
  { order: 9, code: 'M9', name: 'Advanced Business',           kind: 'business',    hasGate: true,
    description: 'Advanced business topics building on Module 7.' },
];
 
const M2_SECTIONS = [
  'Problem Identification',
  'Scope of Work',
  'Comparable Selection & Analysis',
  'Adjustment Analysis',
  'Locational Influence',
  'Market Analysis',
  'Highest & Best Use',
  'Income Approach',
  'Cost Approach',
  'Reconciliation',
  'Narrative Writing & Reporting',
];
 
// -----------------------------------------------------------
// Phase 2 Step 1A: seed Section 1 content
// -----------------------------------------------------------
async function seedSection1Content(c) {
  // 1. Find the section row (M2-S1) that Phase 1 seeded earlier.
  const secRes = await c.query(
    `SELECT id FROM module_sections WHERE code = $1`,
    [SECTION_1_CODE]
  );
  if (secRes.rows.length === 0) {
    throw new Error(`Section ${SECTION_1_CODE} not found — Phase 1 seeding did not run first.`);
  }
  const sectionId = secRes.rows[0].id;
 
  // 2. Categories
  const catIdByKey = {};
  for (const cat of S1_CATEGORIES) {
    const r = await c.query(
      `INSERT INTO scenario_categories
         (section_id, order_index, code, name, color_primary, color_accent, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        sectionId,
        cat.order,
        `${SECTION_1_CODE}-C${cat.order}`,
        cat.name,
        cat.colorPrimary,
        cat.colorAccent,
        cat.description || null,
      ]
    );
    catIdByKey[cat.key] = r.rows[0].id;
  }
 
  // 3. Fields
  const fieldIdByKey = {};
  for (const f of S1_FIELDS) {
    const r = await c.query(
      `INSERT INTO section_fields
         (section_id, order_index, field_key, label, help_text)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [sectionId, f.order, f.key, f.label, f.helpText || null]
    );
    fieldIdByKey[f.key] = r.rows[0].id;
  }
 
  // 4. Scenarios + model answers
  let scenarioCount = 0;
  let answerCount = 0;
  for (const sc of S1_SCENARIOS) {
    const categoryId = catIdByKey[sc.categoryKey];
    if (!categoryId) {
      throw new Error(`Unknown category key "${sc.categoryKey}" in scenario "${sc.title}".`);
    }
    const r = await c.query(
      `INSERT INTO scenarios
         (category_id, order_index, difficulty, title, scenario_text)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [categoryId, sc.order, sc.difficulty, sc.title, sc.scenarioText]
    );
    const scenarioId = r.rows[0].id;
    scenarioCount++;
 
    for (const [fieldKey, answerText] of Object.entries(sc.modelAnswers)) {
      const fieldId = fieldIdByKey[fieldKey];
      if (!fieldId) {
        throw new Error(`Unknown field key "${fieldKey}" in scenario "${sc.title}".`);
      }
      await c.query(
        `INSERT INTO model_answers (scenario_id, field_id, answer_text)
         VALUES ($1,$2,$3)`,
        [scenarioId, fieldId, answerText]
      );
      answerCount++;
    }
  }
 
  return {
    sectionId,
    categoryCount: S1_CATEGORIES.length,
    fieldCount: S1_FIELDS.length,
    scenarioCount,
    answerCount,
  };
}
 
async function seed() {
  // 1. Rebuild schema
  await initSchema();
 
  await withTx(async (c) => {
    // 2. Organization
    const orgRes = await c.query(
      `INSERT INTO organizations (slug, name, branding, active)
       VALUES ($1, $2, $3, TRUE) RETURNING id`,
      ['omgparea', 'OMG PAREA', JSON.stringify({
        primary: '#FF1493',     // hot pink (Oscar Mike brand)
        accent:  '#000000',
        logo:    '/logo.png',
      })]
    );
    const orgId = orgRes.rows[0].id;
 
    // 3. Modules
    const moduleIdByCode = {};
    for (const m of MODULES) {
      const r = await c.query(
        `INSERT INTO modules (order_index, code, name, description, kind, has_gate)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [m.order, m.code, m.name, m.description, m.kind, m.hasGate]
      );
      moduleIdByCode[m.code] = r.rows[0].id;
    }
 
    // 4. Module 2 sections (the 11 sub-gates)
    const m2Id = moduleIdByCode['M2'];
    const m2SectionIds = [];
    for (let i = 0; i < M2_SECTIONS.length; i++) {
      const r = await c.query(
        `INSERT INTO module_sections (module_id, order_index, code, name)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [m2Id, i + 1, `M2-S${i + 1}`, M2_SECTIONS[i]]
      );
      m2SectionIds.push(r.rows[0].id);
    }
 
    // 5. Users
    const hash = (pw) => bcrypt.hashSync(pw, 10);
 
    const admin = await c.query(
      `INSERT INTO users (organization_id, email, username, password_hash, role, first_name, last_name)
       VALUES ($1,$2,$3,$4,'admin','Paul','Ryll') RETURNING id`,
      [orgId, 'admin@omgparea.com', 'admin', hash('admin123')]
    );
    const adminId = admin.rows[0].id;
 
    const students = [];
    for (const s of [
      { email: 'jsmith@example.com',  user: 'jsmith',  first: 'Jordan', last: 'Smith'  },
      { email: 'agarcia@example.com', user: 'agarcia', first: 'Ana',    last: 'Garcia' },
      { email: 'kwilson@example.com', user: 'kwilson', first: 'Kai',    last: 'Wilson' },
    ]) {
      const r = await c.query(
        `INSERT INTO users (organization_id, email, username, password_hash, role, first_name, last_name)
         VALUES ($1,$2,$3,$4,'student',$5,$6) RETURNING id`,
        [orgId, s.email, s.user, hash('student123'), s.first, s.last]
      );
      students.push({ id: r.rows[0].id, ...s });
    }
 
    // 6. For each student: enable all modules + create their 20 gates
    for (const s of students) {
      for (const m of MODULES) {
        await c.query(
          `INSERT INTO student_module_access (organization_id, student_id, module_id, enabled)
           VALUES ($1,$2,$3,TRUE)`,
          [orgId, s.id, moduleIdByCode[m.code]]
        );
      }
 
      for (const m of MODULES) {
        const mId = moduleIdByCode[m.code];
        if (m.code === 'M2') {
          for (const secId of m2SectionIds) {
            await c.query(
              `INSERT INTO gates (organization_id, student_id, module_id, section_id)
               VALUES ($1,$2,$3,$4)`,
              [orgId, s.id, mId, secId]
            );
          }
        } else {
          await c.query(
            `INSERT INTO gates (organization_id, student_id, module_id, section_id)
             VALUES ($1,$2,$3,NULL)`,
            [orgId, s.id, mId]
          );
        }
      }
    }
 
    // 7. Demo progression: unlock Jordan Smith's Module 1 gate so
    //    the sequential gating is observable out of the box.
    await c.query(
      `UPDATE gates SET unlocked = TRUE, unlocked_at = NOW(), unlocked_by = $1, note = 'Demo seed'
       WHERE student_id = $2 AND module_id = $3 AND section_id IS NULL`,
      [adminId, students[0].id, moduleIdByCode['M1']]
    );
 
    console.log(`✓ Seeded org ${orgId} with ${students.length} students, ${MODULES.length} modules, ${m2SectionIds.length} M2 sections`);
 
    // 8. Phase 2 Step 1A — seed Section 1 content
    const s1 = await seedSection1Content(c);
    console.log(
      `✓ Seeded Section 1 (Problem Identification): ` +
      `${s1.categoryCount} categories, ${s1.fieldCount} fields, ` +
      `${s1.scenarioCount} scenarios, ${s1.answerCount} model answers ` +
      `(SAMPLE — full 60-scenario import pending in Step 1A-content).`
    );
  });
 
  console.log('\n--- Demo credentials ---');
  console.log('Admin:    admin / admin123');
  console.log('Students: jsmith / agarcia / kwilson  (password: student123)');
  console.log('jsmith has Module 1 pre-unlocked to show gating in action.\n');
}
 
seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
 
