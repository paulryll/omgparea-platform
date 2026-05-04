// client/src/content-views.jsx
// -----------------------------------------------------------
// Content-related screens.
//
// Student screens (unchanged from Step 1C):
//   SectionView        → section landing with 6 category tiles
//   CategoryView       → list of scenarios with submission status
//   ScenarioView       → scenario detail: narrative + 9-field form
//                        that locks on submit and reveals model answers
//
// Admin review screens (new in Step 1D):
//   StudentReviewView  → per-student list of reviewable sections
//   SectionReviewView  → scenarios grouped by category with status badges
//   SubmissionReviewView → side-by-side student vs model answers +
//                          instructor feedback textarea
//
// Navigation is controlled by parents (StudentDashboard / AdminDashboard
// in App.jsx) via onBack / onOpenX callbacks — no router needed.
// -----------------------------------------------------------

import { useEffect, useState } from 'react';
import {
  BRAND,
  api,
  Card,
  formatDate,
  btnPrimary,
  btnGhost,
  pill,
  pillStyle,
} from './ui.jsx';
import {
  FieldRenderer,
  blankAnswerFor,
  isAnswerComplete,
  submitValueFor,
} from './field-types.jsx';

// ═══════════════════════════════════════════════════════════
// STUDENT SCREENS
// ═══════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────
// Section landing: shows the section's category tiles
// ───────────────────────────────────────────────────────────
export function SectionView({ sectionCode, onBack, onOpenCategory }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    setErr('');
    api.sectionStructure(sectionCode).then(setData).catch((e) => setErr(e.message));
  }, [sectionCode]);

  if (err)   return <BackShell onBack={onBack} backLabel="Back to Your Program">Error: {err}</BackShell>;
  if (!data) return <BackShell onBack={onBack} backLabel="Back to Your Program">Loading section…</BackShell>;

  const { section, categories } = data;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← Back to Your Program</button>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={pill(BRAND.black, '#fff')}>{section.code}</span>
          <h2 style={{ margin: 0, fontSize: 22 }}>{section.name}</h2>
        </div>
        <div style={{ color: BRAND.sub, fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>
          Select a category below to begin. Each category contains a set of scenarios in
          ascending difficulty. Your answers are saved permanently when you submit, and the
          model answers are revealed immediately afterward for self-study.
        </div>
      </Card>

      {categories.length === 0 ? (
        <Card style={{ marginTop: 12, color: BRAND.sub }}>
          Content for this section has not been imported yet. Check back soon, or reach out to your mentor.
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            marginTop: 16,
          }}
        >
          {categories.map((c) => (
            <CategoryTile key={c.id} category={c} onOpen={() => onOpenCategory(c.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function CategoryTile({ category, onOpen }) {
  const bg = category.colorPrimary || BRAND.black;
  const accent = category.colorAccent || BRAND.pinkDk;
  return (
    <button
      onClick={onOpen}
      style={{
        background: `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)`,
        color: '#fff',
        borderRadius: 10,
        padding: 20,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Category {category.order}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{category.name}</div>
      <div style={{ fontSize: 12, marginTop: 12, opacity: 0.9 }}>Open scenarios →</div>
    </button>
  );
}

// ───────────────────────────────────────────────────────────
// Category view: scenario list with submission status
// ───────────────────────────────────────────────────────────
export function CategoryView({ categoryId, sectionCode, onBack, onOpenScenario }) {
  const [scenarios, setScenarios] = useState(null);
  const [structure, setStructure] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setScenarios(null);
    setStructure(null);
    setErr('');
    Promise.all([
      api.categoryScenarios(categoryId),
      api.sectionStructure(sectionCode),
    ])
      .then(([scRes, strRes]) => {
        setScenarios(scRes.scenarios);
        setStructure(strRes);
      })
      .catch((e) => setErr(e.message));
  }, [categoryId, sectionCode]);

  const backLabel = structure ? `Back to ${structure.section.name}` : 'Back';

  if (err)                      return <BackShell onBack={onBack} backLabel={backLabel}>Error: {err}</BackShell>;
  if (!scenarios || !structure) return <BackShell onBack={onBack} backLabel={backLabel}>Loading category…</BackShell>;

  const category = structure.categories.find((c) => c.id === categoryId);
  const bg = category?.colorPrimary || BRAND.black;
  const accent = category?.colorAccent || BRAND.pinkDk;
  const submittedCount = scenarios.filter((s) => s.submission).length;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← {backLabel}</button>
      </div>

      <Card
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)`,
          color: '#fff',
          border: 'none',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {structure.section.code} · {structure.section.name}
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>{category?.name}</h2>
        <div style={{ fontSize: 13, marginTop: 10, opacity: 0.9 }}>
          {submittedCount} of {scenarios.length} scenarios submitted
        </div>
      </Card>

      {scenarios.length === 0 ? (
        <Card style={{ marginTop: 12, color: BRAND.sub }}>
          No scenarios have been imported for this category yet. More content coming soon.
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
          {scenarios.map((s) => (
            <ScenarioRow
              key={s.id}
              s={s}
              categoryColor={bg}
              onOpen={() => onOpenScenario(s.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ScenarioRow({ s, categoryColor, onOpen }) {
  const submitted = s.submission != null;
  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        background: BRAND.card,
        color: BRAND.ink,
        border: `1px solid ${BRAND.line}`,
        borderLeft: `4px solid ${categoryColor}`,
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#fafafa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = BRAND.card;
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: BRAND.sub, fontSize: 13, fontWeight: 600 }}>#{s.order}</span>
          <span style={pillStyle(difficultyColor(s.difficulty), difficultyBg(s.difficulty))}>
            {s.difficulty}
          </span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</span>
        </div>
        {submitted && (
          <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 4 }}>
            Submitted {formatDate(s.submission.submittedAt)} ·{' '}
            {Math.max(1, Math.round(s.submission.timeSpentSec / 60))} min
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 12 }}>
        {submitted ? (
          <span style={pillStyle(BRAND.ok, BRAND.okBg)}>✓ Submitted</span>
        ) : (
          <span style={pillStyle(BRAND.warn, BRAND.warnBg)}>Pending</span>
        )}
      </div>
    </button>
  );
}

function difficultyColor(d) {
  return (
    {
      basic: '#0891b2',
      intermediate: '#0284c7',
      advanced: '#7c3aed',
      expert: '#be185d',
    }[d] || BRAND.sub
  );
}
function difficultyBg(d) {
  return (
    {
      basic: '#ecfeff',
      intermediate: '#e0f2fe',
      advanced: '#f3e8ff',
      expert: '#fce7f3',
    }[d] || '#f3f4f6'
  );
}

// ───────────────────────────────────────────────────────────
// Scenario detail: narrative + 9-field input form, lock-on-submit
// ───────────────────────────────────────────────────────────
export function ScenarioView({ scenarioId, onBack }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [answers, setAnswers] = useState({}); // fieldKey → text
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [startTime] = useState(() => Date.now());
  // Set after a successful just-now submission so the page can flip
  // into locked view without re-fetching.
  const [submittedPayload, setSubmittedPayload] = useState(null);

  useEffect(() => {
    setData(null);
    setErr('');
    setSubmittedPayload(null);
    api.scenario(scenarioId)
      .then((res) => {
        setData(res);
        if (res.submission?.answers) {
          // Restore from server: each entry is { text, data }.
          // For text fields we want the plain string; for structured
          // fields we want the data object (with text merged in if present).
          const restored = {};
          for (const f of res.fields) {
            const a = res.submission.answers[f.key];
            if (!a) {
              restored[f.key] = blankAnswerFor(f);
            } else if (f.type === 'text' || !f.type) {
              restored[f.key] = a.text || '';
            } else {
              restored[f.key] = { ...(a.data || {}), text: a.text || '' };
            }
          }
          setAnswers(restored);
        } else {
          const blank = {};
          res.fields.forEach((f) => {
            blank[f.key] = blankAnswerFor(f);
          });
          setAnswers(blank);
        }
      })
      .catch((e) => setErr(e.message));
  }, [scenarioId]);

  const handleSubmit = async () => {
    if (!data) return;

    const missing = data.fields.filter((f) => !isAnswerComplete(f, answers[f.key]));
    if (missing.length > 0) {
      setSubmitError(
        `Please complete all ${data.fields.length} fields before submitting. Missing: ${missing
          .map((f) => f.label)
          .join(', ')}`
      );
      return;
    }

    const confirmed = window.confirm(
      'Submit your answers?\n\n' +
      'This cannot be undone. Your answers will be locked permanently, ' +
      'and the model answers will be revealed for self-study.'
    );
    if (!confirmed) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const timeSpentSec = Math.floor((Date.now() - startTime) / 1000);
      // Build the payload: text fields submit as plain strings (legacy
      // shape), structured fields submit as their object.
      const payload = {};
      for (const f of data.fields) {
        payload[f.key] = submitValueFor(f, answers[f.key]);
      }
      const res = await api.submitScenario(scenarioId, { answers: payload, timeSpentSec });
      setSubmittedPayload({
        submittedAt: res.submittedAt,
        timeSpentSec: res.timeSpentSec,
        modelAnswers: res.modelAnswers,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const backLabel = data ? `Back to ${data.scenario.category.name}` : 'Back';

  if (err)   return <BackShell onBack={onBack} backLabel={backLabel}>Error: {err}</BackShell>;
  if (!data) return <BackShell onBack={onBack} backLabel={backLabel}>Loading scenario…</BackShell>;

  const scenario = data.scenario;
  const isLocked = !!data.submission || !!submittedPayload;
  const modelAnswers = data.modelAnswers || submittedPayload?.modelAnswers;
  const submittedAt = data.submission?.submittedAt || submittedPayload?.submittedAt;
  const timeSpentSec = data.submission?.timeSpentSec ?? submittedPayload?.timeSpentSec;
  // Instructor feedback only comes from the server (admin saves it after submit),
  // so it's never present on a just-now submission. Read from data only.
  const feedback = data.feedback || null;

  const bg = scenario.category.colorPrimary || BRAND.black;
  const accent = scenario.category.colorAccent || BRAND.pinkDk;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← {backLabel}</button>
      </div>

      <Card
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)`,
          color: '#fff',
          border: 'none',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {scenario.section.code} · {scenario.section.name} · {scenario.category.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>
            Scenario #{scenario.order}
          </span>
          <span style={pillStyle('#fff', 'rgba(255,255,255,0.2)')}>{scenario.difficulty}</span>
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>{scenario.title}</h2>
      </Card>

      <Card style={{ marginTop: 12 }}>
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
          Assignment
        </div>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            color: BRAND.ink,
            whiteSpace: 'pre-wrap',
          }}
        >
          {scenario.text}
        </div>
      </Card>

      {isLocked && (
        <Card
          style={{
            marginTop: 12,
            background: BRAND.okBg,
            borderColor: BRAND.ok,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.ok }}>
            ✓ Submitted {formatDate(submittedAt)}
          </div>
          <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 4 }}>
            Time spent: {Math.max(1, Math.round((timeSpentSec || 0) / 60))} min · Your answers are
            locked. Model answers are shown below each field for self-study.
          </div>
        </Card>
      )}

      {/* Instructor feedback, if the admin has saved a note on this submission */}
      {isLocked && feedback && (
        <Card
          style={{
            marginTop: 12,
            background: '#fdf2f8',
            borderColor: BRAND.pink,
            borderWidth: 2,
            borderStyle: 'solid',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: BRAND.pinkDk,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Instructor Feedback
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: BRAND.ink,
              whiteSpace: 'pre-wrap',
            }}
          >
            {feedback.text}
          </div>
          {(feedback.savedByName || feedback.savedAt) && (
            <div
              style={{
                fontSize: 11,
                color: BRAND.sub,
                marginTop: 12,
                paddingTop: 10,
                borderTop: `1px dashed ${BRAND.pink}`,
              }}
            >
              {feedback.savedByName && <>From <strong>{feedback.savedByName}</strong></>}
              {feedback.savedByName && feedback.savedAt && ' · '}
              {feedback.savedAt && formatDate(feedback.savedAt)}
            </div>
          )}
        </Card>
      )}

      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        {data.fields.map((f) => {
          const modelForField = modelAnswers ? modelAnswers[f.key] : null;
          return (
            <FieldRenderer
              key={f.id}
              field={f}
              mode={isLocked ? 'locked' : 'edit'}
              value={answers[f.key]}
              onChange={(v) => setAnswers((a) => ({ ...a, [f.key]: v }))}
              model={modelForField}
            />
          );
        })}
      </div>

      {!isLocked && (
        <Card style={{ marginTop: 16 }}>
          {submitError && (
            <div style={{ color: BRAND.danger, fontSize: 13, marginBottom: 10 }}>
              {submitError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                ...btnPrimary,
                padding: '12px 20px',
                fontSize: 15,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Submitting…' : 'Submit Answers (Final — Cannot Be Changed)'}
            </button>
            <span style={{ fontSize: 12, color: BRAND.sub }}>
              You'll see the model answers immediately after submitting.
            </span>
          </div>
        </Card>
      )}
    </>
  );
}

// FieldPanel was removed in Step 3 — text rendering is now handled by
// the TextField component in field-types.jsx, dispatched via FieldRenderer.



// ═══════════════════════════════════════════════════════════
// ADMIN REVIEW SCREENS (new in Step 1D)
// ═══════════════════════════════════════════════════════════

// Sections that currently have imported content. Update this list as
// content for more sections is imported. The UI will automatically
// fetch submission summaries for sections listed here.
const SECTIONS_WITH_CONTENT = [
  { code: 'M2-S1', name: 'Problem Identification' },
  { code: 'M2-S2', name: 'Scope of Work' },
  { code: 'M2-S3', name: 'Comparable Selection & Analysis' },
];

// ───────────────────────────────────────────────────────────
// Student review — per-student list of reviewable sections
// ───────────────────────────────────────────────────────────
export function StudentReviewView({ studentId, onBack, onOpenSection }) {
  const [student, setStudent] = useState(null);
  const [summaries, setSummaries] = useState({}); // code → summary object
  const [err, setErr] = useState('');

  useEffect(() => {
    setStudent(null);
    setSummaries({});
    setErr('');

    // Load student details and all section summaries in parallel.
    // Per-section calls are wrapped in catch() so a single failure doesn't
    // block the others.
    const sectionCalls = SECTIONS_WITH_CONTENT.map((s) =>
      api.adminSectionSubmissions(studentId, s.code).catch(() => null)
    );
    Promise.all([api.adminStudent(studentId), ...sectionCalls])
      .then(([studentRes, ...sectionRess]) => {
        setStudent(studentRes.student);
        const map = {};
        SECTIONS_WITH_CONTENT.forEach((s, i) => {
          if (sectionRess[i]) map[s.code] = sectionRess[i].summary;
        });
        setSummaries(map);
      })
      .catch((e) => setErr(e.message));
  }, [studentId]);

  const backLabel = 'Back to Roster';
  if (err)      return <BackShell onBack={onBack} backLabel={backLabel}>Error: {err}</BackShell>;
  if (!student) return <BackShell onBack={onBack} backLabel={backLabel}>Loading student…</BackShell>;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← {backLabel}</button>
      </div>

      <Card>
        <h2 style={{ margin: 0, fontSize: 22 }}>
          Review: {student.first_name} {student.last_name}
        </h2>
        <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 4 }}>
          {student.email} · <code>{student.username}</code>
        </div>
        <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 10, lineHeight: 1.55 }}>
          Select a section below to review this student's submissions. Only sections with imported
          content are shown; additional sections will appear as content is added.
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {SECTIONS_WITH_CONTENT.map((s) => {
          const summary = summaries[s.code];
          return (
            <Card key={s.code}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={pill(BRAND.black, '#fff')}>{s.code}</span>
                    <h3 style={{ margin: 0, fontSize: 17 }}>{s.name}</h3>
                  </div>
                  {summary ? (
                    <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 6 }}>
                      {summary.submittedCount} of {summary.totalCount} scenarios submitted
                      {summary.totalCount > 0 && ` (${summary.pctComplete}%)`}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 6 }}>
                      Loading…
                    </div>
                  )}
                </div>
                <button onClick={() => onOpenSection(s.code)} style={btnPrimary}>
                  Review Submissions →
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────
// Section review — scenarios grouped by category w/ status badges
// ───────────────────────────────────────────────────────────
export function SectionReviewView({ studentId, sectionCode, onBack, onOpenSubmission }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    setErr('');
    api.adminSectionSubmissions(studentId, sectionCode)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [studentId, sectionCode]);

  const backLabel = 'Back to Student';
  if (err)   return <BackShell onBack={onBack} backLabel={backLabel}>Error: {err}</BackShell>;
  if (!data) return <BackShell onBack={onBack} backLabel={backLabel}>Loading submissions…</BackShell>;

  const { student, section, summary, categories } = data;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← {backLabel}</button>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={pill(BRAND.black, '#fff')}>{section.code}</span>
          <h2 style={{ margin: 0, fontSize: 22 }}>{section.name}</h2>
        </div>
        <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 6 }}>
          Reviewing:{' '}
          <strong>
            {student.firstName} {student.lastName}
          </strong>{' '}
          · {student.email}
        </div>
        <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 4 }}>
          {summary.submittedCount} of {summary.totalCount} scenarios submitted
          {summary.totalCount > 0 && ` (${summary.pctComplete}%)`}
        </div>
      </Card>

      {categories.length === 0 ? (
        <Card style={{ marginTop: 12, color: BRAND.sub }}>
          No scenarios have been imported for this section yet.
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          {categories.map((cat) => (
            <AdminCategoryBlock
              key={cat.id}
              category={cat}
              onOpenSubmission={onOpenSubmission}
            />
          ))}
        </div>
      )}
    </>
  );
}

