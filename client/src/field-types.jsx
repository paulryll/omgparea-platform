// client/src/field-types.jsx
// -----------------------------------------------------------
// Field type renderers. One component per field type, each
// handling its own three render states:
//
//   - mode='edit'    student is filling in (pre-submit)
//   - mode='locked'  student post-submit, with model revealed
//   - mode='review'  admin side-by-side comparison
//
// The five types match section_fields.field_type:
//   - text         a textarea
//   - checklist    multi-select checkboxes
//   - select       single-select radio buttons
//   - parameters   labeled grid of small inputs with units
//   - approaches   like checklist + per-option justification
//
// Storage convention:
//   - Text fields: value is a string; on submit, posts as plain
//     string (no wrapper object) for backward compatibility
//     with Section 1.
//   - Structured fields: value is an object matching the
//     submit endpoint's expected shape, with an optional
//     `text` field for free-form commentary.
//
// FieldRenderer (the export at the bottom) dispatches to the
// right component based on field.type. Both content-views.jsx
// (student side) and the admin review screen use it.
// -----------------------------------------------------------

import { BRAND, Card } from './ui.jsx';

// ═══════════════════════════════════════════════════════════
// Shared style helpers
// ═══════════════════════════════════════════════════════════

const fieldLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: BRAND.ink,
  marginBottom: 6,
};

const fieldHelpStyle = {
  fontSize: 12,
  color: BRAND.sub,
  marginBottom: 8,
};

const studentAnswerBoxStyle = {
  background: '#f9fafb',
  border: `1px solid ${BRAND.line}`,
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 14,
  lineHeight: 1.55,
  color: BRAND.ink,
};

const modelAnswerBoxStyle = {
  background: BRAND.okBg,
  border: `1px solid ${BRAND.ok}`,
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 14,
  lineHeight: 1.55,
  color: BRAND.ink,
};

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
  marginBottom: 4,
};

function emptyBox(text) {
  return <span style={{ color: BRAND.sub, fontStyle: 'italic' }}>{text}</span>;
}

function commentaryFooter(commentary, color = BRAND.ok) {
  if (!commentary) return null;
  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: `1px dashed ${color}`,
        fontSize: 13,
        color: BRAND.sub,
      }}
    >
      <em>{commentary}</em>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TEXT
// ═══════════════════════════════════════════════════════════

function TextField({ field, mode, value, onChange, model }) {
  // For text fields, value is just a string (no wrapping).
  const text = typeof value === 'string' ? value : (value?.text ?? '');

  if (mode === 'edit') {
    return (
      <FieldShell field={field}>
        <textarea
          value={text}
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
      </FieldShell>
    );
  }

  if (mode === 'locked') {
    return (
      <FieldShell field={field}>
        <div style={studentAnswerBoxStyle}>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub }}>Your Answer</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{text || emptyBox('(no answer)')}</div>
        </div>
        {model?.text && (
          <div style={{ ...modelAnswerBoxStyle, marginTop: 10 }}>
            <div style={{ ...sectionLabelStyle, color: BRAND.ok }}>Model Answer</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{model.text}</div>
            {commentaryFooter(model.commentary)}
          </div>
        )}
      </FieldShell>
    );
  }

  // review (admin)
  return (
    <ReviewShell field={field}>
      <div style={studentAnswerBoxStyle}>
        <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>Student Answer</div>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{text || emptyBox('(no answer)')}</div>
      </div>
      <div style={{ ...modelAnswerBoxStyle, fontSize: 13 }}>
        <div style={{ ...sectionLabelStyle, color: BRAND.ok, fontSize: 10 }}>Model Answer</div>
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {model?.text || emptyBox('(no model answer)')}
        </div>
        {commentaryFooter(model?.commentary)}
      </div>
    </ReviewShell>
  );
}

// ═══════════════════════════════════════════════════════════
// CHECKLIST
// ═══════════════════════════════════════════════════════════

