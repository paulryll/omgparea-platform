// client/src/App.jsx
// -----------------------------------------------------------
// OMG PAREA — root application.
//
// Responsibilities:
//   - Auth bootstrap (try /me on mount; redirect to login
//     if no token).
//   - Role-based screen routing (student vs admin).
//   - Student dashboard with in-app navigation into Section
//     content (delegated to content-views.jsx).
//   - Admin dashboard with roster, gate/module management,
//     and (new in Step 1D) per-student work review flow.
//
// Shared building blocks (BRAND, api client, Card, etc.) live
// in ui.jsx. Content screens (student + admin review) live in
// content-views.jsx.
// -----------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import {
  BRAND,
  api,
  Card,
  CenteredMessage,
  Field,
  ProgressBar,
  GateBadge,
  Toggle,
  Th,
  Td,
  inputStyle,
  btnPrimary,
  btnSecondary,
  btnGhost,
  pill,
  statusColor,
  formatDate,
} from './ui.jsx';
import {
  SectionView,
  CategoryView,
  ScenarioView,
  StudentReviewView,
  SectionReviewView,
  SubmissionReviewView,
} from './content-views.jsx';

// ─── Root App ───────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const refreshMe = useCallback(async () => {
    const t = api._token();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      api._clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const handleLogin = async (username, password) => {
    setAuthError('');
    try {
      const { token, user } = await api.login(username, password);
      api._setToken(token);
      setUser(user);
    } catch (e) {
      setAuthError(e.message);
    }
  };

  const handleLogout = () => {
    api._clearToken();
    setUser(null);
  };

  if (loading) return <CenteredMessage>Loading…</CenteredMessage>;
  if (!user) return <Login onLogin={handleLogin} error={authError} />;

  if (user.role === 'student') return <StudentDashboard user={user} onLogout={handleLogout} />;
  if (user.role === 'admin' || user.role === 'super_admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }
  return <CenteredMessage>Unrecognized role: {user.role}</CenteredMessage>;
}

// ─── Login ──────────────────────────────────────────────────
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
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: BRAND.bg,
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: BRAND.card,
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
        }}
      >
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

        <button
          onClick={submit}
          disabled={busy || !u || !p}
          style={{ ...btnPrimary, width: '100%', marginTop: 16 }}
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <div
          style={{
            marginTop: 20,
            fontSize: 11,
            color: BRAND.sub,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Demo: <code>admin / admin123</code> · <code>jsmith / student123</code>
        </div>
      </div>
    </div>
  );
}

// ─── Student Dashboard ──────────────────────────────────────
function StudentDashboard({ user, onLogout }) {
  // route shape: { view: 'dashboard' | 'section' | 'category' | 'scenario', ...context }
  const [route, setRoute] = useState({ view: 'dashboard' });

  const subtitle = {
    dashboard: 'Your Program',
    section:   'Exercise Section',
    category:  'Category',
    scenario:  'Scenario',
  }[route.view];

  let content;
  if (route.view === 'dashboard') {
    content = (
      <DashboardView
        user={user}
        onOpenSection={(code) => setRoute({ view: 'section', sectionCode: code })}
      />
    );
  } else if (route.view === 'section') {
    content = (
      <SectionView
        sectionCode={route.sectionCode}
        onBack={() => setRoute({ view: 'dashboard' })}
        onOpenCategory={(catId) =>
          setRoute({ view: 'category', categoryId: catId, sectionCode: route.sectionCode })
        }
      />
    );
  } else if (route.view === 'category') {
    content = (
      <CategoryView
        categoryId={route.categoryId}
        sectionCode={route.sectionCode}
        onBack={() => setRoute({ view: 'section', sectionCode: route.sectionCode })}
        onOpenScenario={(id) =>
          setRoute({
            view: 'scenario',
            scenarioId: id,
            categoryId: route.categoryId,
            sectionCode: route.sectionCode,
          })
        }
      />
    );
  } else if (route.view === 'scenario') {
    content = (
      <ScenarioView
        scenarioId={route.scenarioId}
        onBack={() =>
          setRoute({
            view: 'category',
            categoryId: route.categoryId,
            sectionCode: route.sectionCode,
          })
        }
      />
    );
  }

  return (
    <AppShell user={user} onLogout={onLogout} subtitle={subtitle}>
      {content}
    </AppShell>
  );
}