function AdminCategoryBlock({ category, onOpenSubmission }) {
  const bg = category.colorPrimary || BRAND.black;
  const accent = category.colorAccent || BRAND.pinkDk;
  const submittedInCat = category.scenarios.filter((s) => s.submission).length;
  return (
    <div>
      <div
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)`,
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>{category.name}</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          {submittedInCat} of {category.scenarios.length} submitted
        </div>
      </div>
      <div
        style={{
          border: `1px solid ${BRAND.line}`,
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          display: 'grid',
          gap: 1,
          background: BRAND.line,
          overflow: 'hidden',
        }}
      >
        {category.scenarios.map((s) => (
          <AdminScenarioRow
            key={s.id}
            s={s}
            onOpen={
              s.submission
                ? () => onOpenSubmission(s.submission.id)
                : null
            }
          />
        ))}
      </div>
    </div>
  );
}

function AdminScenarioRow({ s, onOpen }) {
  const submitted = !!s.submission;
  const hasFeedback = submitted && s.submission.hasFeedback;
  const clickable = !!onOpen;
  return (
    <div
      onClick={onOpen || undefined}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: BRAND.card,
        cursor: clickable ? 'pointer' : 'default',
        opacity: clickable ? 1 : 0.85,
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => clickable && (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={(e) => clickable && (e.currentTarget.style.background = BRAND.card)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: BRAND.sub, fontSize: 12, fontWeight: 600 }}>#{s.order}</span>
          <span style={pillStyle(difficultyColor(s.difficulty), difficultyBg(s.difficulty))}>
            {s.difficulty}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</span>
        </div>
        {submitted && (
          <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 3 }}>
            Submitted {formatDate(s.submission.submittedAt)}
            {hasFeedback && ` · feedback saved ${formatDate(s.submission.feedbackAt)}`}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {hasFeedback ? (
          <span style={pillStyle('#1d4ed8', '#dbeafe')}>Submitted + Feedback</span>
        ) : submitted ? (
          <span style={pillStyle(BRAND.ok, BRAND.okBg)}>Submitted</span>
        ) : (
          <span style={pillStyle('#6b7280', '#f3f4f6')}>Pending</span>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Submission review — side-by-side student vs model + feedback
// ───────────────────────────────────────────────────────────
export function SubmissionReviewView({ submissionId, onBack }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setData(null);
    setErr('');
    setSaveError('');
    api.adminSubmission(submissionId)
      .then((res) => {
        setData(res);
        setFeedbackText(res.feedback?.text || '');
        setSavedFeedback(res.feedback);
      })
      .catch((e) => setErr(e.message));
  }, [submissionId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.saveSubmissionFeedback(submissionId, feedbackText);
      setSavedFeedback(res.feedback);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const backLabel = 'Back to Section Review';
  if (err)   return <BackShell onBack={onBack} backLabel={backLabel}>Error: {err}</BackShell>;
  if (!data) return <BackShell onBack={onBack} backLabel={backLabel}>Loading submission…</BackShell>;

  const { student, scenario, submission, fields } = data;
  const bg = scenario.category.colorPrimary || BRAND.black;
  const accent = scenario.category.colorAccent || BRAND.pinkDk;

  const currentText = feedbackText.trim();
  const savedText = (savedFeedback?.text || '').trim();
  const hasUnsavedChanges = currentText !== savedText;
  const hasSavedFeedback = !!savedText;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← {backLabel}</button>
      </div>

      {/* Colored header with student + scenario context */}
      <Card
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)`,
          color: '#fff',
          border: 'none',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Reviewing: {student.firstName} {student.lastName} · {student.email}
        </div>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.85 }}>
          {scenario.section.code} · {scenario.section.name} · {scenario.category.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>
            Scenario #{scenario.order}
          </span>
          <span style={pillStyle('#fff', 'rgba(255,255,255,0.2)')}>{scenario.difficulty}</span>
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>{scenario.title}</h2>
        <div style={{ fontSize: 12, marginTop: 10, opacity: 0.85 }}>
          Submitted {formatDate(submission.submittedAt)} ·{' '}
          {Math.max(1, Math.round((submission.timeSpentSec || 0) / 60))} min
        </div>
      </Card>

      {/* Scenario narrative */}
      <Card style={{ marginTop: 12 }}>
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
          Scenario
        </div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: BRAND.ink,
            whiteSpace: 'pre-wrap',
          }}
        >
          {scenario.text}
        </div>
      </Card>

      {/* Side-by-side field comparison */}
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {fields.map((f) => (
          <FieldRenderer
            key={f.id}
            field={f}
            mode="review"
            value={
              // For review, we wrap the student's answer in the same shape
              // FieldRenderer expects for display. text + data are passed
              // through; FieldRenderer's components read the type and
              // render the appropriate side-by-side display.
              f.type === 'text' || !f.type
                ? f.studentAnswer
                : { ...(f.studentAnswerData || {}), text: f.studentAnswer || '' }
            }
            onChange={() => {
              /* no-op in review mode */
            }}
            model={{
              text: f.modelAnswer,
              data: f.modelAnswerData,
              commentary: f.commentary,
            }}
          />
        ))}
      </div>

      {/* Feedback block */}
      <Card
        style={{
          marginTop: 16,
          borderColor: BRAND.pink,
          borderWidth: 2,
          borderStyle: 'solid',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: BRAND.ink,
            marginBottom: 4,
          }}
        >
          Instructor Feedback
        </div>
        <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 10, lineHeight: 1.55 }}>
          Write a note to the student about this submission. Leave blank and save to clear any
          previously saved feedback.
        </div>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          rows={5}
          placeholder="Your feedback for the student…"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: `1px solid ${BRAND.line}`,
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: 100,
          }}
        />
        {saveError && (
          <div style={{ color: BRAND.danger, fontSize: 13, marginTop: 8 }}>{saveError}</div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            style={{
              ...btnPrimary,
              opacity: saving || !hasUnsavedChanges ? 0.5 : 1,
              cursor: saving || !hasUnsavedChanges ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : hasSavedFeedback ? 'Update Feedback' : 'Save Feedback'}
          </button>
          {savedFeedback?.savedAt && (
            <div style={{ fontSize: 12, color: BRAND.sub, lineHeight: 1.5 }}>
              {hasSavedFeedback ? 'Saved' : 'Cleared'} {formatDate(savedFeedback.savedAt)}
              {savedFeedback.savedByName && ` by ${savedFeedback.savedByName}`}
              {hasUnsavedChanges && (
                <span style={{ color: BRAND.warn, marginLeft: 8, fontWeight: 600 }}>
                  · unsaved changes
                </span>
              )}
            </div>
          )}
          {!savedFeedback?.savedAt && hasUnsavedChanges && (
            <div style={{ fontSize: 12, color: BRAND.sub }}>Not yet saved</div>
          )}
        </div>
      </Card>
    </>
  );
}

// ReviewFieldPanel was removed in Step 3 — admin side-by-side review
// is now handled by FieldRenderer in mode='review' from field-types.jsx.



// ═══════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════

function BackShell({ onBack, backLabel = 'Back', children }) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← {backLabel}</button>
      </div>
      <Card style={{ color: BRAND.sub }}>{children}</Card>
    </>
  );
}