function ChecklistField({ field, mode, value, onChange, model }) {
  const options = field.options?.options || [];
  const studentSelected = Array.isArray(value?.selected) ? value.selected : [];
  const studentText = typeof value?.text === 'string' ? value.text : '';
  const modelSelected = Array.isArray(model?.data?.selected) ? model.data.selected : [];

  const toggle = (idx) => {
    const set = new Set(studentSelected);
    if (set.has(idx)) set.delete(idx);
    else set.add(idx);
    onChange({ selected: Array.from(set).sort((a, b) => a - b), text: studentText });
  };

  if (mode === 'edit') {
    return (
      <FieldShell field={field}>
        <div style={{ display: 'grid', gap: 6 }}>
          {options.map((opt, idx) => {
            const checked = studentSelected.includes(idx);
            return (
              <label
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 10px',
                  background: checked ? '#fdf2f8' : '#fafafa',
                  border: `1px solid ${checked ? BRAND.pink : BRAND.line}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(idx)}
                  style={{ marginTop: 2, accentColor: BRAND.pink }}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      </FieldShell>
    );
  }

  if (mode === 'locked') {
    return (
      <FieldShell field={field}>
        <div style={studentAnswerBoxStyle}>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub }}>Your Selections</div>
          <ChecklistDisplay options={options} selected={studentSelected} />
          {studentText && (
            <div style={{ marginTop: 8, fontSize: 13, color: BRAND.sub, whiteSpace: 'pre-wrap' }}>
              {studentText}
            </div>
          )}
        </div>
        {(modelSelected.length > 0 || model?.text) && (
          <div style={{ ...modelAnswerBoxStyle, marginTop: 10 }}>
            <div style={{ ...sectionLabelStyle, color: BRAND.ok }}>Model Answer</div>
            {modelSelected.length > 0 && (
              <ChecklistDisplay options={options} selected={modelSelected} />
            )}
            {model?.text && (
              <div style={{ marginTop: modelSelected.length > 0 ? 8 : 0, whiteSpace: 'pre-wrap' }}>
                {model.text}
              </div>
            )}
            {commentaryFooter(model.commentary)}
          </div>
        )}
      </FieldShell>
    );
  }

  // review
  return (
    <ReviewShell field={field}>
      <div style={studentAnswerBoxStyle}>
        <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>Student Selections</div>
        {studentSelected.length > 0
          ? <ChecklistDisplay options={options} selected={studentSelected} small />
          : emptyBox('(none selected)')}
        {studentText && (
          <div style={{ marginTop: 6, fontSize: 12, color: BRAND.sub, whiteSpace: 'pre-wrap' }}>
            {studentText}
          </div>
        )}
      </div>
      <div style={{ ...modelAnswerBoxStyle, fontSize: 13 }}>
        <div style={{ ...sectionLabelStyle, color: BRAND.ok, fontSize: 10 }}>Model Answer</div>
        {modelSelected.length > 0
          ? <ChecklistDisplay options={options} selected={modelSelected} small />
          : null}
        {model?.text && (
          <div style={{ marginTop: modelSelected.length > 0 ? 6 : 0, whiteSpace: 'pre-wrap' }}>
            {model.text}
          </div>
        )}
        {commentaryFooter(model?.commentary)}
      </div>
    </ReviewShell>
  );
}

function ChecklistDisplay({ options, selected, small }) {
  const set = new Set(selected);
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: small ? 3 : 4 }}>
      {options.map((opt, idx) => {
        const isOn = set.has(idx);
        return (
          <li
            key={idx}
            style={{
              fontSize: small ? 12 : 13,
              color: isOn ? BRAND.ink : BRAND.sub,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <span style={{ flexShrink: 0 }}>{isOn ? '☑' : '☐'}</span>
            <span style={isOn ? { fontWeight: 500 } : { textDecoration: 'line-through', opacity: 0.6 }}>
              {opt}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ═══════════════════════════════════════════════════════════
// SELECT
// ═══════════════════════════════════════════════════════════

function SelectField({ field, mode, value, onChange, model }) {
  const options = field.options?.options || [];
  const studentSelected = Number.isInteger(value?.selected) ? value.selected : null;
  const studentText = typeof value?.text === 'string' ? value.text : '';
  const modelSelected = Number.isInteger(model?.data?.selected) ? model.data.selected : null;

  const pick = (idx) => {
    onChange({ selected: idx, text: studentText });
  };

  if (mode === 'edit') {
    return (
      <FieldShell field={field}>
        <div style={{ display: 'grid', gap: 6 }}>
          {options.map((opt, idx) => {
            const checked = studentSelected === idx;
            return (
              <label
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 10px',
                  background: checked ? '#fdf2f8' : '#fafafa',
                  border: `1px solid ${checked ? BRAND.pink : BRAND.line}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="radio"
                  name={`select-${field.id}`}
                  checked={checked}
                  onChange={() => pick(idx)}
                  style={{ marginTop: 2, accentColor: BRAND.pink }}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      </FieldShell>
    );
  }

  if (mode === 'locked') {
    return (
      <FieldShell field={field}>
        <div style={studentAnswerBoxStyle}>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub }}>Your Selection</div>
          <SelectDisplay options={options} selected={studentSelected} />
        </div>
        {(modelSelected !== null || model?.text) && (
          <div style={{ ...modelAnswerBoxStyle, marginTop: 10 }}>
            <div style={{ ...sectionLabelStyle, color: BRAND.ok }}>Model Answer</div>
            {modelSelected !== null && (
              <SelectDisplay options={options} selected={modelSelected} />
            )}
            {model?.text && (
              <div style={{ marginTop: modelSelected !== null ? 8 : 0, whiteSpace: 'pre-wrap' }}>
                {model.text}
              </div>
            )}
            {commentaryFooter(model.commentary)}
          </div>
        )}
      </FieldShell>
    );
  }

  // review
  return (
    <ReviewShell field={field}>
      <div style={studentAnswerBoxStyle}>
        <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>Student Selection</div>
        <SelectDisplay options={options} selected={studentSelected} small />
      </div>
      <div style={{ ...modelAnswerBoxStyle, fontSize: 13 }}>
        <div style={{ ...sectionLabelStyle, color: BRAND.ok, fontSize: 10 }}>Model Answer</div>
        <SelectDisplay options={options} selected={modelSelected} small />
        {model?.text && (
          <div style={{ marginTop: modelSelected !== null ? 6 : 0, whiteSpace: 'pre-wrap' }}>
            {model.text}
          </div>
        )}
        {commentaryFooter(model?.commentary)}
      </div>
    </ReviewShell>
  );
}

function SelectDisplay({ options, selected, small }) {
  if (selected === null) return emptyBox('(none selected)');
  const opt = options[selected];
  return (
    <div style={{ fontSize: small ? 12 : 13, fontWeight: 500 }}>
      <span style={{ marginRight: 6 }}>●</span>
      {opt || `Option ${selected + 1}`}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PARAMETERS
// ═══════════════════════════════════════════════════════════

function ParametersField({ field, mode, value, onChange, model }) {
  const fields = field.options?.fields || [];
  const studentValues = (value?.values && typeof value.values === 'object') ? value.values : {};
  const studentText = typeof value?.text === 'string' ? value.text : '';
  const modelValues = (model?.data?.values && typeof model.data.values === 'object') ? model.data.values : {};

  const setValue = (name, v) => {
    const next = { ...studentValues, [name]: v };
    onChange({ values: next, text: studentText });
  };

  if (mode === 'edit') {
    return (
      <FieldShell field={field}>
        <div style={{ display: 'grid', gap: 8 }}>
          {fields.map((f) => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: '#fafafa',
                border: `1px solid ${BRAND.line}`,
                borderRadius: 6,
              }}
            >
              <label style={{ flex: 1, fontSize: 13 }}>{f.label}</label>
              <input
                type="text"
                value={studentValues[f.name] || ''}
                onChange={(e) => setValue(f.name, e.target.value)}
                style={{
                  width: 80,
                  padding: '6px 8px',
                  fontSize: 13,
                  border: `1px solid ${BRAND.line}`,
                  borderRadius: 4,
                  textAlign: 'right',
                  outline: 'none',
                }}
              />
              {f.unit && (
                <span style={{ fontSize: 12, color: BRAND.sub, minWidth: 50 }}>{f.unit}</span>
              )}
            </div>
          ))}
        </div>
      </FieldShell>
    );
  }

  if (mode === 'locked') {
    return (
      <FieldShell field={field}>
        <div style={studentAnswerBoxStyle}>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub }}>Your Values</div>
          <ParametersDisplay fields={fields} values={studentValues} />
        </div>
        {(Object.keys(modelValues).length > 0 || model?.text) && (
          <div style={{ ...modelAnswerBoxStyle, marginTop: 10 }}>
            <div style={{ ...sectionLabelStyle, color: BRAND.ok }}>Model Answer</div>
            {Object.keys(modelValues).length > 0 && (
              <ParametersDisplay fields={fields} values={modelValues} />
            )}
            {model?.text && (
              <div
                style={{
                  marginTop: Object.keys(modelValues).length > 0 ? 8 : 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {model.text}
              </div>
            )}
            {commentaryFooter(model.commentary)}
          </div>
        )}
      </FieldShell>
    );
  }

  // review
  return (
    <ReviewShell field={field}>
      <div style={studentAnswerBoxStyle}>
        <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>Student Values</div>
        <ParametersDisplay fields={fields} values={studentValues} small />
      </div>
      <div style={{ ...modelAnswerBoxStyle, fontSize: 13 }}>
        <div style={{ ...sectionLabelStyle, color: BRAND.ok, fontSize: 10 }}>Model Answer</div>
        <ParametersDisplay fields={fields} values={modelValues} small />
        {model?.text && (
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{model.text}</div>
        )}
        {commentaryFooter(model?.commentary)}
      </div>
    </ReviewShell>
  );
}

function ParametersDisplay({ fields, values, small }) {
  if (!fields.length) return emptyBox('(no parameters)');
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: small ? 12 : 13, width: '100%' }}>
      <tbody>
        {fields.map((f) => {
          const v = values[f.name];
          const filled = v != null && v !== '';
          return (
            <tr key={f.name}>
              <td style={{ padding: '2px 6px 2px 0', color: BRAND.sub }}>{f.label}</td>
              <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: filled ? 600 : 400 }}>
                {filled ? v : <span style={{ color: BRAND.sub, fontStyle: 'italic' }}>—</span>}
              </td>
              <td style={{ padding: '2px 0 2px 6px', color: BRAND.sub, fontSize: small ? 11 : 12 }}>
                {f.unit || ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ═══════════════════════════════════════════════════════════
// APPROACHES
// ═══════════════════════════════════════════════════════════

function ApproachesField({ field, mode, value, onChange, model }) {
  const options = field.options?.options || [];
  const studentSelected = Array.isArray(value?.selected) ? value.selected : [];
  const studentJustifications = Array.isArray(value?.justifications)
    ? value.justifications
    : new Array(options.length).fill('');
  const studentText = typeof value?.text === 'string' ? value.text : '';
  const modelSelected = Array.isArray(model?.data?.selected) ? model.data.selected : [];
  const modelJustifications = Array.isArray(model?.data?.justifications)
    ? model.data.justifications
    : [];

  const ensureLength = (arr, len, fill = '') => {
    const out = arr.slice();
    while (out.length < len) out.push(fill);
    return out;
  };

  const toggle = (idx) => {
    const set = new Set(studentSelected);
    if (set.has(idx)) set.delete(idx);
    else set.add(idx);
    onChange({
      selected: Array.from(set).sort((a, b) => a - b),
      justifications: ensureLength(studentJustifications, options.length),
      text: studentText,
    });
  };

  const setJustification = (idx, val) => {
    const next = ensureLength(studentJustifications, options.length);
    next[idx] = val;
    onChange({ selected: studentSelected, justifications: next, text: studentText });
  };

  if (mode === 'edit') {
    return (
      <FieldShell field={field}>
        <div style={{ display: 'grid', gap: 8 }}>
          {options.map((opt, idx) => {
            const checked = studentSelected.includes(idx);
            return (
              <div
                key={idx}
                style={{
                  padding: 10,
                  background: checked ? '#fdf2f8' : '#fafafa',
                  border: `1px solid ${checked ? BRAND.pink : BRAND.line}`,
                  borderRadius: 6,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(idx)}
                    style={{ accentColor: BRAND.pink }}
                  />
                  <span>{opt}</span>
                </label>
                <textarea
                  value={studentJustifications[idx] || ''}
                  onChange={(e) => setJustification(idx, e.target.value)}
                  rows={2}
                  placeholder={
                    checked
                      ? 'Why include this approach?'
                      : 'Why omit / not develop this approach?'
                  }
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    border: `1px solid ${BRAND.line}`,
                    borderRadius: 4,
                    background: '#fff',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: 50,
                  }}
                />
              </div>
            );
          })}
        </div>
      </FieldShell>
    );
  }

  if (mode === 'locked') {
    return (
      <FieldShell field={field}>
        <div style={studentAnswerBoxStyle}>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub }}>Your Approaches</div>
          <ApproachesDisplay
            options={options}
            selected={studentSelected}
            justifications={ensureLength(studentJustifications, options.length)}
          />
          {studentText && (
            <div style={{ marginTop: 8, fontSize: 13, color: BRAND.sub, whiteSpace: 'pre-wrap' }}>
              {studentText}
            </div>
          )}
        </div>
        {(modelSelected.length > 0 || modelJustifications.length > 0 || model?.text) && (
          <div style={{ ...modelAnswerBoxStyle, marginTop: 10 }}>
            <div style={{ ...sectionLabelStyle, color: BRAND.ok }}>Model Answer</div>
            <ApproachesDisplay
              options={options}
              selected={modelSelected}
              justifications={ensureLength(modelJustifications, options.length)}
              tone="model"
            />
            {model?.text && (
              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{model.text}</div>
            )}
            {commentaryFooter(model.commentary)}
          </div>
        )}
      </FieldShell>
    );
  }

  // review
  return (
    <ReviewShell field={field}>
      <div style={studentAnswerBoxStyle}>
        <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>Student Approaches</div>
        <ApproachesDisplay
          options={options}
          selected={studentSelected}
          justifications={ensureLength(studentJustifications, options.length)}
          small
        />
        {studentText && (
          <div style={{ marginTop: 6, fontSize: 12, color: BRAND.sub, whiteSpace: 'pre-wrap' }}>
            {studentText}
          </div>
        )}
      </div>
      <div style={{ ...modelAnswerBoxStyle, fontSize: 13 }}>
        <div style={{ ...sectionLabelStyle, color: BRAND.ok, fontSize: 10 }}>Model Answer</div>
        <ApproachesDisplay
          options={options}
          selected={modelSelected}
          justifications={ensureLength(modelJustifications, options.length)}
          small
          tone="model"
        />
        {model?.text && (
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{model.text}</div>
        )}
        {commentaryFooter(model?.commentary)}
      </div>
    </ReviewShell>
  );
}

