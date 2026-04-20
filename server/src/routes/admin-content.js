// server/src/routes/admin-content.js
// -----------------------------------------------------------
// Admin-only endpoints for reviewing student submissions on
// exercise content. Supports the mentor check-in workflow:
// admin drills into a student's section progress, then into
// each individual submission to compare the student's answer
// side-by-side with the model answer for every field, and
// leave a written feedback note for the student.
//
// Step 1D additions:
//   - Feedback metadata (admin_feedback / feedback_at /
//     feedback_by / feedback_by_name) returned on the
//     GET /submissions/:id endpoint.
//   - New PUT /submissions/:id/feedback endpoint for saving
//     feedback. Blank text clears the feedback; non-blank
//     text stores the note and stamps the time/author.
//
// Mount at /api/admin/content — see server/src/index.js
// -----------------------------------------------------------
 
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
 
const router = Router();
 
// Every endpoint in this router is admin-only.
router.use(requireAuth, requireRole('admin'));
 
// -----------------------------------------------------------
// GET /api/admin/content/students/:studentId/sections/:code/submissions
// -----------------------------------------------------------
// Returns every scenario in the section, grouped by category,
// with each flagged as submitted or not for this student.
// Gives the admin a complete view of the student's section
// progress before the mentor check-in.
//
// Used by: admin "Student detail > Section review" page.
// -----------------------------------------------------------
router.get(
  '/students/:studentId/sections/:code/submissions',
  async (req, res) => {
    const studentId = Number(req.params.studentId);
    const sectionCode = req.params.code;
    const orgId = req.user.organizationId;
 
    // Confirm the student is in the admin's org
    const stuRes = await query(
      `SELECT id, first_name, last_name, email, organization_id
         FROM users WHERE id = $1 AND role = 'student'`,
      [studentId]
    );
    if (stuRes.rows.length === 0 || stuRes.rows[0].organization_id !== orgId) {
      return res.status(404).json({ error: 'Student not found in your organization' });
    }
    const student = stuRes.rows[0];
 
    const secRes = await query(
      `SELECT id, code, name FROM module_sections WHERE code = $1`,
      [sectionCode]
    );
    if (secRes.rows.length === 0) {
      return res.status(404).json({ error: `Section ${sectionCode} not found` });
    }
    const section = secRes.rows[0];
 
    // All scenarios in the section, each with category and this student's
    // submission (via LEFT JOIN so un-submitted scenarios still appear).
    // feedback_at is included so the list view can show a "Feedback saved" marker.
    const rowsRes = await query(
      `SELECT sc.id             AS scenario_id,
              sc.order_index    AS scenario_order,
              sc.difficulty,
              sc.title,
              cat.id            AS category_id,
              cat.order_index   AS category_order,
              cat.name          AS category_name,
              cat.color_primary,
              cat.color_accent,
              ss.id             AS submission_id,
              ss.submitted_at,
              ss.time_spent_sec,
              ss.locked,
              ss.feedback_at
         FROM scenarios sc
         JOIN scenario_categories cat ON cat.id = sc.category_id
         LEFT JOIN scenario_submissions ss
           ON ss.scenario_id = sc.id AND ss.student_id = $1
        WHERE cat.section_id = $2
        ORDER BY cat.order_index ASC, sc.order_index ASC`,
      [studentId, section.id]
    );
 
    // Group scenarios by category
    const byCategory = new Map();
    for (const r of rowsRes.rows) {
      if (!byCategory.has(r.category_id)) {
        byCategory.set(r.category_id, {
          id: r.category_id,
          order: r.category_order,
          name: r.category_name,
          colorPrimary: r.color_primary,
          colorAccent: r.color_accent,
          scenarios: [],
        });
      }
      byCategory.get(r.category_id).scenarios.push({
        id: r.scenario_id,
        order: r.scenario_order,
        difficulty: r.difficulty,
        title: r.title,
        submission: r.submission_id
          ? {
              id: r.submission_id,
              submittedAt: r.submitted_at,
              timeSpentSec: r.time_spent_sec,
              locked: r.locked,
              hasFeedback: r.feedback_at != null,
              feedbackAt: r.feedback_at,
            }
          : null,
      });
    }
 
    const submittedCount = rowsRes.rows.filter((r) => r.submission_id != null).length;
    const totalCount = rowsRes.rows.length;
 
    res.json({
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
      },
      section: { id: section.id, code: section.code, name: section.name },
      summary: {
        submittedCount,
        totalCount,
        pctComplete: totalCount === 0 ? 0 : Math.round((submittedCount / totalCount) * 100),
      },
      categories: Array.from(byCategory.values()).sort((a, b) => a.order - b.order),
    });
  }
);
 
