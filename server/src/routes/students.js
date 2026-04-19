// server/src/routes/students.js
// -----------------------------------------------------------
// Student-facing endpoints. Only returns data for the
// authenticated student, scoped to their organization.
// Hidden modules (student_module_access.enabled = FALSE) are
// filtered out entirely.
// -----------------------------------------------------------

import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// GET /api/students/me/dashboard
// Returns the student's curriculum view with sequential gating applied.
router.get('/me/dashboard', requireAuth, requireRole('student'), async (req, res) => {
  const studentId = req.user.id;
  const orgId     = req.user.organizationId;

  // 1. Modules visible to this student (enabled = TRUE)
  const modulesQ = await query(
    `SELECT m.id, m.order_index, m.code, m.name, m.description, m.kind, m.has_gate
       FROM modules m
       JOIN student_module_access sma
         ON sma.module_id = m.id
        AND sma.student_id = $1
        AND sma.enabled = TRUE
      WHERE sma.organization_id = $2
      ORDER BY m.order_index ASC`,
    [studentId, orgId]
  );
  const modules = modulesQ.rows;

  // 2. Sections for Module 2 (if visible)
  const m2 = modules.find((m) => m.code === 'M2');
  let sections = [];
  if (m2) {
    const sQ = await query(
      `SELECT id, module_id, order_index, code, name
         FROM module_sections WHERE module_id = $1 ORDER BY order_index`,
      [m2.id]
    );
    sections = sQ.rows;
  }

  // 3. Gates for this student
  const gatesQ = await query(
    `SELECT id, module_id, section_id, unlocked, unlocked_at
       FROM gates WHERE student_id = $1 AND organization_id = $2`,
    [studentId, orgId]
  );
  const gateByKey = new Map();
  for (const g of gatesQ.rows) {
    gateByKey.set(`${g.module_id}:${g.section_id ?? 'null'}`, g);
  }

  // 4. Assemble flat gate sequence in curriculum order.
  //    For Module 2, sections are interleaved where it sits in order.
  const sequence = []; // each item: {moduleId, sectionId, gate}
  for (const m of modules) {
    if (m.code === 'M2') {
      for (const s of sections) {
        sequence.push({
          moduleId: m.id,
          sectionId: s.id,
          gate: gateByKey.get(`${m.id}:${s.id}`) || null,
        });
      }
    } else if (m.has_gate) {
      sequence.push({
        moduleId: m.id,
        sectionId: null,
        gate: gateByKey.get(`${m.id}:null`) || null,
      });
    }
  }

  // 5. Sequential lock evaluation.
  //    A step is "accessible" only if ALL prior gates are unlocked.
  //    The first step is always accessible. Once you hit a locked
  //    gate, everything after it is locked too.
  let priorAllUnlocked = true;
  const accessByKey = new Map();
  for (const step of sequence) {
    const key = `${step.moduleId}:${step.sectionId ?? 'null'}`;
    accessByKey.set(key, priorAllUnlocked);
    if (!step.gate || !step.gate.unlocked) priorAllUnlocked = false;
  }

  // 6. Shape response
  const payload = modules.map((m) => {
    const base = {
      id: m.id,
      order: m.order_index,
      code: m.code,
      name: m.name,
      description: m.description,
      kind: m.kind,
    };

    if (m.code === 'M2') {
      return {
        ...base,
        sections: sections.map((s) => {
          const g = gateByKey.get(`${m.id}:${s.id}`) || null;
          return {
            id: s.id,
            order: s.order_index,
            code: s.code,
            name: s.name,
            accessible: accessByKey.get(`${m.id}:${s.id}`) === true,
            gate: g ? { unlocked: g.unlocked, unlockedAt: g.unlocked_at } : null,
          };
        }),
      };
    }

    const g = gateByKey.get(`${m.id}:null`) || null;
    return {
      ...base,
      accessible: accessByKey.get(`${m.id}:null`) === true,
      gate: g ? { unlocked: g.unlocked, unlockedAt: g.unlocked_at } : null,
    };
  });

  res.json({ modules: payload });
});

export default router;
