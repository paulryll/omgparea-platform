// client/src/App.jsx
// -----------------------------------------------------------
// OMG PAREA — Phase 1 UI
// Three screens: Login, StudentDashboard, AdminDashboard.
// Inline styles throughout to keep this a single-file scaffold.
// -----------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';

// ─── Brand palette (Oscar Mike) ──────────────────────────────
const BRAND = {
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

// ─── API layer ───────────────────────────────────────────────
const TOKEN_KEY = 'omgparea_token';

const api = {
  _token: () => localStorage.getItem(TOKEN_KEY),
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
  login:             (username, password) => api._req('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me:                () => api._req('/auth/me'),
  studentDashboard:  () => api._req('/students/me/dashboard'),
  adminRoster:       () => api._req('/admin/students'),
  adminStudent:      (id) => api._req(`/admin/students/${id}`),
  unlockGate:        (gateId, note) => api._req(`/admin/gates/${gateId}/unlock`, { method: 'POST', body: { note } }),
  lockGate:          (gateId) => api._req(`/admin/gates/${gateId}/lock`, { method: 'POST' }),
  toggleModule:      (studentId, moduleId, enabled) =>
                       api._req(`/admin/students/${studentId}/modules/${moduleId}/toggle`, { method: 'POST', body: { enabled } }),
};

// ─── Root App ────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const refreshMe = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) { setUser(null); setLoading(false); return; }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  const handleLogin = async (username, password) => {
    setAuthError('');
    try {
      const { token, user } = await api.login(username, password);
      localStorage.setItem(TOKEN_KEY, token);
      setUser(user);
    } catch (e) {
      setAuthError(e.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  if (loading) return <CenteredMessage>Loading…</CenteredMessage>;
  if (!user)   return <Login onLogin={handleLogin} error={authError} />;

  if (user.role === 'student') return <StudentDashboard user={user} onLogout={handleLogout} />;
  if (user.role === 'admin' || user.role === 'super_admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }
  return <CenteredMessage>Unrecognized role: {user.role}</CenteredMessage>;
}

// ─── Login ───────────────────────────────────────────────────
function Login({ onLogin, error }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await onLogin(u.trim(), p);
    setBusy(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: BRAND.bg, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: BRAND.card, borderRadius: 12,
                    padding: 32, boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: BRAND.black, letterSpacing: -0.5 }}>
            OMG <span style={{ color: BRAND.pink }}>PAREA</span>
          </div>
          <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 4 }}>
            Residential Appraiser Training Platform
          </div>
        </div>

        <Field label="Username">
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={inputStyle}
            autoFocus
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={inputStyle}
          />
        </Field>

        {error && (
          <div style={{ marginTop: 12, color: BRAND.danger, fontSize: 13, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={busy || !u || !p}
                style={{ ...btnPrimary, width: '100%', marginTop: 16 }}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <div style={{ marginTop: 20, fontSize: 11, color: BRAND.sub, textAlign: 'center', lineHeight: 1.6 }}>
          Demo: <code>admin / admin123</code> · <code>jsmith / student123</code>
        </div>
      </div>
    </div>
  );
}

// ─── Student Dashboard ───────────────────────────────────────
function StudentDashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.studentDashboard().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err)   return <CenteredMessage>Error: {err}</CenteredMessage>;
  if (!data) return <CenteredMessage>Loading your program…</CenteredMessage>;

  const unlockedCount = data.modules.reduce((n, m) => {
    if (m.code === 'M2') return n + (m.sections?.filter((s) => s.gate?.unlocked).length || 0);
    return n + (m.gate?.unlocked ? 1 : 0);
  }, 0);
  const totalGates = data.modules.reduce((n, m) => {
    if (m.code === 'M2') return n + (m.sections?.length || 0);
    return n + 1;
  }, 0);

  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      subtitle="Your Program"
    >
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Welcome, {user.firstName}</h2>
          <div style={{ color: BRAND.sub, fontSize: 13 }}>
            {unlockedCount} / {totalGates} gates unlocked
          </div>
        </div>
        <ProgressBar pct={(unlockedCount / totalGates) * 100} />
        <div style={{ color: BRAND.sub, fontSize: 13, marginTop: 10 }}>
          Each module is gated. Complete the work, check in with your mentor, and your mentor will unlock the next step.
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {data.modules.map((m) => <StudentModuleCard key={m.id} m={m} />)}
      </div>
    </AppShell>
  );
}

function StudentModuleCard({ m }) {
  const isM2 = m.code === 'M2';
  const accessible = isM2 ? true : m.accessible; // M2 itself is always visible; its sections gate individually
  const unlocked = isM2 ? null : m.gate?.unlocked;

  return (
    <Card dim={!accessible}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={pill(BRAND.black, '#fff')}>Module {m.order}</span>
            <h3 style={{ margin: 0, fontSize: 17 }}>{m.name}</h3>
          </div>
          <div style={{ color: BRAND.sub, fontSize: 13, marginTop: 6 }}>{m.description}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {!isM2 && <GateBadge unlocked={unlocked} accessible={accessible} />}
        </div>
      </div>

      {isM2 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${BRAND.line}`, paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.sub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            11 Exercise Sections
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {m.sections.map((s) => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', background: s.accessible ? '#fafafa' : '#f3f4f6',
                borderRadius: 6, opacity: s.accessible ? 1 : 0.6,
              }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: BRAND.sub, marginRight: 8 }}>{s.order}.</span>
                  {s.name}
                </div>
                <GateBadge unlocked={s.gate?.unlocked} accessible={s.accessible} small />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────
function AdminDashboard({ user, onLogout }) {
  const [roster, setRoster] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [err, setErr] = useState('');

  const loadRoster = useCallback(() => {
    api.adminRoster().then((r) => setRoster(r.students)).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  if (err) return <CenteredMessage>Error: {err}</CenteredMessage>;

  return (
    <AppShell user={user} onLogout={onLogout} subtitle="Admin · Mentor">
      {selectedId == null ? (
        <>
          <Card>
            <h2 style={{ margin: 0, fontSize: 20 }}>Student Roster</h2>
            <div style={{ color: BRAND.sub, fontSize: 13, marginTop: 4 }}>
              Click a student to review progress, unlock gates, or toggle modules.
            </div>
          </Card>

          <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
            {roster == null ? (
              <div style={{ padding: 24, color: BRAND.sub }}>Loading roster…</div>
            ) : roster.length === 0 ? (
              <div style={{ padding: 24, color: BRAND.sub }}>No students yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                    <Th>Student</Th>
                    <Th>Username</Th>
                    <Th>Status</Th>
                    <Th>Gates Unlocked</Th>
                    <Th>Modules Enabled</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s.id} style={{ borderTop: `1px solid ${BRAND.line}`, cursor: 'pointer' }}
                        onClick={() => setSelectedId(s.id)}>
                      <Td><strong>{s.first_name} {s.last_name}</strong><div style={{ fontSize: 11, color: BRAND.sub }}>{s.email}</div></Td>
                      <Td><code style={{ fontSize: 12 }}>{s.username}</code></Td>
                      <Td><span style={pill(statusColor(s.status), '#fff')}>{s.status}</span></Td>
                      <Td>
                        <div style={{ fontSize: 13 }}>{s.gates_unlocked} / {s.gates_total}</div>
                        <div style={{ width: 120, marginTop: 4 }}>
                          <ProgressBar pct={(s.gates_unlocked / Math.max(1, s.gates_total)) * 100} thin />
                        </div>
                      </Td>
                      <Td>{s.modules_enabled} / 9</Td>
                      <Td style={{ color: BRAND.pink, fontWeight: 600 }}>Review →</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : (
        <StudentDetail
          studentId={selectedId}
          onBack={() => { setSelectedId(null); loadRoster(); }}
        />
      )}
    </AppShell>
  );
}

function StudentDetail({ studentId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState('');
  const [busyGate, setBusyGate] = useState(null);
  const [busyToggle, setBusyToggle] = useState(null);

  const load = useCallback(() => {
    setErr('');
    api.adminStudent(studentId).then(setDetail).catch((e) => setErr(e.message));
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const toggleGate = async (gate) => {
    setBusyGate(gate.id);
    try {
      if (gate.unlocked) await api.lockGate(gate.id);
      else                await api.unlockGate(gate.id, 'Unlocked via admin dashboard');
      load();
    } catch (e) { setErr(e.message); }
    finally     { setBusyGate(null); }
  };

  const toggleModule = async (moduleId, enabled) => {
    setBusyToggle(moduleId);
    try {
      await api.toggleModule(studentId, moduleId, enabled);
      load();
    } catch (e) { setErr(e.message); }
    finally     { setBusyToggle(null); }
  };

  if (err)      return <CenteredMessage>Error: {err} <button onClick={onBack} style={{ ...btnGhost, marginLeft: 8 }}>Back</button></CenteredMessage>;
  if (!detail)  return <CenteredMessage>Loading student…</CenteredMessage>;

  const { student, modules } = detail;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← Back to Roster</button>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>{student.first_name} {student.last_name}</h2>
            <div style={{ color: BRAND.sub, fontSize: 13, marginTop: 2 }}>
              {student.email} · <code>{student.username}</code>
            </div>
          </div>
          <span style={pill(statusColor(student.status), '#fff')}>{student.status}</span>
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {modules.map((m) => (
          <AdminModuleCard
            key={m.id}
            m={m}
            onToggleGate={toggleGate}
            onToggleModule={toggleModule}
            busyGate={busyGate}
            busyToggle={busyToggle}
          />
        ))}
      </div>
    </>
  );
}

function AdminModuleCard({ m, onToggleGate, onToggleModule, busyGate, busyToggle }) {
  const isM2 = m.code === 'M2';

  return (
    <Card dim={!m.enabled}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={pill(BRAND.black, '#fff')}>Module {m.order}</span>
            <h3 style={{ margin: 0, fontSize: 17 }}>{m.name}</h3>
            {!m.enabled && <span style={pill(BRAND.warn, '#fff')}>Hidden from student</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: BRAND.sub }}>Visible:</span>
          <Toggle
            checked={m.enabled}
            disabled={busyToggle === m.id}
            onChange={(next) => onToggleModule(m.id, next)}
          />
          {!isM2 && m.gate && (
            <GateButton
              gate={m.gate}
              busy={busyGate === m.gate.id}
              onClick={() => onToggleGate(m.gate)}
            />
          )}
        </div>
      </div>

      {isM2 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${BRAND.line}`, paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.sub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            11 Exercise Section Gates
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {m.sections.map((s) => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                padding: '8px 10px', background: '#fafafa', borderRadius: 6,
              }}>
                <div style={{ fontSize: 13, minWidth: 0, flex: 1 }}>
                  <span style={{ color: BRAND.sub, marginRight: 8 }}>{s.order}.</span>
                  {s.name}
                  {s.gate?.unlockedBy && s.gate?.unlocked && (
                    <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 2 }}>
                      Unlocked by {s.gate.unlockedBy} · {formatDate(s.gate.unlockedAt)}
                    </div>
                  )}
                </div>
                {s.gate && (
                  <GateButton
                    gate={s.gate}
                    busy={busyGate === s.gate.id}
                    onClick={() => onToggleGate(s.gate)}
                    small
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isM2 && m.gate?.unlockedBy && m.gate?.unlocked && (
        <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 10 }}>
          Unlocked by {m.gate.unlockedBy} · {formatDate(m.gate.unlockedAt)}
        </div>
      )}
    </Card>
  );
}