function ApproachesDisplay({ options, selected, justifications, small, tone }) {
  const set = new Set(selected);
  const accent = tone === 'model' ? BRAND.ok : BRAND.pink;
  return (
    <div style={{ display: 'grid', gap: small ? 4 : 6 }}>
      {options.map((opt, idx) => {
        const isOn = set.has(idx);
        const just = justifications[idx];
        return (
          <div
            key={idx}
            style={{
              padding: small ? '4px 6px' : '6px 8px',
              borderLeft: `3px solid ${isOn ? accent : BRAND.line}`,
              background: isOn ? 'rgba(255,255,255,0.5)' : 'transparent',
            }}
          >
            <div
              style={{
                fontSize: small ? 12 : 13,
                fontWeight: isOn ? 600 : 400,
                color: isOn ? BRAND.ink : BRAND.sub,
                textDecoration: isOn ? 'none' : 'line-through',
              }}
            >
              {isOn ? '☑' : '☐'} {opt}
            </div>
            {just && (
              <div
                style={{
                  fontSize: small ? 11 : 12,
                  color: BRAND.sub,
                  marginTop: 2,
                  marginLeft: 16,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {just}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPARABLES (Section 3)
// ═══════════════════════════════════════════════════════════
//
// A 3-step workflow over a scenario-specific pool of 7-8
// candidate comparable sales. Used by Section M2-S3 only.
//
// Storage shapes:
//   field.options = {
//     comps: [{id, addr, prox, sub, price, date, style, bed, bath,
//              gla, site, yr, cond, qual, conc, gar, txn, warn}, ...],
//     rejection_reasons: [string, ...],
//     subject: {address, subdivision, style, bed, bath, gla, site,
//               yr, cond, qual, garage, bsmt, pool}
//   }
//   value (student answer) = {
//     decisions: { C1: {verdict:'accept'} | {verdict:'reject', reason:'...'} },
//     selections: ['C1','C2','C3'],   // ordered top 3 of accepted comps
//     justification: 'free-form text (≥40 chars)'
//   }
//   model.data (revealed post-submit) = {
//     verdicts: { C1:'accept', ... },
//     ranking: ['C1','C2','C3'],
//     explanations: { C1:'...', ... },
//     justification: 'overall model reasoning'
//   }
// -----------------------------------------------------------

const fmtPrice = (n) => {
  if (n == null || n === '') return '';
  const num = typeof n === 'number' ? n : Number(n);
  return isNaN(num) ? String(n) : '$' + num.toLocaleString();
};
const fmtGLA = (g) => {
  if (g == null || g === '') return '';
  if (typeof g === 'number') return g.toLocaleString() + ' SF';
  return String(g);
};

const compStatLabelStyle = {
  fontSize: 9,
  color: BRAND.sub,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontWeight: 700,
};
const compStatValueStyle = {
  fontSize: 12,
  color: BRAND.ink,
};

function SubjectPanel({ subject }) {
  if (!subject || Object.keys(subject).length === 0) return null;
  const stats = [
    ['Style', subject.style],
    ['Bed / Bath', `${subject.bed ?? ''} / ${subject.bath ?? ''}`],
    ['GLA', fmtGLA(subject.gla)],
    ['Site', subject.site],
    ['Year Built', subject.yr],
    ['Cond / Qual', `${subject.cond ?? ''} / ${subject.qual ?? ''}`],
    ['Garage', subject.garage],
    ['Basement', subject.bsmt],
    ['Pool', subject.pool],
  ].filter(([, v]) => v != null && v !== '' && v !== ' / ');
  return (
    <div
      style={{
        background: '#fdf2f8',
        border: `1px solid ${BRAND.pink}`,
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 14,
      }}
    >
      <div style={{ ...sectionLabelStyle, color: BRAND.pink, marginBottom: 6 }}>Subject Property</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.ink, marginBottom: 2 }}>
        {subject.address}
      </div>
      {subject.subdivision && (
        <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 8 }}>{subject.subdivision}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '4px 14px' }}>
        {stats.map(([k, v]) => (
          <div key={k}>
            <div style={compStatLabelStyle}>{k}</div>
            <div style={compStatValueStyle}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompCardHeader({ comp }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderBottom: `1px solid ${BRAND.line}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: '#f3f4f6',
            color: BRAND.sub,
            padding: '2px 7px',
            borderRadius: 4,
          }}
        >
          {comp.id}
        </span>
        <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, color: BRAND.ink }}>{comp.addr}</div>
        <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 1 }}>
          {comp.prox} · {comp.sub}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: BRAND.ink }}>{fmtPrice(comp.price)}</div>
        <div style={{ fontSize: 11, color: BRAND.sub }}>{comp.date}</div>
      </div>
    </div>
  );
}

function CompCardBody({ comp }) {
  const stats = [
    ['Style', comp.style],
    ['Bed / Bath', `${comp.bed ?? ''} / ${comp.bath ?? ''}`],
    ['GLA', fmtGLA(comp.gla)],
    ['Site', comp.site],
    ['Year Built', comp.yr],
    ['Cond / Qual', `${comp.cond ?? ''} / ${comp.qual ?? ''}`],
    ['Garage', comp.gar],
    ['Concessions', comp.conc],
  ].filter(([, v]) => v != null && v !== '' && v !== ' / ');
  return (
    <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px' }}>
      {stats.map(([k, v]) => (
        <div key={k}>
          <div style={compStatLabelStyle}>{k}</div>
          <div style={compStatValueStyle}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function CompCardTxnFooter({ comp }) {
  if (!comp.txn) return null;
  const isWarn = !!comp.warn;
  return (
    <div
      style={{
        padding: '6px 12px',
        borderTop: `1px solid ${BRAND.line}`,
        fontSize: 11,
        color: isWarn ? '#b36000' : BRAND.sub,
        fontWeight: isWarn ? 700 : 400,
        background: isWarn ? '#fff8e1' : 'transparent',
      }}
    >
      {isWarn ? '⚠ ' : ''}
      {comp.txn}
    </div>
  );
}

// Shared comp-review row used by BOTH locked mode (student viewing
// their own work) and review mode (admin reviewing a student).
// `perspective` controls labeling: "Your decision" vs "Student decision".
function CompReviewRow({ comp, studentDecision, studentRank, modelVerdict, modelRank, modelExplanation, perspective }) {
  const studentVerdict = studentDecision?.verdict;
  const studentReason = studentDecision?.reason;
  const matched = studentVerdict && modelVerdict && studentVerdict === modelVerdict;
  const youOrStudent = perspective === 'admin' ? 'Student' : 'Your';
  return (
    <div
      style={{
        border: `1px solid ${BRAND.line}`,
        borderLeft: `4px solid ${matched ? BRAND.ok : '#c62828'}`,
        borderRadius: 8,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <CompCardHeader comp={comp} />
      <CompCardBody comp={comp} />
      <CompCardTxnFooter comp={comp} />
      <div
        style={{
          padding: '10px 12px',
          borderTop: `1px solid ${BRAND.line}`,
          fontSize: 12,
          display: 'grid',
          gap: 4,
        }}
      >
        <div>
          <span style={{ color: BRAND.sub }}>{youOrStudent} decision:</span>{' '}
          <strong style={{ color: BRAND.ink }}>{studentVerdict || '(none)'}</strong>
          {studentVerdict === 'reject' && studentReason && (
            <span style={{ color: BRAND.sub }}> — {studentReason}</span>
          )}
          {studentRank !== -1 && (
            <span style={{ marginLeft: 8, color: BRAND.pink, fontWeight: 700 }}>
              {perspective === 'admin' ? 'Student' : 'Your'} pick #{studentRank + 1}
            </span>
          )}
        </div>
        <div>
          <span style={{ color: BRAND.sub }}>Model decision:</span>{' '}
          <strong style={{ color: BRAND.ok }}>{modelVerdict || '(none)'}</strong>
          {modelRank !== -1 && (
            <span style={{ marginLeft: 8, color: BRAND.ok, fontWeight: 700 }}>
              Model rank #{modelRank + 1}
            </span>
          )}
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 8px',
              borderRadius: 10,
              background: matched ? BRAND.okBg : '#fdecea',
              color: matched ? BRAND.ok : '#c62828',
            }}
          >
            {matched ? '✓ correct' : '✗ incorrect'}
          </span>
        </div>
        {modelExplanation && (
          <div style={{ marginTop: 4, color: BRAND.sub, fontSize: 12, lineHeight: 1.4 }}>
            <em>{modelExplanation}</em>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparablesField({ field, mode, value, onChange, model }) {
  const opts = field.options || {};
  const comps = Array.isArray(opts.comps) ? opts.comps : [];
  const rejectionReasons = Array.isArray(opts.rejection_reasons) ? opts.rejection_reasons : [];
  const subject = opts.subject || {};

  const decisions = (value && typeof value.decisions === 'object' && value.decisions) || {};
  const selections = Array.isArray(value?.selections) ? value.selections : [];
  const justification = typeof value?.justification === 'string' ? value.justification : '';

  // ── Helpers ────────────────────────────────────────────
  const setVerdict = (compId, verdict) => {
    const next = { ...decisions };
    if (verdict === 'accept') {
      next[compId] = { verdict: 'accept' };
    } else {
      // Preserve any existing reason if already a reject
      const prior = decisions[compId];
      next[compId] = { verdict: 'reject', reason: prior?.reason || '' };
    }
    // If this comp was previously selected and is now rejected, drop it
    let nextSelections = selections;
    if (verdict === 'reject') {
      nextSelections = selections.filter((id) => id !== compId);
    }
    onChange({ ...value, decisions: next, selections: nextSelections, justification });
  };

  const setReason = (compId, reason) => {
    const next = { ...decisions };
    next[compId] = { verdict: 'reject', reason };
    onChange({ ...value, decisions: next, selections, justification });
  };

  const toggleSelect = (compId) => {
    if (selections.includes(compId)) {
      onChange({ ...value, decisions, selections: selections.filter((id) => id !== compId), justification });
    } else if (selections.length < 3) {
      onChange({ ...value, decisions, selections: [...selections, compId], justification });
    }
  };

  const setJust = (text) => {
    onChange({ ...value, decisions, selections, justification: text });
  };

  const acceptedIds = comps.filter((c) => decisions[c.id]?.verdict === 'accept').map((c) => c.id);
  const allDecided = comps.every((c) => {
    const d = decisions[c.id];
    return d && d.verdict && (d.verdict !== 'reject' || (d.reason && d.reason.trim()));
  });

  // ── EDIT MODE ──────────────────────────────────────────
  if (mode === 'edit') {
    const showSelectStep = acceptedIds.length >= 3;
    const showJustifyStep = selections.length === 3;
    return (
      <FieldShell field={field}>
        <SubjectPanel subject={subject} />

        {/* STEP 1 — Screen */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...sectionLabelStyle, marginBottom: 8, color: BRAND.ink }}>
            Step 1 — Screen each candidate comp
          </div>
          <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 10 }}>
            Accept or reject each comp. Rejections require a reason.
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {comps.map((c) => {
              const d = decisions[c.id];
              const isAccept = d?.verdict === 'accept';
              const isReject = d?.verdict === 'reject';
              return (
                <div
                  key={c.id}
                  style={{
                    border: `2px solid ${
                      isAccept ? BRAND.ok : isReject ? '#c62828' : BRAND.line
                    }`,
                    borderRadius: 8,
                    background: isAccept ? BRAND.okBg : isReject ? '#fdecea' : '#fff',
                    overflow: 'hidden',
                  }}
                >
                  <CompCardHeader comp={c} />
                  <CompCardBody comp={c} />
                  <CompCardTxnFooter comp={c} />
                  <div
                    style={{
                      padding: '8px 12px',
                      borderTop: `1px solid ${BRAND.line}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setVerdict(c.id, 'accept')}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: 6,
                          border: `1px solid ${isAccept ? BRAND.ok : BRAND.line}`,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          background: isAccept ? BRAND.ok : '#fff',
                          color: isAccept ? '#fff' : BRAND.sub,
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerdict(c.id, 'reject')}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: 6,
                          border: `1px solid ${isReject ? '#c62828' : BRAND.line}`,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          background: isReject ? '#c62828' : '#fff',
                          color: isReject ? '#fff' : BRAND.sub,
                        }}
                      >
                        Reject
                      </button>
                    </div>
                    {isReject && (
                      <select
                        value={d?.reason || ''}
                        onChange={(e) => setReason(c.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: `1px solid ${d?.reason ? BRAND.line : '#c62828'}`,
                          fontSize: 12,
                          background: '#fff',
                          color: BRAND.ink,
                        }}
                      >
                        <option value="">— Select a rejection reason —</option>
                        {rejectionReasons.map((r, i) => (
                          <option key={i} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 2 — Select Top 3 (gated until ≥3 accepted) */}
        {showSelectStep ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...sectionLabelStyle, marginBottom: 8, color: BRAND.ink }}>
              Step 2 — Pick your best three (in order)
            </div>
            <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 10 }}>
              Click an accepted comp to add it. Click again to remove. Order matters: best first.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {comps
                .filter((c) => decisions[c.id]?.verdict === 'accept')
                .map((c) => {
                  const rank = selections.indexOf(c.id);
                  const isPicked = rank !== -1;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelect(c.id)}
                      disabled={!isPicked && selections.length >= 3}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: `2px solid ${isPicked ? BRAND.pink : BRAND.line}`,
                        background: isPicked ? '#fdf2f8' : '#fff',
                        cursor: !isPicked && selections.length >= 3 ? 'not-allowed' : 'pointer',
                        opacity: !isPicked && selections.length >= 3 ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: BRAND.sub }}>{c.id}</span>
                        {isPicked && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#fff',
                              background: BRAND.pink,
                              padding: '1px 7px',
                              borderRadius: 10,
                            }}
                          >
                            #{rank + 1}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.ink, lineHeight: 1.3 }}>{c.addr}</div>
                      <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 2 }}>{fmtPrice(c.price)}</div>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : acceptedIds.length > 0 ? (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: BRAND.sub,
              fontStyle: 'italic',
              background: '#fafafa',
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            Step 2 (Select Top 3) unlocks once you've accepted at least 3 comps. Currently accepted: {acceptedIds.length}/3.
          </div>
        ) : null}

        {/* STEP 3 — Justify (gated until exactly 3 selected) */}
        {showJustifyStep ? (
          <div>
            <div style={{ ...sectionLabelStyle, marginBottom: 8, color: BRAND.ink }}>
              Step 3 — Justify your selections and rejections
            </div>
            <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 8 }}>
              Explain why you picked your top 3 and why the rejected comps weren't appropriate.
            </div>
            <textarea
              value={justification}
              onChange={(e) => setJust(e.target.value)}
              placeholder="Your reasoning..."
              rows={5}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 6,
                border: `1px solid ${BRAND.line}`,
                fontSize: 14,
                lineHeight: 1.5,
                fontFamily: 'inherit',
                resize: 'vertical',
                background: '#fff',
                color: BRAND.ink,
              }}
            />
            <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 4, textAlign: 'right' }}>
              {justification.length} characters {justification.length < 40 ? '(min 40)' : ''}
            </div>
          </div>
        ) : showSelectStep ? (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: BRAND.sub,
              fontStyle: 'italic',
              background: '#fafafa',
              borderRadius: 6,
            }}
          >
            Step 3 (Justify) unlocks once you've selected exactly 3 comps. Currently selected: {selections.length}/3.
          </div>
        ) : null}
      </FieldShell>
    );
  }

  // ── LOCKED MODE (post-submit, model revealed) ─────────
  if (mode === 'locked') {
    const md = model?.data || {};
    const verdicts = md.verdicts || {};
    const explanations = md.explanations || {};
    const ranking = Array.isArray(md.ranking) ? md.ranking : [];
    return (
      <FieldShell field={field}>
        <SubjectPanel subject={subject} />

        <div style={{ ...sectionLabelStyle, color: BRAND.sub, marginBottom: 8 }}>Comp-by-Comp Review</div>
        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          {comps.map((c) => (
            <CompReviewRow
              key={c.id}
              comp={c}
              studentDecision={decisions[c.id]}
              studentRank={selections.indexOf(c.id)}
              modelVerdict={verdicts[c.id]}
              modelRank={ranking.indexOf(c.id)}
              modelExplanation={explanations[c.id]}
              perspective="student"
            />
          ))}
        </div>

        {/* Justification — student vs model */}
        <div style={{ ...sectionLabelStyle, color: BRAND.sub, marginBottom: 6 }}>Your Overall Justification</div>
        <div style={{ ...studentAnswerBoxStyle, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
          {justification || emptyBox('(no justification submitted)')}
        </div>
        {md.justification && (
          <>
            <div style={{ ...sectionLabelStyle, color: BRAND.ok, marginBottom: 6 }}>Model Justification</div>
            <div style={{ ...modelAnswerBoxStyle, whiteSpace: 'pre-wrap' }}>{md.justification}</div>
          </>
        )}
      </FieldShell>
    );
  }

  // ── REVIEW MODE (admin reviewing a student) ────────────
  // Mirrors locked mode's structure but labeled "Student" instead of
  // "Your". Admin gets full comp-by-comp breakdown with the student's
  // accept/reject decision (and rejection reason if any) next to the
  // model's, plus the model's per-comp explanation, plus a tally summary
  // and side-by-side justifications at the bottom.
  const md = model?.data || {};
  const verdicts = md.verdicts || {};
  const explanations = md.explanations || {};
  const ranking = Array.isArray(md.ranking) ? md.ranking : [];

  // Tally summary for fast admin scanning
  const totalComps = comps.length;
  const decidedComps = comps.filter((c) => decisions[c.id]?.verdict).length;
  const correctDecisions = comps.filter((c) => {
    const sv = decisions[c.id]?.verdict;
    return sv && verdicts[c.id] && sv === verdicts[c.id];
  }).length;
  const top3Match = selections
    .slice(0, 3)
    .filter((id) => ranking.slice(0, 3).includes(id)).length;

  return (
    <FieldShell field={field}>
      <SubjectPanel subject={subject} />

      {/* Tally summary card */}
      {totalComps > 0 && (
        <div
          style={{
            background: '#f9fafb',
            border: `1px solid ${BRAND.line}`,
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            fontSize: 13,
          }}
        >
          <div>
            <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>
              Decisions correct
            </div>
            <div style={{ color: BRAND.ink, fontWeight: 700, fontSize: 16 }}>
              {correctDecisions} / {totalComps}
            </div>
          </div>
          <div>
            <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>
              Top-3 overlap with model
            </div>
            <div style={{ color: BRAND.ink, fontWeight: 700, fontSize: 16 }}>
              {top3Match} / 3
            </div>
          </div>
          <div>
            <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>
              Comps decided
            </div>
            <div style={{ color: BRAND.ink, fontWeight: 700, fontSize: 16 }}>
              {decidedComps} / {totalComps}
            </div>
          </div>
        </div>
      )}

      <div style={{ ...sectionLabelStyle, color: BRAND.sub, marginBottom: 8 }}>
        Comp-by-Comp Review
      </div>
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {comps.map((c) => (
          <CompReviewRow
            key={c.id}
            comp={c}
            studentDecision={decisions[c.id]}
            studentRank={selections.indexOf(c.id)}
            modelVerdict={verdicts[c.id]}
            modelRank={ranking.indexOf(c.id)}
            modelExplanation={explanations[c.id]}
            perspective="admin"
          />
        ))}
      </div>

      {/* Justifications — student vs model, side by side */}
      <div style={{ ...sectionLabelStyle, color: BRAND.sub, marginBottom: 6 }}>
        Student Justification
      </div>
      <div style={{ ...studentAnswerBoxStyle, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
        {justification || emptyBox('(no justification submitted)')}
      </div>
      <div style={{ ...sectionLabelStyle, color: BRAND.ok, marginBottom: 6 }}>
        Model Justification
      </div>
      <div style={{ ...modelAnswerBoxStyle, whiteSpace: 'pre-wrap' }}>
        {md.justification || emptyBox('(none)')}
      </div>
    </FieldShell>
  );
}

// ═══════════════════════════════════════════════════════════
// SHELLS — wrap each field type's content in standard chrome
// ═══════════════════════════════════════════════════════════

function FieldShell({ field, children }) {
  return (
    <Card>
      <div style={fieldLabelStyle}>{field.label}</div>
      {field.helpText && <div style={fieldHelpStyle}>{field.helpText}</div>}
      {children}
    </Card>
  );
}

function ReviewShell({ field, children }) {
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.ink, marginBottom: 4 }}>
        {field.label}
      </div>
      {field.helpText && (
        <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 10 }}>{field.helpText}</div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
          marginTop: field.helpText ? 0 : 8,
        }}
      >
        {children}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// FieldRenderer — the dispatch entry point