// ─── Dashboard view (the default student landing) ──────────
function DashboardView({ user, onOpenSection }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.studentDashboard().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err)   return <Card style={{ color: BRAND.danger }}>Error: {err}</Card>;
  if (!data) return <Card style={{ color: BRAND.sub }}>Loading your program…</Card>;

  const unlockedCount = data.modules.reduce((n, m) => {
    if (m.code === 'M2') return n + (m.sections?.filter((s) => s.gate?.unlocked).length || 0);
    return n + (m.gate?.unlocked ? 1 : 0);
  }, 0);
  const totalGates = data.modules.reduce((n, m) => {
    if (m.code === 'M2') return n + (m.sections?.length || 0);
    return n + 1;
  }, 0);

  return (
    <>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>Welcome, {user.firstName}</h2>
          <div style={{ color: BRAND.sub, fontSize: 13 }}>
            {unlockedCount} / {totalGates} gates unlocked
          </div>
        </div>
        <ProgressBar pct={(unlockedCount / totalGates) * 100} />
        <div style={{ color: BRAND.sub, fontSize: 13, marginTop: 10 }}>
          Each module is gated. Complete the work, check in with your mentor, and your mentor will
          unlock the next step.
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {data.modules.map((m) => (
          <StudentModuleCard key={m.id} m={m} onOpenSection={onOpenSection} />
        ))}
      </div>
    </>
  );
}