// -----------------------------------------------------------
// GET /api/admin/content/submissions/:id
// -----------------------------------------------------------
// Full side-by-side review of one submission. Returns the
// scenario narrative, every field with the student's answer
// and the model answer, plus submission metadata (timestamp,
// time spent), plus any existing admin feedback note. This
// is the core review surface.
//
// Used by: admin "Submission detail" drill-down page.
// -----------------------------------------------------------
router.get('/submissions/:id', async (req, res) => {
  const submissionId = Number(req.params.id);
  const orgId = req.user.organizationId;
  if (!Number.isInteger(submissionId)) {
    return res.status(400).json({ error: 'Invalid submission id' });
  }
 
  const subRes = await query(
    `SELECT ss.id, ss.student_id, ss.scenario_id, ss.submitted_at,
            ss.time_spent_sec, ss.locked, ss.organization_id,
            ss.admin_feedback, ss.feedback_at, ss.feedback_by,
            u.first_name, u.last_name, u.email,
            fb.first_name AS feedback_by_first_name,
            fb.last_name  AS feedback_by_last_name
       FROM scenario_submissions ss
       JOIN users u ON u.id = ss.student_id
       LEFT JOIN users fb ON fb.id = ss.feedback_by
      WHERE ss.id = $1`,
    [submissionId]
  );
  if (subRes.rows.length === 0 || subRes.rows[0].organization_id !== orgId) {
    return res.status(404).json({ error: 'Submission not found in your organization' });
  }
  const sub = subRes.rows[0];
 
  const scRes = await query(
    `SELECT sc.id, sc.order_index, sc.difficulty, sc.title, sc.scenario_text,
            cat.id AS category_id, cat.name AS category_name,
            cat.color_primary, cat.color_accent,
            sec.id AS section_id, sec.code AS section_code, sec.name AS section_name
       FROM scenarios sc
       JOIN scenario_categories cat ON cat.id = sc.category_id
       JOIN module_sections sec     ON sec.id = cat.section_id
      WHERE sc.id = $1`,
    [sub.scenario_id]
  );
  const sc = scRes.rows[0];
 
  const fieldRes = await query(
    `SELECT id, order_index, field_key, label, help_text
       FROM section_fields
      WHERE section_id = $1
      ORDER BY order_index ASC`,
    [sc.section_id]
  );
 
  const ansRes = await query(
    `SELECT field_id, answer_text FROM scenario_answers WHERE submission_id = $1`,
    [submissionId]
  );
  const studentByFieldId = new Map();
  for (const a of ansRes.rows) studentByFieldId.set(a.field_id, a.answer_text);
 
  const modelRes = await query(
    `SELECT field_id, answer_text, commentary FROM model_answers WHERE scenario_id = $1`,
    [sub.scenario_id]
  );
  const modelByFieldId = new Map();
  for (const m of modelRes.rows) modelByFieldId.set(m.field_id, m);
 
  // Assemble the feedback-by-admin display name if we have one
  let feedbackByName = null;
  if (sub.feedback_by_first_name || sub.feedback_by_last_name) {
    feedbackByName = [sub.feedback_by_first_name, sub.feedback_by_last_name]
      .filter(Boolean)
      .join(' ');
  }
 
  res.json({
    student: {
      id: sub.student_id,
      firstName: sub.first_name,
      lastName: sub.last_name,
      email: sub.email,
    },
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
    submission: {
      id: sub.id,
      submittedAt: sub.submitted_at,
      timeSpentSec: sub.time_spent_sec,
      locked: sub.locked,
    },
    feedback: {
      text: sub.admin_feedback,
      savedAt: sub.feedback_at,
      savedByUserId: sub.feedback_by,
      savedByName: feedbackByName,
    },
    fields: fieldRes.rows.map((f) => {
      const model = modelByFieldId.get(f.id);
      return {
        id: f.id,
        order: f.order_index,
        key: f.field_key,
        label: f.label,
        helpText: f.help_text,
        studentAnswer: studentByFieldId.get(f.id) ?? null,
        modelAnswer: model ? model.answer_text : null,
        commentary: model ? model.commentary : null,
      };
    }),
  });
});
 