// ═══════════════════════════════════════════════════════════

export function FieldRenderer({ field, mode, value, onChange, model }) {
  const type = field.type || 'text';
  const props = { field, mode, value, onChange, model };
  switch (type) {
    case 'checklist':   return <ChecklistField   {...props} />;
    case 'select':      return <SelectField      {...props} />;
    case 'parameters':  return <ParametersField  {...props} />;
    case 'approaches':  return <ApproachesField  {...props} />;
    case 'comparables': return <ComparablesField {...props} />;
    case 'text':
    default:            return <TextField        {...props} />;
  }
}

// -----------------------------------------------------------
// blankAnswerFor — initialize a student's draft answer in the
// shape the field expects, used by ScenarioView to seed state.
// -----------------------------------------------------------
export function blankAnswerFor(field) {
  switch (field.type) {
    case 'checklist':
      return { selected: [], text: '' };
    case 'select':
      return { selected: null, text: '' };
    case 'parameters': {
      const fields = field.options?.fields || [];
      const values = {};
      for (const f of fields) values[f.name] = '';
      return { values, text: '' };
    }
    case 'approaches': {
      const opts = field.options?.options || [];
      return {
        selected: [],
        justifications: new Array(opts.length).fill(''),
        text: '',
      };
    }
    case 'comparables':
      return {
        decisions: {},
        selections: [],
        justification: '',
      };
    case 'text':
    default:
      return '';
  }
}

