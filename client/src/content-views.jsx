// client/src/content-views.jsx
// -----------------------------------------------------------
// Section 1 content experience — the three screens a student
// sees after clicking into an accessible Section from the
// main dashboard:
//
//   SectionView    → landing page for a section. Shows the
//                    6 color-coded category tiles.
//   CategoryView   → list of scenarios within a category,
//                    each flagged submitted or pending.
//   ScenarioView   → the scenario detail: narrative + input
//                    form. Locks on submit and reveals model
//                    answers inline for self-study.
//
// Navigation is controlled by the parent (StudentDashboard in
// App.jsx) via onBack / onOpenX callbacks — no router needed.
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

// ─────────────────────────────────────────────────────────────
// Section landing: shows the section's category tiles
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Category view: scenario list with submission status
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Scenario detail: narrative + 9-field input form, lock-on-submit
// ─────────────────────────────────────────────────────────────
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
        // If the student already submitted, pre-fill with their locked
        // answers so the review view can display them. Otherwise blank.
        if (res.submission?.answers) {
          setAnswers(res.submission.answers);
        } else {
          const blank = {};
          res.fields.forEach((f) => {
            blank[f.key] = '';
          });
          setAnswers(blank);
        }
      })
      .catch((e) => setErr(e.message));
  }, [scenarioId]);

  const handleSubmit = async () => {
    if (!data) return;

    // Require every field to have something (trimmed)
    const missing = data.fields.filter((f) => !(answers[f.key] || '').trim());
    if (missing.length > 0) {
      setSubmitError(
        `Please fill in all ${data.fields.length} fields before submitting. Missing: ${missing
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
      const res = await api.submitScenario(scenarioId, { answers, timeSpentSec });
      setSubmittedPayload({
        submittedAt: res.submittedAt,
        timeSpentSec: res.timeSpentSec,
        modelAnswers: res.modelAnswers,
      });
      // Scroll to top so the student sees the success banner
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
  // Locked = we loaded an existing submission, OR we just submitted now.
  const isLocked = !!data.submission || !!submittedPayload;
  const modelAnswers = data.modelAnswers || submittedPayload?.modelAnswers;
  const submittedAt = data.submission?.submittedAt || submittedPayload?.submittedAt;
  const timeSpentSec = data.submission?.timeSpentSec ?? submittedPayload?.timeSpentSec;

  const bg = scenario.category.colorPrimary || BRAND.black;
  const accent = scenario.category.colorAccent || BRAND.pinkDk;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onBack} style={btnGhost}>← {backLabel}</button>
      </div>

      {/* Colored header */}
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

      {/* Success banner after submit */}
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

      {/* Field inputs / locked review */}
      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        {data.fields.map((f) => (
          <FieldPanel
            key={f.id}
            field={f}
            value={answers[f.key] || ''}
            onChange={(v) => setAnswers((a) => ({ ...a, [f.key]: v }))}
            locked={isLocked}
            modelAnswer={modelAnswers ? modelAnswers[f.key] : null}
          />
        ))}
      </div>

      {/* Submit block (only when not yet submitted) */}
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

function FieldPanel({ field, value, onChange, locked, modelAnswer }) {
  return (
    <Card>
      <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.ink, marginBottom: 6 }}>
        {field.label}
      </div>
      {field.helpText && (
        <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 8 }}>{field.helpText}</div>
      )}

      {/* Student's answer: editable before submit, read-only after */}
      {!locked ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
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
            minHeight: 70,
          }}
        />
      ) : (
        <div
          style={{
            background: '#f9fafb',
            border: `1px solid ${BRAND.line}`,
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 14,
            color: BRAND.ink,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: BRAND.sub,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              marginBottom: 4,
            }}
          >
            Your Answer
          </div>
          {value || <span style={{ color: BRAND.sub, fontStyle: 'italic' }}>(no answer)</span>}
        </div>
      )}

      {/* Model answer reveal — only post-submit */}
      {locked && modelAnswer && (
        <div
          style={{
            marginTop: 10,
            background: BRAND.okBg,
            border: `1px solid ${BRAND.ok}`,
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            color: BRAND.ink,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: BRAND.ok,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              marginBottom: 4,
            }}
          >
            Model Answer
          </div>
          {modelAnswer.text}
          {modelAnswer.commentary && (
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: `1px dashed ${BRAND.ok}`,
                fontSize: 13,
                color: BRAND.sub,
              }}
            >
              <em>{modelAnswer.commentary}</em>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared helper: back-button + card shell for loading/error states
// ─────────────────────────────────────────────────────────────
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
