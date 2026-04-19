// server/src/auth.js
// -----------------------------------------------------------
// JWT auth: sign tokens at login, verify on every protected
// route, and enforce role. Tokens carry user id, role, and
// organization_id so routes can tenant-scope their queries.
// -----------------------------------------------------------

import jwt from 'jsonwebtoken';

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev-only-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      org: user.organization_id,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// Middleware: requires a valid Bearer token; attaches req.user
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      organizationId: payload.org,
      username: payload.username,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware factory: require a specific role (or one of many)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