// -----------------------------------------------------------
// isAnswerComplete — returns true iff the student has done
// enough work in this field to count as "answered". Used by
// ScenarioView's pre-submit validation.
// -----------------------------------------------------------
export function isAnswerComplete(field, value) {
  switch (field.type) {
    case 'checklist':
      return Array.isArray(value?.selected) && value.selected.length > 0;
    case 'select':
      return Number.isInteger(value?.selected);
    case 'parameters': {
      const defs = field.options?.fields || [];
      if (defs.length === 0) return true;
      const values = value?.values || {};
      return defs.every((f) => {
        const v = values[f.name];
        return v != null && String(v).trim() !== '';
      });
    }
    case 'approaches': {
      // At minimum, the student must select at least one and write a
      // justification for every option (selected or not — explaining
      // why each was used or omitted).
      const opts = field.options?.options || [];
      if (!Array.isArray(value?.selected) || value.selected.length === 0) return false;
      const justifs = value?.justifications || [];
      return opts.every((_, idx) => {
        const j = justifs[idx];
        return typeof j === 'string' && j.trim() !== '';
      });
    }
    case 'comparables': {
      // Every comp must have a verdict; rejected comps need a reason.
      // Exactly 3 selections from accepted comps. Justification ≥ 40 chars.
      const comps = field.options?.comps || [];
      const decisions = value?.decisions || {};
      const allDecided = comps.every((c) => {
        const d = decisions[c.id];
        if (!d || !d.verdict) return false;
        if (d.verdict === 'reject' && (!d.reason || !d.reason.trim())) return false;
        return true;
      });
      if (!allDecided) return false;
      const selections = Array.isArray(value?.selections) ? value.selections : [];
      if (selections.length !== 3) return false;
      // All selections must be from accepted comps
      const allFromAccepted = selections.every((id) => decisions[id]?.verdict === 'accept');
      if (!allFromAccepted) return false;
      const justification = typeof value?.justification === 'string' ? value.justification : '';
      return justification.trim().length >= 40;
    }
    case 'text':
    default: {
      const t = typeof value === 'string' ? value : (value?.text ?? '');
      return typeof t === 'string' && t.trim() !== '';
    }
  }
}

// -----------------------------------------------------------
// submitValueFor — produce the value to send up to the API
// for this field. Text fields submit as plain strings (legacy
// shape); structured fields submit as their object.
// -----------------------------------------------------------
export function submitValueFor(field, value) {
  if (field.type === 'text' || !field.type) {
    return typeof value === 'string' ? value : (value?.text ?? '');
  }
  return value;
}
