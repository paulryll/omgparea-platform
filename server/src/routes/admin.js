// server/src/routes/admin.js
// -----------------------------------------------------------
// Admin-facing endpoints. All scoped to the admin's org.
//   GET  /api/admin/students                                  — roster
//   GET  /api/admin/students/:id                              — detail tree
//   POST /api/admin/gates/:gateId/unlock                      — unlock a gate
//   POST /api/admin/gates/:gateId/lock                        — re-lock a gate
//   POST /api/admin/students/:id/modules/:moduleId/toggle     — show/hide a module
// -----------------------------------------------------------

import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'super_admin'));

// -----------------------------------------------------------
// GET /api/admin/students — roster with progress summary
// -----------------------------------------------------------
router.get('/students', async (req, res) => {
  const orgId = req.user.organizationId;
  const { rows } = await query(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at,
            (SELECT COUNT(*)::int FROM gates g WHERE g.student_id = u.id)                              AS gates_total,
            (SELECT COUNT(*)::int FROM gates g WHERE g.student_id = u.id AND g.unlocked = TRUE)        AS gates_unlocked,
            (SELECT COUNT(*)::int FROM student_module_access sma
               WHERE sma.student_id = u.id AND sma.enabled = TRUE)                                     AS modules_enabled
       FROM users u
      WHERE u.organization_id = $1 AND u.role = 'student'
      ORDER BY u.last_name, u.first_name`,
    [orgId]
  );
  res.json({ students: rows });
});

// -----------------------------------------------------------
// GET /api/admin/students/:id — detail with per-module state
// Returns the student record plus a nested module/section/gate
// tree. Module 2 carries its 11 section gates; every other
// module carries a single module-level gate.
// -----------------------------------------------------------
router.get('/students/:id', async (req, res) => {
  const orgId     = req.user.organizationId;
  const studentId = Number(req.params.id);

  const userQ = await query(
    `SELECT id, username, email, first_name, last_name, status, created_at
       FROM users WHERE id = $1 AND organization_id = $2 AND role = 'student'`,
    [studentId, orgId]
  );
  if (!userQ.rows[0]) return res.status(404).json({ error: 'Student not found' });
  const student = userQ.rows[0];

  // Modules + per-student access (defaults to enabled if no row exists)
  const modQ = await query(
    `SELECT m.id, m.order_index, m.code, m.name, m.kind, m.has_gate,
            COALESCE(sma.enabled, TRUE) AS enabled
       FROM modules m
       LEFT JOIN student_module_access sma
              ON sma.module_id = m.id AND sma.student_id = $1
      ORDER BY m.order_index`,
    [studentId]
  );

  // Sections (Module 2 has 11 of these; others have none)
  const secQ = await query(
    `SELECT s.id, s.module_id, s.order_index, s.code, s.name
       FROM module_sections s
       JOIN modules m ON m.id = s.module_id
       ORDER BY m.order_index, s.order_index`
  );

  // Gates with unlocker name
  const gateQ = await query(
    `SELECT g.id, g.module_id, g.section_id, g.unlocked, g.unlocked_at, g.unlocked_by, g.note,
            u.first_name AS unlocker_first, u.last_name AS unlocker_last
       FROM gates g
       LEFT JOIN users u ON u.id = g.unlocked_by
      WHERE g.student_id = $1 AND g.organization_id = $2`,
    [studentId, orgId]
  );
  const gateByKey = new Map(
    gateQ.rows.map((g) => [`${g.module_id}:${g.section_id ?? 'null'}`, g])
  );

  const modules = modQ.rows.map((m) => {
    const out = {
      id: m.id,
      order: m.order_index,
      code: m.code,
      name: m.name,
      kind: m.kind,
      enabled: m.enabled,
      hasGate: m.has_gate,
    };
    if (m.code === 'M2') {
      out.sections = secQ.rows
        .filter((s) => s.module_id === m.id)
        .map((s) => {
          const g = gateByKey.get(`${m.id}:${s.id}`) || null;
          return {
            id: s.id,
            order: s.order_index,
            code: s.code,
            name: s.name,
            gate: g && {
              id: g.id,
              unlocked: g.unlocked,
              unlockedAt: g.unlocked_at,
              unlockedBy: g.unlocked_by
                ? `${g.unlocker_first} ${g.unlocker_last}`
                : null,
              note: g.note,
            },
          };
        });
    } else {
      const g = gateByKey.get(`${m.id}:null`) || null;
      out.gate = g && {
        id: g.id,
        unlocked: g.unlocked,
        unlockedAt: g.unlocked_at,
        unlockedBy: g.unlocked_by
          ? `${g.unlocker_first} ${g.unlocker_last}`
          : null,
        note: g.note,
      };
    }
    return out;
  });

  res.json({ student, modules });
});

// -----------------------------------------------------------
// POST /api/admin/gates/:gateId/unlock   { note?: string }
// Idempotent. Records who unlocked and when.
// -----------------------------------------------------------
router.post('/gates/:gateId/unlock', async (req, res) => {
  const orgId  = req.user.organizationId;
  const gateId = Number(req.params.gateId);
  const note   = (req.body?.note || '').slice(0, 500) || null;

  const { rows } = await query(
    `UPDATE gates
        SET unlocked = TRUE, unlocked_at = NOW(), unlocked_by = $1, note = COALESCE($2, note)
      WHERE id = $3 AND organization_id = $4
      RETURNING id, student_id, module_id, section_id, unlocked, unlocked_at`,
    [req.user.id, note, gateId, orgId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Gate not found' });
  res.json({ gate: rows[0] });
});

// -----------------------------------------------------------
// POST /api/admin/gates/:gateId/lock — re-lock (in case of error)
// -----------------------------------------------------------
router.post('/gates/:gateId/lock', async (req, res) => {
  const orgId  = req.user.organizationId;
  const gateId = Number(req.params.gateId);
  const { rows } = await query(
    `UPDATE gates
        SET unlocked = FALSE, unlocked_at = NULL, unlocked_by = NULL
      WHERE id = $1 AND organization_id = $2
      RETURNING id, unlocked`,
    [gateId, orgId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Gate not found' });
  res.json({ gate: rows[0] });
});

// -----------------------------------------------------------
// POST /api/admin/students/:id/modules/:moduleId/toggle  { enabled: boolean }
// Hides or shows a specific module for a specific student.
// -----------------------------------------------------------
router.post('/students/:id/modules/:moduleId/toggle', async (req, res) => {
  const orgId     = req.user.organizationId;
  const studentId = Number(req.params.id);
  const moduleId  = Number(req.params.moduleId);
  const enabled   = Boolean(req.body?.enabled);

  // Verify student belongs to this org
  const s = await query(
    `SELECT 1 FROM users WHERE id = $1 AND organization_id = $2 AND role = 'student'`,
    [studentId, orgId]
  );
  if (!s.rows[0]) return res.status(404).json({ error: 'Student not found' });

  // Upsert access row
  await query(
    `INSERT INTO student_module_access (organization_id, student_id, module_id, enabled, updated_at)
     VALUES ($1,$2,$3,$4,NOW())
     ON CONFLICT (student_id, module_id)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
    [orgId, studentId, moduleId, enabled]
  );
  res.json({ ok: true, studentId, moduleId, enabled });
});

export default router;
