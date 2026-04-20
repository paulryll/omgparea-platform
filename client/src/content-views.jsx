// server/src/routes/content.js
// -----------------------------------------------------------
// Exercise content API — reads and writes for the student
// experience. All endpoints require authentication; scope is
// enforced per-user (students see only their own submissions;
// admins are allowed through but use admin-content.js for
// student-specific views).
//
// Step 1D addition:
//   - GET /scenarios/:id now also returns any admin feedback
//     attached to the student's submission, so the student's
//     scenario review page can display instructor notes.
//
// Mount at /api/content — see server/src/index.js
// -----------------------------------------------------------
 
import { Router } from 'express';
import { query, withTx } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
 
const router = Router();
 
// -----------------------------------------------------------
// Helper: check that a student can access a given section.
// Replicates the sequential-gating logic from the student
// dashboard: a section is accessible only if every gate
// earlier in the curriculum is already unlocked.
// -----------------------------------------------------------
async function isSectionAccessible(studentId, orgId, sectionId) {
  const modRes = await query(
    `SELECT m.id, m.order_index, m.code, m.has_gate
       FROM modules m
       JOIN student_module_access sma
         ON sma.module_id = m.id AND sma.student_id = $1 AND sma.enabled = TRUE
      WHERE sma.organization_id = $2
      ORDER BY m.order_index ASC`,
    [studentId, orgId]
  );
  const modules = modRes.rows;
 
  const m2 = modules.find((m) => m.code === 'M2');
  let sections = [];
  if (m2) {
    const sRes = await query(
      `SELECT id, module_id, order_index FROM module_sections
         WHERE module_id = $1 ORDER BY order_index`,
      [m2.id]
    );
    sections = sRes.rows;
  }
 
  const gRes = await query(
    `SELECT module_id, section_id, unlocked FROM gates
       WHERE student_id = $1 AND organization_id = $2`,
    [studentId, orgId]
  );
  const gateByKey = new Map();
  for (const g of gRes.rows) {
    gateByKey.set(`${g.module_id}:${g.section_id ?? 'null'}`, g);
  }
 
  // Build the ordered sequence of gates the student must clear.
  const sequence = [];
  for (const m of modules) {
    if (m.code === 'M2') {
      for (const s of sections) {
        sequence.push({ moduleId: m.id, sectionId: s.id });
      }
    } else if (m.has_gate) {
      sequence.push({ moduleId: m.id, sectionId: null });
    }
  }
 
  // Walk: a step is accessible iff all prior gates are unlocked.
  let priorAllUnlocked = true;
  for (const step of sequence) {
    if (step.sectionId === sectionId) return priorAllUnlocked;
    const g = gateByKey.get(`${step.moduleId}:${step.sectionId ?? 'null'}`);
    if (!g || !g.unlocked) priorAllUnlocked = false;
  }
  return false; // section not in this student's visible sequence
}
 
// -----------------------------------------------------------
// GET /api/content/sections/:code/structure
// -----------------------------------------------------------
// Returns the static structure of a section — its categories
// and its fields. Does NOT include scenarios or submissions;
// those are fetched separately so the payload stays small
// and can be cached client-side between visits.
//
// Used by: student "Section landing" page to render the
// 6 category tiles + 9-field template.
// -----------------------------------------------------------
router.get('/sections/:code/structure', requireAuth, async (req, res) => {
  const { code } = req.params;
 
  const sectionRes = await query(
    `SELECT id, module_id, code, name FROM module_sections WHERE code = $1`,
    [code]
  );
  if (sectionRes.rows.length === 0) {
    return res.status(404).json({ error: `Section "${code}" not found` });
  }
  const section = sectionRes.rows[0];
 
  const catRes = await query(
    `SELECT id, order_index, code, name, color_primary, color_accent, description
       FROM scenario_categories
      WHERE section_id = $1
      ORDER BY order_index ASC`,
    [section.id]
  );
 
  const fieldRes = await query(
    `SELECT id, order_index, field_key, label, help_text
       FROM section_fields
      WHERE section_id = $1
      ORDER BY order_index ASC`,
    [section.id]
  );
 
  res.json({
    section: { id: section.id, code: section.code, name: section.name },
    categories: catRes.rows.map((c) => ({
      id: c.id,
      order: c.order_index,
      code: c.code,
      name: c.name,
      colorPrimary: c.color_primary,
      colorAccent: c.color_accent,
      description: c.description,
    })),
    fields: fieldRes.rows.map((f) => ({
      id: f.id,
      order: f.order_index,
      key: f.field_key,
      label: f.label,
      helpText: f.help_text,
    })),
  });
});
 