function StudentModuleCard({ m, onOpenSection }) {
  const isM2 = m.code === 'M2';
  const accessible = isM2 ? true : m.accessible;

  return (
    <Card dim={!accessible}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={pill(BRAND.black, '#fff')}>Module {m.order}</span>
            <h3 style={{ margin: 0, fontSize: 17 }}>{m.name}</h3>
          </div>
          <div style={{ color: BRAND.sub, fontSize: 13, marginTop: 6 }}>{m.description}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {!isM2 && <GateBadge unlocked={m.gate?.unlocked} accessible={accessible} />}
        </div>
      </div>

      {isM2 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${BRAND.line}`, paddingTop: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: BRAND.sub,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            11 Exercise Sections
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {m.sections.map((s) => (
              <SectionRow key={s.id} s={s} onOpenSection={onOpenSection} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function SectionRow({ s, onOpenSection }) {
  const clickable = s.accessible;
  return (
    <div
      onClick={() => clickable && onOpenSection(s.code)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        background: clickable ? '#fafafa' : '#f3f4f6',
        borderRadius: 6,
        opacity: clickable ? 1 : 0.6,
        cursor: clickable ? 'pointer' : 'default',
        border: clickable ? `1px solid ${BRAND.line}` : '1px solid transparent',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => clickable && (e.currentTarget.style.background = '#fff')}
      onMouseLeave={(e) => clickable && (e.currentTarget.style.background = '#fafafa')}
    >
      <div style={{ fontSize: 13 }}>
        <span style={{ color: BRAND.sub, marginRight: 8 }}>{s.order}.</span>
        {s.name}
        {clickable && (
          <span style={{ marginLeft: 8, color: BRAND.pink, fontSize: 12 }}>→</span>
        )}
      </div>
      <GateBadge unlocked={s.gate?.unlocked} accessible={s.accessible} small />
    </div>
  );
}

// ─── Admin Dashboard ────────────────────────────────────────
// route shape:
//   { view: 'roster' }
//   { view: 'studentDetail',    studentId }
//   { view: 'studentReview',    studentId }
//   { view: 'sectionReview',    studentId, sectionCode }
//   { view: 'submissionReview', studentId, sectionCode, submissionId }
function AdminDashboard({ user, onLogout }) {
  const [roster, setRoster] = useState(null);
  const [route, setRoute] = useState({ view: 'roster' });
  const [err, setErr] = useState('');

  const loadRoster = useCallback(() => {
    api.adminRoster()
      .then((r) => setRoster(r.students))
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  if (err) return <CenteredMessage>Error: {err}</CenteredMessage>;

  const subtitle = {
    roster:           'Admin · Mentor',
    studentDetail:    'Admin · Gates & Modules',
    studentReview:    'Admin · Review Work',
    sectionReview:    'Admin · Section Review',
    submissionReview: 'Admin · Submission Review',
  }[route.view] || 'Admin';

  let content;
  if (route.view === 'roster') {
    content = (
      <RosterView
        roster={roster}
        onOpenDetail={(studentId) => setRoute({ view: 'studentDetail', studentId })}
        onOpenReview={(studentId) => setRoute({ view: 'studentReview', studentId })}
      />
    );
  } else if (route.view === 'studentDetail') {
    content = (
      <StudentDetail
        studentId={route.studentId}
        onBack={() => {
          setRoute({ view: 'roster' });
          loadRoster();
        }}
      />
    );
  } else if (route.view === 'studentReview') {
    content = (
      <StudentReviewView
        studentId={route.studentId}
        onBack={() => {
          setRoute({ view: 'roster' });
          loadRoster();
        }}
        onOpenSection={(sectionCode) =>
          setRoute({ view: 'sectionReview', studentId: route.studentId, sectionCode })
        }
      />
    );
  } else if (route.view === 'sectionReview') {
    content = (
      <SectionReviewView
        studentId={route.studentId}
        sectionCode={route.sectionCode}
        onBack={() => setRoute({ view: 'studentReview', studentId: route.studentId })}
        onOpenSubmission={(submissionId) =>
          setRoute({
            view: 'submissionReview',
            studentId: route.studentId,
            sectionCode: route.sectionCode,
            submissionId,
          })
        }
      />
    );
  } else if (route.view === 'submissionReview') {
    content = (
      <SubmissionReviewView
        submissionId={route.submissionId}
        onBack={() =>
          setRoute({
            view: 'sectionReview',
            studentId: route.studentId,
            sectionCode: route.sectionCode,
          })
        }
      />
    );
  }

  return (
    <AppShell user={user} onLogout={onLogout} subtitle={subtitle}>
      {content}
    </AppShell>
  );
}

// ─── Roster (the table) ─────────────────────────────────────
function RosterView({ roster, onOpenDetail, onOpenReview }) {
  return (
    <>
      <Card>
        <h2 style={{ margin: 0, fontSize: 20 }}>Student Roster</h2>
        <div style={{ color: BRAND.sub, fontSize: 13, marginTop: 4 }}>
          Click <strong>Review Work</strong> to grade a student's submissions. Click{' '}
          <strong>Gates</strong> to manage gate unlocks and module visibility.
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
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${BRAND.line}` }}>
                  <Td>
                    <strong>
                      {s.first_name} {s.last_name}
                    </strong>
                    <div style={{ fontSize: 11, color: BRAND.sub }}>{s.email}</div>
                  </Td>
                  <Td>
                    <code style={{ fontSize: 12 }}>{s.username}</code>
                  </Td>
                  <Td>
                    <span style={pill(statusColor(s.status), '#fff')}>{s.status}</span>
                  </Td>
                  <Td>
                    <div style={{ fontSize: 13 }}>
                      {s.gates_unlocked} / {s.gates_total}
                    </div>
                    <div style={{ width: 120, marginTop: 4 }}>
                      <ProgressBar
                        pct={(s.gates_unlocked / Math.max(1, s.gates_total)) * 100}
                        thin
                      />
                    </div>
                  </Td>
                  <Td>{s.modules_enabled} / 9</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => onOpenReview(s.id)}
                        style={{
                          ...btnPrimary,
                          padding: '6px 12px',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Review Work
                      </button>
                      <button
                        onClick={() => onOpenDetail(s.id)}
                        style={{
                          ...btnSecondary,
                          padding: '6px 12px',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Gates
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

// ─── Student detail (gates & modules management) ───────────
function StudentDetail({ studentId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState('');
  const [busyGate, setBusyGate] = useState(null);
  const [busyToggle, setBusyToggle] = useState(null);

  const load = useCallback(() => {
    setErr('');
    api.adminStudent(studentId).then(setDetail).catch((e) => setErr(e.message));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleGate = async (gate) => {
    setBusyGate(gate.id);
    try {
      if (gate.unlocked) await api.lockGate(gate.id);
      else               await api.unlockGate(gate.id, 'Unlocked via admin dashboard');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyGate(null);
    }
  };

  const toggleModule = async (moduleId, enabled) => {
    setBusyToggle(moduleId);
    try {
      await api.toggleModule(studentId, moduleId, enabled);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyToggle(null);
    }
  };

  if (err)
    return (
      <CenteredMessage>
        Error: {err}{' '}
        <button onClick={onBack} style={{ ...btnGhost, marginLeft: 8 }}>
          Back
        </button>
      </CenteredMessage>
    );
  if (!detail) return <CenteredMessage>Loading student…</CenteredMessage>;

  const { student, modules } = detail;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>
          ← Back to Roster
        </button>
      </div>

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {student.first_name} {student.last_name}
            </h2>
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
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
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: BRAND.sub,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            11 Exercise Section Gates
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {m.sections.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 10px',
                  background: '#fafafa',
                  borderRadius: 6,
                }}
              >
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
      {busy ? '…' : unlocked ? 'Lock' : 'Unlock'}
    </button>
  );
}

// ─── App Shell (shared chrome) ──────────────────────────────
function AppShell({ user, onLogout, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', background: BRAND.bg }}>
      <header
        style={{
          background: BRAND.black,
          color: '#fff',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>
            OMG <span style={{ color: BRAND.pink }}>PAREA</span>
          </div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, textAlign: 'right' }}>
            <div>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: 11, color: '#bbb' }}>{user.organization?.name}</div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #444',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
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
