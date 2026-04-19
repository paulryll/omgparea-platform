// server/src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

// POST /api/auth/login  { username, password }
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Phase 1: single-tenant. When white-label activates, also scope by org slug.
  const { rows } = await query(
    `SELECT u.id, u.organization_id, u.username, u.email, u.password_hash, u.role,
            u.first_name, u.last_name, u.status, o.slug AS org_slug, o.name AS org_name
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.username = $1
      LIMIT 1`,
    [username]
  );

  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: `Account is ${user.status}` });
  }

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      organization: { slug: user.org_slug, name: user.org_name },
    },
  });
});

// GET /api/auth/me — returns the current user from the token
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name,
            o.slug AS org_slug, o.name AS org_name
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = $1`,
    [req.user.id]
  );
  const u = rows[0];
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    firstName: u.first_name,
    lastName: u.last_name,
    organization: { slug: u.org_slug, name: u.org_name },
  });
});

export default router;