// -----------------------------------------------------------
// GET /api/content/categories/:id/scenarios
// -----------------------------------------------------------
// Returns all scenarios in a category. For student callers,
// each scenario includes the student's own submission status
// (submitted or not + submittedAt). Admin callers get the
// scenario list without per-student status.
//
// Used by: student "Category" page to render the 10 scenario
// tiles with "Submitted" / "Pending" badges.
// -----------------------------------------------------------
router.get('/categories/:id/scenarios', requireAuth, async (req, res) => {
  const categoryId = Number(req.params.id);
  if (!Number.isInteger(categoryId)) {
    return res.status(400).json({ error: 'Invalid category id' });
  }
 
  const scRes = await query(
    `SELECT id, order_index, difficulty, title
       FROM scenarios
      WHERE category_id = $1
      ORDER BY order_index ASC`,
    [categoryId]
  );
 
  const submissionsByScenario = new Map();
  if (req.user.role === 'student') {
    const subRes = await query(
      `SELECT scenario_id, submitted_at, time_spent_sec, locked
         FROM scenario_submissions
        WHERE student_id = $1 AND organization_id = $2`,
      [req.user.id, req.user.organizationId]
    );
    for (const s of subRes.rows) submissionsByScenario.set(s.scenario_id, s);
  }
 
  res.json({
    scenarios: scRes.rows.map((s) => {
      const sub = submissionsByScenario.get(s.id);
      return {
        id: s.id,
        order: s.order_index,
        difficulty: s.difficulty,
        title: s.title,
        submission: sub
          ? { submittedAt: sub.submitted_at, timeSpentSec: sub.time_spent_sec, locked: sub.locked }
          : null,
      };
    }),
  });
});
 