// ─── Shared UI pieces ────────────────────────────────────────
function AppShell({ user, onLogout, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', background: BRAND.bg }}>
      <header style={{
        background: BRAND.black, color: '#fff', padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>
            OMG <span style={{ color: BRAND.pink }}>PAREA</span>
          </div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, textAlign: 'right' }}>
            <div>{user.firstName} {user.lastName}</div>
            <div style={{ fontSize: 11, color: '#bbb' }}>{user.organization?.name}</div>
          </div>
          <button onClick={onLogout} style={{
            background: 'transparent', color: '#fff', border: '1px solid #444',
            padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}>
            Sign out
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 40px' }}>
        {children}
      </main>
    </div>
  );
}

function Card({ children, style, dim }) {
  return (
    <div style={{
      background: BRAND.card,
      borderRadius: 10,
      padding: 18,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      border: `1px solid ${BRAND.line}`,
      opacity: dim ? 0.6 : 1,
      transition: 'opacity .15s',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CenteredMessage({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: BRAND.bg, padding: 24, color: BRAND.sub }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: BRAND.sub,
                      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ProgressBar({ pct, thin }) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return (
    <div style={{ height: thin ? 4 : 8, background: '#eee', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${clamped}%`, height: '100%', background: BRAND.pink, transition: 'width .3s' }} />
    </div>
  );
}

function GateBadge({ unlocked, accessible, small }) {
  const size = small ? { padding: '2px 8px', fontSize: 11 } : { padding: '4px 10px', fontSize: 12 };
  if (unlocked)    return <span style={{ ...pillStyle(BRAND.ok, BRAND.okBg), ...size }}>Unlocked</span>;
  if (!accessible) return <span style={{ ...pillStyle('#9ca3af', '#f3f4f6'), ...size }}>🔒 Prerequisite locked</span>;
  return <span style={{ ...pillStyle(BRAND.warn, BRAND.warnBg), ...size }}>Awaiting mentor check-in</span>;
}

function GateButton({ gate, busy, onClick, small }) {
  const unlocked = gate.unlocked;
  const style = {
    ...(unlocked ? btnSecondary : btnPrimary),
    padding: small ? '6px 12px' : '8px 16px',
    fontSize: small ? 12 : 13,
    whiteSpace: 'nowrap',
    opacity: busy ? 0.5 : 1,
  };
  return (
    <button onClick={onClick} disabled={busy} style={style}>
      {busy ? '…' : (unlocked ? 'Lock' : 'Unlock')}
    </button>
  );
}

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 40, height: 22, borderRadius: 999,
        background: checked ? BRAND.pink : '#d1d5db',
        position: 'relative', border: 'none', cursor: disabled ? 'default' : 'pointer',
        padding: 0, transition: 'background .15s', opacity: disabled ? 0.5 : 1,
      }}
      aria-pressed={checked}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 20 : 2,
        width: 18, height: 18, background: '#fff', borderRadius: '50%',
        transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function Th({ children }) {
  return <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: BRAND.sub,
                      textTransform: 'uppercase', letterSpacing: 0.4 }}>{children}</th>;
}
function Td({ children, style }) {
  return <td style={{ padding: '12px 14px', fontSize: 13, ...style }}>{children}</td>;
}

// ─── Styles & helpers ────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: `1px solid ${BRAND.line}`, borderRadius: 6,
  background: '#fff', boxSizing: 'border-box', outline: 'none',
};

const btnBase = {
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
  padding: '10px 16px', fontSize: 14, transition: 'opacity .15s',
};
const btnPrimary   = { ...btnBase, background: BRAND.pink,  color: '#fff' };
const btnSecondary = { ...btnBase, background: '#e5e7eb',   color: BRAND.ink };
const btnGhost     = { ...btnBase, background: 'transparent', color: BRAND.pink, padding: '6px 10px' };

function pillStyle(fg, bg) {
  return { background: bg, color: fg, borderRadius: 999, fontWeight: 600,
           fontSize: 11, padding: '2px 8px', display: 'inline-block' };
}
function pill(bg, fg) {
  return { background: bg, color: fg, borderRadius: 999, fontWeight: 600,
           fontSize: 11, padding: '3px 10px', display: 'inline-block',
           textTransform: 'uppercase', letterSpacing: 0.3 };
}

function statusColor(status) {
  return { active: BRAND.ok, paused: BRAND.warn, completed: '#6366f1', withdrawn: BRAND.danger }[status] || BRAND.sub;
}

function formatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
}
