// server/src/seed.js
// -----------------------------------------------------------
// Seeds a working single-tenant state: one org (OMG PAREA),
// the 9-module curriculum spine, Module 2's 11 sections, and
// demo users (one admin + two students) with their 20 gates.
//
// Idempotent-ish: safe to re-run after db:init (which drops
// and recreates tables). Not safe to run against a populated
// production DB — use migrations for that later.
// -----------------------------------------------------------

import bcrypt from 'bcryptjs';
import { pool, withTx, initSchema } from './db.js';

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
      // Module access — all enabled by default
      for (const m of MODULES) {
        await c.query(
          `INSERT INTO student_module_access (organization_id, student_id, module_id, enabled)
           VALUES ($1,$2,$3,TRUE)`,
          [orgId, s.id, moduleIdByCode[m.code]]
        );
      }

      // Gates — one per module, except Module 2 which has 11 section gates (no module-level gate)
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

    console.log(`✓ Seeded org "${orgId}" with ${students.length} students, ${MODULES.length} modules, ${m2SectionIds.length} M2 sections`);
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