// -----------------------------------------------------------
// GET /api/content/scenarios/:id
// -----------------------------------------------------------
// Returns a single scenario: narrative text + the section's
// input fields. If the caller is a STUDENT who has already
// submitted this scenario, the response also includes their
// locked answers, the model answers (revealed only
// post-submission), and any admin feedback note attached to
// their submission.
//
// Admins receive scenario + fields but no submission, model
// answer, or feedback data from this endpoint — they use the
// admin endpoints to review specific students.
//
// Used by: student "Scenario detail" page — both the
// pre-submit form view AND the post-submit locked review
// with model answers and instructor feedback revealed.
// -----------------------------------------------------------
router.get('/scenarios/:id', requireAuth, async (req, res) => {
  const scenarioId = Number(req.params.id);
  if (!Number.isInteger(scenarioId)) {
    return res.status(400).json({ error: 'Invalid scenario id' });
  }
 
  const scRes = await query(
    `SELECT sc.id, sc.order_index, sc.difficulty, sc.title, sc.scenario_text,
            sc.category_id, cat.section_id, cat.name AS category_name,
            cat.color_primary, cat.color_accent,
            sec.code AS section_code, sec.name AS section_name
       FROM scenarios sc
       JOIN scenario_categories cat ON cat.id = sc.category_id
       JOIN module_sections sec     ON sec.id = cat.section_id
      WHERE sc.id = $1`,
    [scenarioId]
  );
  if (scRes.rows.length === 0) {
    return res.status(404).json({ error: 'Scenario not found' });
  }
  const sc = scRes.rows[0];
 
  const fieldRes = await query(
    `SELECT id, order_index, field_key, label, help_text
       FROM section_fields
      WHERE section_id = $1
      ORDER BY order_index ASC`,
    [sc.section_id]
  );
 
  const response = {
    scenario: {
      id: sc.id,
      order: sc.order_index,
      difficulty: sc.difficulty,
      title: sc.title,
      text: sc.scenario_text,
      category: {
        id: sc.category_id,
        name: sc.category_name,
        colorPrimary: sc.color_primary,
        colorAccent: sc.color_accent,
      },
      section: {
        id: sc.section_id,
        code: sc.section_code,
        name: sc.section_name,
      },
    },
    fields: fieldRes.rows.map((f) => ({
      id: f.id,
      order: f.order_index,
      key: f.field_key,
      label: f.label,
      helpText: f.help_text,
    })),
    submission: null,
    modelAnswers: null,
    feedback: null,
  };
 
  // Student-specific data: their own submission + model answers
  // + any admin feedback, all only available post-submit.
  if (req.user.role === 'student') {
    const subRes = await query(
      `SELECT ss.id, ss.submitted_at, ss.time_spent_sec, ss.locked,
              ss.admin_feedback, ss.feedback_at, ss.feedback_by,
              fb.first_name AS feedback_by_first_name,
              fb.last_name  AS feedback_by_last_name
         FROM scenario_submissions ss
         LEFT JOIN users fb ON fb.id = ss.feedback_by
        WHERE ss.student_id = $1 AND ss.scenario_id = $2 AND ss.organization_id = $3`,
      [req.user.id, scenarioId, req.user.organizationId]
    );
 
    if (subRes.rows.length > 0) {
      const sub = subRes.rows[0];
      const ansRes = await query(
        `SELECT sa.answer_text, sf.field_key
           FROM scenario_answers sa
           JOIN section_fields sf ON sf.id = sa.field_id
          WHERE sa.submission_id = $1`,
        [sub.id]
      );
      const answers = {};
      for (const a of ansRes.rows) answers[a.field_key] = a.answer_text;
 
      response.submission = {
        id: sub.id,
        submittedAt: sub.submitted_at,
        timeSpentSec: sub.time_spent_sec,
        locked: sub.locked,
        answers,
      };
 
      const modelRes = await query(
        `SELECT ma.answer_text, ma.commentary, sf.field_key
           FROM model_answers ma
           JOIN section_fields sf ON sf.id = ma.field_id
          WHERE ma.scenario_id = $1`,
        [scenarioId]
      );
      const modelAnswers = {};
      for (const m of modelRes.rows) {
        modelAnswers[m.field_key] = { text: m.answer_text, commentary: m.commentary };
      }
      response.modelAnswers = modelAnswers;
 
      // Include admin feedback if present. Only non-null if an admin
      // has actually saved a note on this submission.
      if (sub.admin_feedback) {
        let savedByName = null;
        if (sub.feedback_by_first_name || sub.feedback_by_last_name) {
          savedByName = [sub.feedback_by_first_name, sub.feedback_by_last_name]
            .filter(Boolean)
            .join(' ');
        }
        response.feedback = {
          text: sub.admin_feedback,
          savedAt: sub.feedback_at,
          savedByName,
        };
      }
    }
  }
 
  res.json(response);
});
 
