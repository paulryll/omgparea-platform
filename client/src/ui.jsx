// client/src/ui.jsx
// -----------------------------------------------------------
// Shared building blocks: brand palette, the API client, and
// small UI primitives used across screens. Imported by both
// App.jsx and content-views.jsx. Keep this file focused on
// reusable pieces — anything screen-specific belongs in its
// own file.
// -----------------------------------------------------------

// ─── Brand palette (Oscar Mike) ─────────────────────────────
export const BRAND = {
  pink:    '#FF1493',
  pinkDk:  '#CC1075',
  black:   '#0E0E0E',
  ink:     '#1a1a1a',
  sub:     '#6b7280',
  line:    '#e5e7eb',
  bg:      '#f7f7f9',
  card:    '#ffffff',
  locked:  '#d1d5db',
  ok:      '#10b981',
  okBg:    '#ecfdf5',
  warn:    '#f59e0b',
  warnBg:  '#fffbeb',
  danger:  '#ef4444',
};

// ─── API client ──────────────────────────────────────────────
const TOKEN_KEY = 'omgparea_token';

export const api = {
  _token:      () => localStorage.getItem(TOKEN_KEY),
  _setToken:   (t) => localStorage.setItem(TOKEN_KEY, t),
  _clearToken: () => localStorage.removeItem(TOKEN_KEY),

  async _req(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const t = api._token();
      if (t) headers.Authorization = `Bearer ${t}`;
    }
    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : null;
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  // Auth
  login: (username, password) =>
    api._req('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => api._req('/auth/me'),

  // Student
  studentDashboard: () => api._req('/students/me/dashboard'),

  // Admin
  adminRoster:  () => api._req('/admin/students'),
  adminStudent: (id) => api._req(`/admin/students/${id}`),
  unlockGate:   (gateId, note) =>
    api._req(`/admin/gates/${gateId}/unlock`, { method: 'POST', body: { note } }),
  lockGate:     (gateId) => api._req(`/admin/gates/${gateId}/lock`, { method: 'POST' }),
  toggleModule: (studentId, moduleId, enabled) =>
    api._req(`/admin/students/${studentId}/modules/${moduleId}/toggle`, {
      method: 'POST',
      body: { enabled },
    }),

  // Content (Phase 2)
  sectionStructure:  (code) => api._req(`/content/sections/${code}/structure`),
  categoryScenarios: (id)   => api._req(`/content/categories/${id}/scenarios`),
  scenario:          (id)   => api._req(`/content/scenarios/${id}`),
  submitScenario:    (id, body) =>
    api._req(`/content/scenarios/${id}/submit`, { method: 'POST', body }),

  // Admin content (Phase 2)
  adminSectionSubmissions: (studentId, code) =>
    api._req(`/admin/content/students/${studentId}/sections/${code}/submissions`),
  adminSubmission: (id) => api._req(`/admin/content/submissions/${id}`),

  // Admin feedback (Step 1D) — save or clear an admin's feedback note on a submission.
  // Pass an empty string to clear. Returns { feedback: {...} }.
  saveSubmissionFeedback: (submissionId, feedback) =>
    api._req(`/admin/content/submissions/${submissionId}/feedback`, {
      method: 'PUT',
      body: { feedback },
    }),
};

// ─── UI primitives ──────────────────────────────────────────
export function Card({ children, style, dim }) {
  return (
    <div
      style={{
        background: BRAND.card,
        borderRadius: 10,
        padding: 18,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        border: `1px solid ${BRAND.line}`,
        opacity: dim ? 0.6 : 1,
        transition: 'opacity .15s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CenteredMessage({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: BRAND.bg,
        padding: 24,
        color: BRAND.sub,
      }}
    >
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: BRAND.sub,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function ProgressBar({ pct, thin }) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return (
    <div
      style={{
        height: thin ? 4 : 8,
        background: '#eee',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          background: BRAND.pink,
          transition: 'width .3s',
        }}
      />
    </div>
  );
}

export function GateBadge({ unlocked, accessible, small }) {
  const size = small ? { padding: '2px 8px', fontSize: 11 } : { padding: '4px 10px', fontSize: 12 };
  if (unlocked) return <span style={{ ...pillStyle(BRAND.ok, BRAND.okBg), ...size }}>Unlocked</span>;
  if (!accessible)
    return <span style={{ ...pillStyle('#9ca3af', '#f3f4f6'), ...size }}>🔒 Prerequisite locked</span>;
  return <span style={{ ...pillStyle(BRAND.warn, BRAND.warnBg), ...size }}>Awaiting mentor check-in</span>;
}

export function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        background: checked ? BRAND.pink : '#d1d5db',
        position: 'relative',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: 0,
        transition: 'background .15s',
        opacity: disabled ? 0.5 : 1,
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          background: '#fff',
          borderRadius: '50%',
          transition: 'left .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

export function Th({ children }) {
  return (
    <th
      style={{
        padding: '10px 14px',
        fontSize: 12,
        fontWeight: 600,
        color: BRAND.sub,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}
    >
      {children}
    </th>
  );
}
export function Td({ children, style }) {
  return <td style={{ padding: '12px 14px', fontSize: 13, ...style }}>{children}</td>;
}

// ─── Style tokens & helpers ─────────────────────────────────
export const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: `1px solid ${BRAND.line}`,
  borderRadius: 6,
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};

export const btnBase = {
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  padding: '10px 16px',
  fontSize: 14,
  transition: 'opacity .15s',
};
export const btnPrimary   = { ...btnBase, background: BRAND.pink,  color: '#fff' };
export const btnSecondary = { ...btnBase, background: '#e5e7eb',   color: BRAND.ink };
export const btnGhost     = { ...btnBase, background: 'transparent', color: BRAND.pink, padding: '6px 10px' };

export function pillStyle(fg, bg) {
  return {
    background: bg,
    color: fg,
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 11,
    padding: '2px 8px',
    display: 'inline-block',
  };
}
export function pill(bg, fg) {
  return {
    background: bg,
    color: fg,
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 11,
    padding: '3px 10px',
    display: 'inline-block',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  };
}

export function statusColor(status) {
  return (
    { active: BRAND.ok, paused: BRAND.warn, completed: '#6366f1', withdrawn: BRAND.danger }[status] ||
    BRAND.sub
  );
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