// -----------------------------------------------------------
// PUT /api/admin/content/submissions/:id/feedback
// -----------------------------------------------------------
// Save (or clear) the admin's feedback note for a submission.
//
// Body: { feedback: string }
//   - Non-blank string: stores the text and stamps the time
//     and author (req.user.id).
//   - Blank/empty string: clears the note, timestamp, and author.
//
// Rejects with:
//   400 — invalid body or submission id
//   404 — submission not found / not in admin's org
//
// Used by: admin "Submission detail" page — save button on
// the feedback textarea.
// -----------------------------------------------------------
router.put('/submissions/:id/feedback', async (req, res) => {
  const submissionId = Number(req.params.id);
  const orgId = req.user.organizationId;
  const adminId = req.user.id;
 
  if (!Number.isInteger(submissionId)) {
    return res.status(400).json({ error: 'Invalid submission id' });
  }
 
  const { feedback } = req.body || {};
  if (feedback !== undefined && typeof feedback !== 'string') {
    return res.status(400).json({ error: 'feedback must be a string' });
  }
 
  // Verify the submission exists and belongs to the admin's org
  const checkRes = await query(
    `SELECT id FROM scenario_submissions
      WHERE id = $1 AND organization_id = $2`,
    [submissionId, orgId]
  );
  if (checkRes.rows.length === 0) {
    return res.status(404).json({ error: 'Submission not found in your organization' });
  }
 
  const trimmed = typeof feedback === 'string' ? feedback.trim() : '';
 
  if (trimmed === '') {
    // Clearing the feedback
    await query(
      `UPDATE scenario_submissions
          SET admin_feedback = NULL,
              feedback_at    = NULL,
              feedback_by    = NULL
        WHERE id = $1`,
      [submissionId]
    );
    return res.json({
      feedback: { text: null, savedAt: null, savedByUserId: null, savedByName: null },
    });
  }
 
  // Saving (or updating) feedback
  const updateRes = await query(
    `UPDATE scenario_submissions
        SET admin_feedback = $1,
            feedback_at    = NOW(),
            feedback_by    = $2
      WHERE id = $3
      RETURNING admin_feedback, feedback_at, feedback_by`,
    [trimmed, adminId, submissionId]
  );
  const row = updateRes.rows[0];
 
  // Look up the admin's display name for the response
  const nameRes = await query(
    `SELECT first_name, last_name FROM users WHERE id = $1`,
    [adminId]
  );
  const n = nameRes.rows[0] || {};
  const savedByName = [n.first_name, n.last_name].filter(Boolean).join(' ') || null;
 
  res.json({
    feedback: {
      text: row.admin_feedback,
      savedAt: row.feedback_at,
      savedByUserId: row.feedback_by,
      savedByName,
    },
  });
});
 
export default router;
 