// -----------------------------------------------------------
// POST /api/content/scenarios/:id/submit
// -----------------------------------------------------------
// Student submits their 9 typed answers for a scenario.
//
// Body: { answers: { [field_key]: string, ... }, timeSpentSec: number }
//
// Creates a locked submission row + one answer row per field
// in a single transaction so partial saves are impossible.
// Returns the model answers so the UI can reveal them
// immediately after submit.
//
// Rejects with:
//   400 — bad body / missing field answers
//   403 — section not accessible (prior gate still locked)
//   404 — scenario not found
//   409 — already submitted (submissions are permanent)
// -----------------------------------------------------------
router.post(
  '/scenarios/:id/submit',
  requireAuth,
  requireRole('student'),
  async (req, res) => {
    const scenarioId = Number(req.params.id);
    const { answers, timeSpentSec } = req.body || {};
 
    if (!Number.isInteger(scenarioId)) {
      return res.status(400).json({ error: 'Invalid scenario id' });
    }
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Missing answers object in request body' });
    }
    const timeSpent = Number.isFinite(timeSpentSec)
      ? Math.max(0, Math.floor(timeSpentSec))
      : 0;
 
    // Find scenario + its parent section
    const scRes = await query(
      `SELECT sc.id, cat.section_id
         FROM scenarios sc
         JOIN scenario_categories cat ON cat.id = sc.category_id
        WHERE sc.id = $1`,
      [scenarioId]
    );
    if (scRes.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    const sectionId = scRes.rows[0].section_id;
 
    // Gate check
    const accessible = await isSectionAccessible(
      req.user.id,
      req.user.organizationId,
      sectionId
    );
    if (!accessible) {
      return res.status(403).json({
        error: 'Section not accessible — a prior gate is still locked',
      });
    }
 
    // Already-submitted guard (submissions are permanent)
    const existingRes = await query(
      `SELECT id FROM scenario_submissions
        WHERE student_id = $1 AND scenario_id = $2`,
      [req.user.id, scenarioId]
    );
    if (existingRes.rows.length > 0) {
      return res.status(409).json({
        error: 'Scenario has already been submitted and locked',
      });
    }
 
    // Map field_key -> field_id for inserts
    const fieldRes = await query(
      `SELECT id, field_key FROM section_fields WHERE section_id = $1`,
      [sectionId]
    );
    const fieldIdByKey = new Map();
    for (const f of fieldRes.rows) fieldIdByKey.set(f.field_key, f.id);
 
    // Every field must be present in the body (empty string is allowed,
    // undefined/null is not — we want the student to answer every field).
    const missingKeys = [];
    for (const key of fieldIdByKey.keys()) {
      if (answers[key] === undefined || answers[key] === null) missingKeys.push(key);
    }
    if (missingKeys.length > 0) {
      return res.status(400).json({
        error: `Missing answers for fields: ${missingKeys.join(', ')}`,
      });
    }
 
    // Create submission + answer rows in one transaction
    let submissionId;
    await withTx(async (c) => {
      const subRes = await c.query(
        `INSERT INTO scenario_submissions
           (organization_id, student_id, scenario_id, submitted_at, time_spent_sec, locked)
         VALUES ($1, $2, $3, NOW(), $4, TRUE)
         RETURNING id, submitted_at`,
        [req.user.organizationId, req.user.id, scenarioId, timeSpent]
      );
      submissionId = subRes.rows[0].id;
 
      for (const [key, fieldId] of fieldIdByKey.entries()) {
        await c.query(
          `INSERT INTO scenario_answers (submission_id, field_id, answer_text)
           VALUES ($1, $2, $3)`,
          [submissionId, fieldId, String(answers[key])]
        );
      }
    });
 
    // Reveal model answers in the response
    const modelRes = await query(
      `SELECT ma.answer_text, ma.commentary, sf.field_key
         FROM model_answers ma
         JOIN section_fields sf ON sf.id = ma.field_id
        WHERE ma.scenario_id = $1`,
      [scenarioId]
    );
    const modelAnswers = {};
    for (const m of modelRes.rows) {
      modelAnswers[m.field_key] = { text: m.answer_text, commentary: m.commentary };
    }
 
    res.status(201).json({
      submissionId,
      submittedAt: new Date().toISOString(),
      timeSpentSec: timeSpent,
      modelAnswers,
    });
  }
);
 
export default router;
 
