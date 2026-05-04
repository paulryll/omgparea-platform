// client/src/field-types.jsx
// -----------------------------------------------------------
// Field type renderers. One component per field type, each
// handling its own three render states:
//
//   - mode='edit'    student is filling in (pre-submit)
//   - mode='locked'  student post-submit, with model revealed
//   - mode='review'  admin side-by-side comparison
//
// The seven types match section_fields.field_type:
//   - text             a textarea
//   - checklist        multi-select checkboxes
//   - select           single-select radio buttons
//   - parameters       labeled grid of small inputs with units
//   - approaches       like checklist + per-option justification
//   - comparables      Section 3: 3-step comp screening + selection
//   - adjustment_grid  Section 4: 4-step adjustment workflow
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

import { useState } from 'react';
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
// ADJUSTMENT GRID (Section 4)
// ═══════════════════════════════════════════════════════════
//
// 4-step workflow over a subject + N comps + 1-6 features.
// Used by Section M2-S4 only.
//
// Mode behaviour:
//   - edit:    stepped UI; one step at a time with internal
//              Back/Continue navigation. After Step 3 is
//              complete, prompts user to scroll to page-level
//              Submit. Step 4 is hidden in edit mode.
//   - locked:  all 4 steps shown sequentially with model
//              values overlaid. Step 4 shows adjusted prices.
//   - review:  same structure as locked; "Student" instead of
//              "Your"; small tally summary at top.
//
// Storage shapes:
//   field.options = {
//     subject: { address, context, difficulty,
//                fact_sheet: [[label, value]...] },
//     comps:   [{ id, label, price, fact_sheet:{label:value} }, ...],
//     features:[{ key, label, unit_label, step3_kind,
//                 subject_units?, comp_units? }, ...],
//     step1_grid: [{ label, subject, comp_values,
//                    feature_key?, diff_comps?,
//                    diff_directions? }, ...],
//     step2: {
//       tabs: [
//         { key:'paired', label, intro, tables:[
//             { kind, feature_key, title, instruction,
//               input_label, input_suffix, rows,
//               column_headers,
//               concluded_label, concluded_helper } ] },
//         { key:'cost', label, intro, items:[
//             { kind:'cost_calc', feature_key, title,
//               fact_rows, input_suffix } ] }
//       ],
//       reconciliation: { instruction,
//                         items:[{ feature_key, label }] }
//     },
//     step3: { instruction,
//              applicable: { compId:[featureKey,...] },
//              method_dropdown:[string,...],
//              support_min_chars },
//     step4: { show_net_gross_panel }
//   }
//
//   value (student answer) = {
//     step1_flags:          { compId:[featureKey,...] },
//     step2_tables: {
//       paired: { featureKey:{ pair_inputs:[...], concluded:'' } },
//       cost:   { featureKey: '' }
//     },
//     step2_reconciliation: { featureKey: '' },
//     step3_adjustments:    { compId:{ featureKey:'' } },
//     step3_support:        { featureKey:{ method, rationale } }
//   }
//
//   model.data = {
//     step1_correct_flags: { compId:[featureKey,...] },
//     step1_rationale: string,
//     step2_tables: {
//       paired: { featureKey:{ pair_answers:[...],
//                              concluded_range:[lo,hi],
//                              rationale } },
//       cost:   { featureKey:{ answer, rationale } }
//     },
//     step2_reconciliation: { featureKey:{ range:[lo,hi],
//                                          rationale } },
//     step3_adjustments: { compId:{ featureKey:{
//       direction, amount?, amount_per_unit?, units?,
//       computed_amount, method, rationale } } },
//     step4_adjusted_prices: { compId:{ unadjusted, adjusted } },
//     step4_reconciliation_narrative: string
//   }
// -----------------------------------------------------------

// ─── Helpers ──────────────────────────────────────────────

const adjFmtMoney = (n) => {
  if (n == null || n === '') return '—';
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[$,\s]/g, '').replace('−', '-'));
  if (isNaN(num)) return String(n);
  const sign = num < 0 ? '−' : (num > 0 ? '+' : '');
  return sign + '$' + Math.abs(Math.round(num)).toLocaleString();
};

const adjFmtMoneyPlain = (n) => {
  if (n == null || n === '') return '—';
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[$,\s]/g, '').replace('−', '-'));
  if (isNaN(num)) return String(n);
  return '$' + Math.round(num).toLocaleString();
};

const adjFmtRange = (range) => {
  if (!Array.isArray(range) || range.length !== 2) return '';
  return `${adjFmtMoneyPlain(range[0])}–${adjFmtMoneyPlain(range[1])}`;
};

// ─── Step bar ─────────────────────────────────────────────

function AdjStepBar({ current, totalSteps, onJump }) {
  const labels = ['Review & Flag', 'Derive Adjustments', 'Apply & Support', 'Results'];
  return (
    <div style={{ display: 'flex', marginBottom: 18, gap: 0 }}>
      {labels.slice(0, totalSteps).map((lbl, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        const clickable = onJump && s <= current;
        return (
          <div key={s} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: done || active ? BRAND.pink : BRAND.line,
                  }}
                />
              )}
              <button
                type="button"
                onClick={clickable ? () => onJump(s) : undefined}
                disabled={!clickable}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  border: 'none',
                  background: done ? BRAND.pink : active ? BRAND.pinkDk : BRAND.line,
                  color: done || active ? '#fff' : BRAND.sub,
                  cursor: clickable ? 'pointer' : 'default',
                }}
              >
                {done ? '✓' : s}
              </button>
              {i < totalSteps - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: done ? BRAND.pink : BRAND.line,
                  }}
                />
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                marginTop: 4,
                color: active ? BRAND.ink : done ? BRAND.pink : BRAND.sub,
                fontWeight: active ? 700 : 400,
              }}
            >
              {lbl}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Subject + assignment context panel ───────────────────

function AdjSubjectPanel({ subject }) {
  if (!subject) return null;
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
      <div style={{ ...sectionLabelStyle, color: BRAND.pink, marginBottom: 6 }}>
        Subject Property
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.ink }}>{subject.address}</div>
      {(subject.context || subject.difficulty) && (
        <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 8 }}>
          {[subject.context, subject.difficulty].filter(Boolean).join(' · ')}
        </div>
      )}
      {Array.isArray(subject.fact_sheet) && subject.fact_sheet.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '4px 14px',
          }}
        >
          {subject.fact_sheet.map(([k, v]) => (
            <div key={k}>
              <div style={compStatLabelStyle}>{k}</div>
              <div style={compStatValueStyle}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Review & Flag grid ───────────────────────────
//
// Big comparison table: features as rows, subject + comps as
// columns. Bottom row in edit mode has checkboxes per
// (comp, feature) to flag for adjustment. In locked/review,
// shows student flags and model flags side-by-side.

function AdjStep1Grid({
  subject,
  comps,
  gridRows,
  features,
  flags,         // { compId: [featureKey, ...] }
  onToggleFlag,  // (compId, featureKey) => void
  mode,
  modelFlags,    // for locked/review modes
  modelRationale, // for locked/review modes
}) {
  const featureMap = {};
  for (const f of features) featureMap[f.key] = f;

  const cellBaseStyle = {
    padding: '8px 12px',
    textAlign: 'center',
    borderBottom: `1px solid ${BRAND.line}`,
    fontSize: 13,
  };
  const labelCellStyle = {
    padding: '8px 12px',
    fontWeight: 600,
    color: BRAND.ink,
    borderBottom: `1px solid ${BRAND.line}`,
    fontSize: 13,
    textAlign: 'left',
  };

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: BRAND.black, color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Feature</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Subject</th>
              {comps.map((c) => (
                <th key={c.id} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                  {c.label || c.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridRows.map((row, ri) => {
              const rowBg = ri % 2 === 0 ? '#fafafa' : '#fff';
              return (
                <tr key={ri} style={{ background: rowBg }}>
                  <td style={labelCellStyle}>{row.label}</td>
                  <td style={{ ...cellBaseStyle, background: '#f3e8ff', fontWeight: 600 }}>
                    {row.subject}
                  </td>
                  {comps.map((c) => {
                    const isDiff = (row.diff_comps || []).includes(c.id);
                    const dir = (row.diff_directions || {})[c.id];
                    const arrow = dir === 'superior' ? ' ▲' : dir === 'inferior' ? ' ▼' : '';
                    return (
                      <td
                        key={c.id}
                        style={{
                          ...cellBaseStyle,
                          background: isDiff ? '#fff8e1' : 'transparent',
                          fontWeight: isDiff ? 700 : 400,
                          color: isDiff ? '#b36000' : BRAND.ink,
                        }}
                      >
                        {row.comp_values?.[c.id] ?? '—'}
                        {arrow}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Flag row */}
            <tr style={{ background: '#fdf2f8' }}>
              <td
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: BRAND.pinkDk,
                  borderTop: `2px solid ${BRAND.pink}`,
                  fontSize: 12,
                }}
              >
                Flag for Adjustment
              </td>
              <td
                style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  color: BRAND.sub,
                  fontSize: 11,
                  fontStyle: 'italic',
                  borderTop: `2px solid ${BRAND.pink}`,
                }}
              >
                Subject
              </td>
              {comps.map((c) => {
                const compFlags = flags[c.id] || [];
                const modelCompFlags = (modelFlags && modelFlags[c.id]) || [];
                return (
                  <td
                    key={c.id}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      borderTop: `2px solid ${BRAND.pink}`,
                    }}
                  >
                    {features.map((f) => {
                      const checked = compFlags.includes(f.key);
                      const modelChecked = modelCompFlags.includes(f.key);
                      if (mode === 'edit') {
                        return (
                          <label
                            key={f.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              fontSize: 12,
                              cursor: 'pointer',
                              marginBottom: 3,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleFlag(c.id, f.key)}
                              style={{ accentColor: BRAND.pink }}
                            />
                            {f.label}
                          </label>
                        );
                      }
                      // locked / review — show student vs model
                      const matched = checked === modelChecked;
                      return (
                        <div
                          key={f.key}
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ color: BRAND.sub }}>{f.label}:</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: checked ? BRAND.pink : BRAND.sub,
                            }}
                            title="Student flag"
                          >
                            {checked ? '☑' : '☐'}
                          </span>
                          <span style={{ color: BRAND.sub }}>/</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: modelChecked ? BRAND.ok : BRAND.sub,
                            }}
                            title="Model flag"
                          >
                            {modelChecked ? '☑' : '☐'}
                          </span>
                          {!matched && (
                            <span style={{ color: '#c62828', fontSize: 10, marginLeft: 2 }}>×</span>
                          )}
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {(mode === 'locked' || mode === 'review') && modelRationale && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: BRAND.okBg,
            border: `1px solid ${BRAND.ok}`,
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <div style={{ ...sectionLabelStyle, color: BRAND.ok, marginBottom: 4 }}>
            Model Rationale
          </div>
          {modelRationale}
        </div>
      )}
      {(mode === 'locked' || mode === 'review') && (
        <div style={{ fontSize: 11, color: BRAND.sub, marginTop: 8 }}>
          Pink ☑ = your flag · Green ☑ = model flag · × = mismatch
        </div>
      )}
    </div>
  );
}

// ─── Step 2 Paired Sales table ────────────────────────────
//
// Renders a paired-sales table whose rows the student fills in.
// Three kinds of value to enter:
//   - paired_dollar_per_unit  → $/SF (or $/unit) per pair
//   - paired_dollar_diff      → flat $ price diff per pair
//   - paired_pct_per_month    → %/mo appreciation per pair
// All three end with a "Concluded" input.

function AdjPairedTable({ table, mode, value, onChange, modelTable }) {
  const isPercent = table.kind === 'paired_pct_per_month';
  const inputs = Array.isArray(value?.pair_inputs) ? value.pair_inputs : [];
  const concluded = typeof value?.concluded === 'string' ? value.concluded : '';
  const modelAnswers = Array.isArray(modelTable?.pair_answers) ? modelTable.pair_answers : [];
  const modelConcluded = modelTable?.concluded_range;
  const modelRationale = modelTable?.rationale;

  const setRow = (idx, v) => {
    const next = inputs.slice();
    while (next.length < (table.rows || []).length) next.push('');
    next[idx] = v;
    onChange({ pair_inputs: next, concluded });
  };
  const setConcluded = (v) => {
    onChange({
      pair_inputs: inputs.length ? inputs : new Array((table.rows || []).length).fill(''),
      concluded: v,
    });
  };

  const headers = (table.column_headers || []).concat([table.input_label || 'Your Answer']);

  return (
    <div style={{ marginBottom: 18 }}>
      <h4 style={{ color: BRAND.ink, fontSize: 14, margin: '0 0 6px' }}>{table.title}</h4>
      {table.instruction && (
        <p style={{ fontSize: 12, color: BRAND.sub, margin: '0 0 10px' }}>{table.instruction}</p>
      )}
      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: BRAND.pinkDk, color: '#fff' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(table.rows || []).map((row, ri) => {
              const studentVal = inputs[ri] || '';
              const modelVal = modelAnswers[ri];
              return (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'center',
                      fontWeight: 700,
                      borderBottom: `1px solid ${BRAND.line}`,
                    }}
                  >
                    {row.label}
                  </td>
                  {(row.cells || []).map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        borderBottom: `1px solid ${BRAND.line}`,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                  <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${BRAND.line}` }}>
                    {mode === 'edit' ? (
                      <NumberInputWithPrefix
                        value={studentVal}
                        onChange={(v) => setRow(ri, v)}
                        prefix={isPercent ? '' : '$'}
                        suffix={isPercent ? '%/mo' : table.input_suffix}
                        width={isPercent ? 70 : 75}
                      />
                    ) : (
                      <PairedRowReview
                        studentVal={studentVal}
                        modelVal={modelVal}
                        prefix={isPercent ? '' : '$'}
                        suffix={isPercent ? '%/mo' : table.input_suffix}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Concluded value row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: '#f3e8ff',
          border: `1px solid ${BRAND.pink}`,
          borderRadius: 6,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.ink, flexShrink: 0 }}>
          {table.concluded_label || 'Concluded'}:
        </span>
        {mode === 'edit' ? (
          <NumberInputWithPrefix
            value={concluded}
            onChange={setConcluded}
            prefix={isPercent ? '' : '$'}
            suffix={isPercent ? '%/mo' : table.input_suffix}
            width={isPercent ? 70 : 75}
          />
        ) : (
          <PairedRowReview
            studentVal={concluded}
            modelVal={Array.isArray(modelConcluded) ? `${modelConcluded[0]}–${modelConcluded[1]}` : null}
            prefix={isPercent ? '' : '$'}
            suffix={isPercent ? '%/mo' : table.input_suffix}
            modelIsRange
          />
        )}
        {table.concluded_helper && mode === 'edit' && (
          <span style={{ fontSize: 11, color: BRAND.sub }}>{table.concluded_helper}</span>
        )}
      </div>
      {(mode === 'locked' || mode === 'review') && modelRationale && (
        <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 6, fontStyle: 'italic' }}>
          {modelRationale}
        </div>
      )}
    </div>
  );
}

// Small helper: $-prefixed input with optional suffix
function NumberInputWithPrefix({ value, onChange, prefix = '$', suffix, width = 80 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {prefix && (
        <span
          style={{
            padding: '0 6px',
            background: '#f3f4f6',
            border: `1px solid ${BRAND.line}`,
            borderRight: 'none',
            borderRadius: '4px 0 0 4px',
            fontSize: 12,
            lineHeight: '30px',
            color: BRAND.sub,
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width,
          padding: '5px 6px',
          border: `1px solid ${BRAND.line}`,
          borderLeft: prefix ? 'none' : `1px solid ${BRAND.line}`,
          borderRight: suffix ? 'none' : `1px solid ${BRAND.line}`,
          borderRadius: prefix
            ? suffix
              ? '0'
              : '0 4px 4px 0'
            : suffix
              ? '4px 0 0 4px'
              : '4px',
          outline: 'none',
          fontSize: 13,
          fontFamily: 'inherit',
          textAlign: 'right',
        }}
      />
      {suffix && (
        <span
          style={{
            padding: '0 6px',
            background: '#f3f4f6',
            border: `1px solid ${BRAND.line}`,
            borderLeft: 'none',
            borderRadius: '0 4px 4px 0',
            fontSize: 12,
            lineHeight: '30px',
            color: BRAND.sub,
          }}
        >
          {suffix}
        </span>
      )}
    </span>
  );
}

// Small helper: side-by-side display of student value + model value
function PairedRowReview({ studentVal, modelVal, prefix, suffix, modelIsRange }) {
  return (
    <div style={{ fontSize: 12, display: 'flex', justifyContent: 'center', gap: 10 }}>
      <span style={{ color: BRAND.pink }}>
        <span style={{ fontWeight: 600 }}>You:</span>{' '}
        {studentVal ? `${prefix}${studentVal}${suffix || ''}` : <em style={{ color: BRAND.sub }}>—</em>}
      </span>
      <span style={{ color: BRAND.ok }}>
        <span style={{ fontWeight: 600 }}>Model:</span>{' '}
        {modelVal != null
          ? modelIsRange
            ? `${prefix}${modelVal}${suffix || ''}`
            : `${prefix}${modelVal}${suffix || ''}`
          : <em style={{ color: BRAND.sub }}>—</em>}
      </span>
    </div>
  );
}

// ─── Step 2 Cost calc ─────────────────────────────────────

function AdjCostCalc({ item, mode, value, onChange, modelItem }) {
  const studentVal = typeof value === 'string' ? value : '';
  const modelVal = modelItem?.answer;
  const modelRationale = modelItem?.rationale;

  return (
    <div
      style={{
        background: '#f9fafb',
        border: `1px solid ${BRAND.line}`,
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ fontWeight: 700, color: BRAND.ink, fontSize: 13, marginBottom: 10 }}>
        {item.title}
      </div>
      <table style={{ fontSize: 12, borderCollapse: 'collapse', marginBottom: 12 }}>
        <tbody>
          {(item.fact_rows || []).map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '3px 18px 3px 0', color: BRAND.sub }}>{k}</td>
              <td style={{ padding: '3px 0', fontWeight: 600, color: BRAND.ink }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: BRAND.ink, fontSize: 13 }}>Your Answer:</span>
        {mode === 'edit' ? (
          <NumberInputWithPrefix
            value={studentVal}
            onChange={onChange}
            prefix="$"
            suffix={item.input_suffix}
            width={85}
          />
        ) : (
          <PairedRowReview
            studentVal={studentVal}
            modelVal={modelVal != null ? String(modelVal) : null}
            prefix="$"
            suffix={item.input_suffix}
          />
        )}
      </div>
      {(mode === 'locked' || mode === 'review') && modelRationale && (
        <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 8, fontStyle: 'italic' }}>
          {modelRationale}
        </div>
      )}
    </div>
  );
}

// ─── Step 2 Reconciliation panel ──────────────────────────

function AdjStep2Reconcile({ reconc, features, value, onChange, mode, modelData }) {
  const featureMap = {};
  for (const f of features) featureMap[f.key] = f;

  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 18,
        borderTop: `2px solid ${BRAND.line}`,
      }}
    >
      <h4 style={{ color: BRAND.ink, fontSize: 15, margin: '0 0 6px' }}>
        ⚖️ Reconcile Your Results
      </h4>
      {reconc.instruction && (
        <p style={{ fontSize: 12, color: BRAND.sub, margin: '0 0 12px' }}>{reconc.instruction}</p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {(reconc.items || []).map((item) => {
          const feat = featureMap[item.feature_key] || {};
          const studentVal = value[item.feature_key] || '';
          const modelEntry = modelData ? modelData[item.feature_key] : null;
          const modelRange = modelEntry?.range;
          const modelRationale = modelEntry?.rationale;
          return (
            <div
              key={item.feature_key}
              style={{
                background: '#fdf2f8',
                border: `1px solid ${BRAND.pink}`,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: BRAND.pinkDk, fontSize: 13, marginBottom: 8 }}>
                {item.label}
              </div>
              {mode === 'edit' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: BRAND.sub, flexShrink: 0 }}>Reconciled:</span>
                  <NumberInputWithPrefix
                    value={studentVal}
                    onChange={(v) =>
                      onChange({ ...value, [item.feature_key]: v })
                    }
                    prefix="$"
                    suffix={feat.unit_label === '$/SF' ? '/SF' : ''}
                    width={85}
                  />
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: BRAND.pink, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>You:</span>{' '}
                    {studentVal ? `$${studentVal}` : <em style={{ color: BRAND.sub }}>—</em>}
                  </div>
                  {modelRange && (
                    <div style={{ fontSize: 12, color: BRAND.ok, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>Model range:</span>{' '}
                      {adjFmtRange(modelRange)}
                    </div>
                  )}
                  {modelRationale && (
                    <div
                      style={{
                        fontSize: 11,
                        color: BRAND.sub,
                        marginTop: 6,
                        fontStyle: 'italic',
                        lineHeight: 1.4,
                      }}
                    >
                      {modelRationale}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Apply & Support ──────────────────────────────

function AdjStep3Apply({
  step3,
  comps,
  features,
  flags,            // student flags from step 1, used as a hint
  value,            // student.step3_adjustments
  onChange,
  mode,
  modelAdjustments,
}) {
  const featureMap = {};
  for (const f of features) featureMap[f.key] = f;
  const applicable = step3.applicable || {};

  return (
    <div>
      {step3.instruction && (
        <p style={{ fontSize: 13, color: BRAND.sub, margin: '0 0 14px', lineHeight: 1.55 }}>
          {step3.instruction}
        </p>
      )}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: BRAND.black, color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Comparable</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Sale Price</th>
              {features.map((f) => (
                <th key={f.key} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                  {f.label} Adj.
                </th>
              ))}
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                Adjusted
              </th>
            </tr>
          </thead>
          <tbody>
            {comps.map((c, ci) => {
              const compApplicable = applicable[c.id] || [];
              const compAdjustments = (value && value[c.id]) || {};
              const sumAdjustments = Object.values(compAdjustments).reduce((acc, v) => {
                const n = parseFloat(String(v).replace(/[$,\s]/g, '').replace('−', '-'));
                return acc + (isNaN(n) ? 0 : n);
              }, 0);
              const adjusted = (c.price || 0) + sumAdjustments;
              return (
                <tr key={c.id} style={{ background: ci % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontWeight: 600,
                      color: BRAND.ink,
                      borderBottom: `1px solid ${BRAND.line}`,
                    }}
                  >
                    {c.label || c.id}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${BRAND.line}`,
                    }}
                  >
                    {adjFmtMoneyPlain(c.price)}
                  </td>
                  {features.map((f) => {
                    const isApplicable = compApplicable.includes(f.key);
                    const studentVal = compAdjustments[f.key] || '';
                    const modelComp = modelAdjustments && modelAdjustments[c.id];
                    const modelEntry = modelComp && modelComp[f.key];
                    const modelComputed = modelEntry?.computed_amount;
                    if (!isApplicable) {
                      return (
                        <td
                          key={f.key}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                            color: BRAND.sub,
                            borderBottom: `1px solid ${BRAND.line}`,
                          }}
                        >
                          —
                        </td>
                      );
                    }
                    return (
                      <td
                        key={f.key}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'center',
                          borderBottom: `1px solid ${BRAND.line}`,
                        }}
                      >
                        {mode === 'edit' ? (
                          <input
                            type="text"
                            value={studentVal}
                            onChange={(e) => {
                              const next = { ...(value || {}) };
                              next[c.id] = { ...(next[c.id] || {}), [f.key]: e.target.value };
                              onChange(next);
                            }}
                            placeholder="±$"
                            style={{
                              width: 90,
                              padding: '5px 8px',
                              border: `1px solid ${BRAND.line}`,
                              borderRadius: 4,
                              fontSize: 13,
                              textAlign: 'right',
                              outline: 'none',
                              fontFamily: 'inherit',
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: 12 }}>
                            <div style={{ color: BRAND.pink, fontWeight: 600 }}>
                              You: {studentVal ? adjFmtMoney(studentVal) : '—'}
                            </div>
                            {modelComputed != null && (
                              <div style={{ color: BRAND.ok, fontWeight: 600 }}>
                                Model: {adjFmtMoney(modelComputed)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: BRAND.ink,
                      borderBottom: `1px solid ${BRAND.line}`,
                      background: '#fdf2f8',
                    }}
                  >
                    {adjFmtMoneyPlain(Math.round(adjusted / 50) * 50)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Step 3 Support cards (per-feature method + rationale) ─

function AdjStep3Support({
  step3,
  features,
  value,            // student.step3_support
  onChange,
  mode,
  modelAdjustments, // we pull method/rationale per feature from this
}) {
  const minChars = step3.support_min_chars || 15;
  const methods = step3.method_dropdown || [];

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ color: BRAND.ink, fontSize: 14, margin: '0 0 10px' }}>Support Your Adjustments</h4>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {features.map((f) => {
          const studentSupport = (value && value[f.key]) || {};
          const studentMethod = studentSupport.method || '';
          const studentRationale = studentSupport.rationale || '';
          // Pull a representative model entry for this feature: take the
          // first comp where this feature is applicable, use that model
          // method/rationale as the canonical model support for the feature.
          let modelMethod = null;
          let modelRationale = null;
          if (modelAdjustments) {
            for (const compId of Object.keys(modelAdjustments)) {
              const fEntry = modelAdjustments[compId]?.[f.key];
              if (fEntry) {
                modelMethod = fEntry.method;
                modelRationale = fEntry.rationale;
                break;
              }
            }
          }

          return (
            <div
              key={f.key}
              style={{
                background: '#f9fafb',
                border: `1px solid ${BRAND.line}`,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: BRAND.ink, fontSize: 13, marginBottom: 10 }}>
                {f.label} Adjustment
              </div>
              {mode === 'edit' ? (
                <>
                  <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 4 }}>
                    Support Methodology
                  </div>
                  <select
                    value={studentMethod}
                    onChange={(e) =>
                      onChange({
                        ...(value || {}),
                        [f.key]: { ...studentSupport, method: e.target.value },
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      border: `1px solid ${BRAND.line}`,
                      borderRadius: 5,
                      fontSize: 13,
                      background: '#fff',
                      color: studentMethod ? BRAND.ink : BRAND.sub,
                      marginBottom: 10,
                    }}
                  >
                    <option value="">— Select —</option>
                    {methods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 4 }}>
                    Brief Rationale
                  </div>
                  <textarea
                    value={studentRationale}
                    onChange={(e) =>
                      onChange({
                        ...(value || {}),
                        [f.key]: { ...studentSupport, rationale: e.target.value },
                      })
                    }
                    rows={3}
                    placeholder="Identify the data used and how it supports your concluded adjustment..."
                    style={{
                      width: '100%',
                      padding: 8,
                      border: `1px solid ${BRAND.line}`,
                      borderRadius: 5,
                      fontSize: 13,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: BRAND.sub,
                      marginTop: 4,
                      textAlign: 'right',
                    }}
                  >
                    {studentRationale.length} characters {studentRationale.trim().length < minChars ? `(min ${minChars})` : ''}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ ...studentAnswerBoxStyle, marginBottom: 8 }}>
                    <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>
                      {mode === 'review' ? 'Student' : 'Your'} Method
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {studentMethod || emptyBox('(none)')}
                    </div>
                    <div
                      style={{
                        ...sectionLabelStyle,
                        color: BRAND.sub,
                        fontSize: 10,
                        marginTop: 6,
                      }}
                    >
                      {mode === 'review' ? 'Student' : 'Your'} Rationale
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                      {studentRationale || emptyBox('(none)')}
                    </div>
                  </div>
                  {(modelMethod || modelRationale) && (
                    <div style={modelAnswerBoxStyle}>
                      <div style={{ ...sectionLabelStyle, color: BRAND.ok, fontSize: 10 }}>
                        Model Method
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {modelMethod || emptyBox('(none)')}
                      </div>
                      {modelRationale && (
                        <>
                          <div
                            style={{
                              ...sectionLabelStyle,
                              color: BRAND.ok,
                              fontSize: 10,
                              marginTop: 6,
                            }}
                          >
                            Model Rationale
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                            {modelRationale}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4 Results table ─────────────────────────────────

function AdjStep4Results({ comps, features, applicable, studentAdjustments, modelData, narrative }) {
  const modelAdjusted = modelData?.step4_adjusted_prices || {};
  const modelAdjustments = modelData?.step3_adjustments || {};

  const computeAdjusted = (price, adjustments) => {
    if (!adjustments) return price;
    const sum = Object.values(adjustments).reduce((acc, v) => {
      const n = parseFloat(String(v).replace(/[$,\s]/g, '').replace('−', '-'));
      return acc + (isNaN(n) ? 0 : n);
    }, 0);
    return price + sum;
  };

  return (
    <div>
      <h4 style={{ color: BRAND.ink, fontSize: 14, margin: '0 0 10px' }}>
        Adjusted Sale Prices
      </h4>
      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: BRAND.black, color: '#fff' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Item</th>
              {comps.map((c) => (
                <th key={c.id} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                  {c.label || c.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: `1px solid ${BRAND.line}` }}>
                Sale Price
              </td>
              {comps.map((c) => (
                <td
                  key={c.id}
                  style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: 600,
                    borderBottom: `1px solid ${BRAND.line}`,
                  }}
                >
                  {adjFmtMoneyPlain(c.price)}
                </td>
              ))}
            </tr>
            {features.map((f) => (
              <tr key={f.key}>
                <td style={{ padding: '8px 10px', borderBottom: `1px solid ${BRAND.line}`, color: BRAND.sub }}>
                  {f.label}
                </td>
                {comps.map((c) => {
                  const studentAdj = studentAdjustments?.[c.id]?.[f.key];
                  const modelEntry = modelAdjustments?.[c.id]?.[f.key];
                  const modelAmt = modelEntry?.computed_amount ?? modelEntry?.amount;
                  return (
                    <td
                      key={c.id}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        borderBottom: `1px solid ${BRAND.line}`,
                        fontSize: 12,
                      }}
                    >
                      {studentAdj || modelAmt != null ? (
                        <>
                          <div style={{ color: BRAND.pink, fontWeight: 600 }}>
                            {studentAdj ? adjFmtMoney(studentAdj) : '—'}
                          </div>
                          {modelAmt != null && (
                            <div style={{ color: BRAND.ok, fontWeight: 600 }}>
                              {adjFmtMoney(modelAmt)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: BRAND.sub }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr style={{ background: BRAND.black }}>
              <td style={{ padding: '10px', color: '#fff', fontWeight: 700 }}>
                Adjusted Sale Price
              </td>
              {comps.map((c) => {
                const studentAdjusted = computeAdjusted(c.price, studentAdjustments?.[c.id]);
                const modelEntry = modelAdjusted[c.id];
                return (
                  <td
                    key={c.id}
                    style={{ padding: '10px', textAlign: 'center', color: '#fff' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#ffd2eb' }}>
                      {adjFmtMoneyPlain(Math.round(studentAdjusted / 50) * 50)}
                    </div>
                    {modelEntry?.adjusted != null && (
                      <div style={{ fontSize: 11, opacity: 0.85, color: '#bff7d2' }}>
                        Model: {adjFmtMoneyPlain(modelEntry.adjusted)}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: BRAND.sub, marginBottom: 14 }}>
        Pink = your values · Green = model values
      </div>
      {narrative && (
        <div
          style={{
            ...modelAnswerBoxStyle,
          }}
        >
          <div style={{ ...sectionLabelStyle, color: BRAND.ok }}>Model Reconciliation</div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{narrative}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main component: AdjustmentGridField ──────────────────

function AdjustmentGridField({ field, mode, value, onChange, model }) {
  const opts = field.options || {};
  const subject = opts.subject;
  const comps = Array.isArray(opts.comps) ? opts.comps : [];
  const features = Array.isArray(opts.features) ? opts.features : [];
  const gridRows = Array.isArray(opts.step1_grid) ? opts.step1_grid : [];
  const step2 = opts.step2 || {};
  const step3 = opts.step3 || {};

  const md = model?.data || {};

  const [step, setStep] = useState(1);
  const [step2Tab, setStep2Tab] = useState('paired');

  // Defensive: defensively shape value so all reads below don't NPE
  const v = value || {};
  const studentFlags = v.step1_flags || {};
  const studentTables = v.step2_tables || {};
  const studentRecon = v.step2_reconciliation || {};
  const studentAdj = v.step3_adjustments || {};
  const studentSupport = v.step3_support || {};

  // Setters scoped to this scenario's value object
  const updateValue = (patch) => onChange({ ...v, ...patch });
  const toggleFlag = (compId, featureKey) => {
    const list = studentFlags[compId] ? [...studentFlags[compId]] : [];
    const idx = list.indexOf(featureKey);
    if (idx === -1) list.push(featureKey);
    else list.splice(idx, 1);
    updateValue({ step1_flags: { ...studentFlags, [compId]: list } });
  };
  const setStep2TableValue = (tabKey, featureKey, val) => {
    const tab = studentTables[tabKey] || {};
    updateValue({
      step2_tables: {
        ...studentTables,
        [tabKey]: { ...tab, [featureKey]: val },
      },
    });
  };
  const setReconciliation = (next) => updateValue({ step2_reconciliation: next });
  const setStep3Adj = (next) => updateValue({ step3_adjustments: next });
  const setStep3Support = (next) => updateValue({ step3_support: next });

  // ── EDIT MODE ──────────────────────────────────────────
  if (mode === 'edit') {
    const allReconFilled = features.every(
      (f) => (studentRecon[f.key] || '').toString().trim() !== ''
    );
    const applicable = step3.applicable || {};
    const allStep3Filled = Object.entries(applicable).every(([compId, featList]) =>
      featList.every((fk) => {
        const cell = studentAdj[compId]?.[fk];
        return cell != null && String(cell).trim() !== '';
      })
    );
    const minChars = step3.support_min_chars || 15;
    const allSupportFilled = features.every((f) => {
      const sup = studentSupport[f.key];
      if (!sup || !sup.method || !sup.method.trim()) return false;
      if (!sup.rationale || sup.rationale.trim().length < minChars) return false;
      return true;
    });
    const step3Ready = allStep3Filled && allSupportFilled;

    return (
      <FieldShell field={field}>
        <AdjSubjectPanel subject={subject} />
        <AdjStepBar
          current={step}
          totalSteps={3}
          onJump={setStep}
        />

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 13, color: BRAND.sub, margin: '0 0 14px', lineHeight: 1.55 }}>
              Review the subject and the {comps.length} pre-selected comparables. For each comp,
              flag the features that require an adjustment. Leave boxes unchecked where the comp
              equals the subject.
            </p>
            <AdjStep1Grid
              subject={subject}
              comps={comps}
              gridRows={gridRows}
              features={features}
              flags={studentFlags}
              onToggleFlag={toggleFlag}
              mode="edit"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: BRAND.pink,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Continue to Step 2 →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: BRAND.sub, margin: '0 0 14px', lineHeight: 1.55 }}>
              Use the supporting market data to extract contributory values for each adjustment
              type. Complete the Paired Sales tab, then reconcile. The Cost tab is optional but
              recommended for ceiling support.
            </p>
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                borderBottom: `2px solid ${BRAND.line}`,
                marginBottom: 18,
              }}
            >
              {(step2.tabs || []).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStep2Tab(t.key)}
                  style={{
                    padding: '10px 18px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: step2Tab === t.key ? 700 : 400,
                    color: step2Tab === t.key ? BRAND.ink : BRAND.sub,
                    borderBottom:
                      step2Tab === t.key ? `3px solid ${BRAND.pink}` : '3px solid transparent',
                    fontSize: 14,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            {(step2.tabs || []).map((t) => {
              if (t.key !== step2Tab) return null;
              if (t.key === 'paired') {
                return (
                  <div key={t.key}>
                    {(t.tables || []).map((tbl, ti) => (
                      <AdjPairedTable
                        key={ti}
                        table={tbl}
                        mode="edit"
                        value={studentTables.paired?.[tbl.feature_key]}
                        onChange={(val) => setStep2TableValue('paired', tbl.feature_key, val)}
                      />
                    ))}
                  </div>
                );
              }
              if (t.key === 'cost') {
                return (
                  <div key={t.key}>
                    {(t.items || []).map((item, ii) => (
                      <AdjCostCalc
                        key={ii}
                        item={item}
                        mode="edit"
                        value={studentTables.cost?.[item.feature_key]}
                        onChange={(val) => setStep2TableValue('cost', item.feature_key, val)}
                      />
                    ))}
                  </div>
                );
              }
              return null;
            })}

            {/* Reconciliation panel */}
            {step2.reconciliation && (
              <AdjStep2Reconcile
                reconc={step2.reconciliation}
                features={features}
                value={studentRecon}
                onChange={setReconciliation}
                mode="edit"
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: `1px solid ${BRAND.line}`,
                  background: '#fff',
                  color: BRAND.sub,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ← Step 1
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!allReconFilled}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: allReconFilled ? BRAND.pink : BRAND.line,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: allReconFilled ? 'pointer' : 'not-allowed',
                }}
              >
                Continue to Step 3 →
              </button>
            </div>
            {!allReconFilled && (
              <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 8, textAlign: 'right' }}>
                Fill a reconciled value for every feature to advance.
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <AdjStep3Apply
              step3={step3}
              comps={comps}
              features={features}
              flags={studentFlags}
              value={studentAdj}
              onChange={setStep3Adj}
              mode="edit"
            />
            <AdjStep3Support
              step3={step3}
              features={features}
              value={studentSupport}
              onChange={setStep3Support}
              mode="edit"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: `1px solid ${BRAND.line}`,
                  background: '#fff',
                  color: BRAND.sub,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ← Step 2
              </button>
              <div style={{ fontSize: 13, color: BRAND.sub, fontStyle: 'italic' }}>
                {step3Ready ? (
                  <span style={{ color: BRAND.ok, fontWeight: 600, fontStyle: 'normal' }}>
                    ✓ All steps complete — scroll down to Submit
                  </span>
                ) : (
                  <>Fill every adjustment, method, and rationale ({minChars}+ chars) to enable Submit.</>
                )}
              </div>
            </div>
          </div>
        )}
      </FieldShell>
    );
  }

  // ── LOCKED MODE (post-submit, model revealed) ─────────
  if (mode === 'locked') {
    return (
      <FieldShell field={field}>
        <AdjSubjectPanel subject={subject} />

        {/* Step 1 */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
            Step 1 — Review & Flag
          </h3>
          <AdjStep1Grid
            subject={subject}
            comps={comps}
            gridRows={gridRows}
            features={features}
            flags={studentFlags}
            onToggleFlag={() => {}}
            mode="locked"
            modelFlags={md.step1_correct_flags}
            modelRationale={md.step1_rationale}
          />
        </div>

        {/* Step 2 — show all tables side-by-side with model values + reconciliation */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
            Step 2 — Derive Adjustments
          </h3>
          {(step2.tabs || []).map((t) => (
            <div key={t.key} style={{ marginBottom: 14 }}>
              <div style={{ ...sectionLabelStyle, color: BRAND.sub, marginBottom: 8 }}>
                {t.label}
              </div>
              {t.key === 'paired' &&
                (t.tables || []).map((tbl, ti) => (
                  <AdjPairedTable
                    key={ti}
                    table={tbl}
                    mode="locked"
                    value={studentTables.paired?.[tbl.feature_key]}
                    onChange={() => {}}
                    modelTable={md.step2_tables?.paired?.[tbl.feature_key]}
                  />
                ))}
              {t.key === 'cost' &&
                (t.items || []).map((item, ii) => (
                  <AdjCostCalc
                    key={ii}
                    item={item}
                    mode="locked"
                    value={studentTables.cost?.[item.feature_key]}
                    onChange={() => {}}
                    modelItem={md.step2_tables?.cost?.[item.feature_key]}
                  />
                ))}
            </div>
          ))}
          {step2.reconciliation && (
            <AdjStep2Reconcile
              reconc={step2.reconciliation}
              features={features}
              value={studentRecon}
              onChange={() => {}}
              mode="locked"
              modelData={md.step2_reconciliation}
            />
          )}
        </div>

        {/* Step 3 */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
            Step 3 — Apply & Support
          </h3>
          <AdjStep3Apply
            step3={step3}
            comps={comps}
            features={features}
            flags={studentFlags}
            value={studentAdj}
            onChange={() => {}}
            mode="locked"
            modelAdjustments={md.step3_adjustments}
          />
          <AdjStep3Support
            step3={step3}
            features={features}
            value={studentSupport}
            onChange={() => {}}
            mode="locked"
            modelAdjustments={md.step3_adjustments}
          />
        </div>

        {/* Step 4 */}
        <div>
          <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
            Step 4 — Results & Reconciliation
          </h3>
          <AdjStep4Results
            comps={comps}
            features={features}
            applicable={step3.applicable}
            studentAdjustments={studentAdj}
            modelData={md}
            narrative={md.step4_reconciliation_narrative}
          />
        </div>
      </FieldShell>
    );
  }

  // ── REVIEW MODE (admin) ────────────────────────────────
  // Same content as locked, but with a small tally summary at top.
  const minChars = step3.support_min_chars || 15;
  const totalAdjCells = Object.values(step3.applicable || {}).reduce(
    (a, list) => a + (Array.isArray(list) ? list.length : 0),
    0
  );
  const filledAdjCells = Object.entries(step3.applicable || {}).reduce((acc, [compId, list]) => {
    return (
      acc +
      list.filter((fk) => {
        const v = studentAdj?.[compId]?.[fk];
        return v != null && String(v).trim() !== '';
      }).length
    );
  }, 0);
  const supportedFeatures = features.filter((f) => {
    const sup = studentSupport?.[f.key];
    return sup && sup.method && (sup.rationale || '').trim().length >= minChars;
  }).length;

  return (
    <FieldShell field={field}>
      <AdjSubjectPanel subject={subject} />

      {/* Tally summary card */}
      <div
        style={{
          background: '#f9fafb',
          border: `1px solid ${BRAND.line}`,
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          fontSize: 13,
        }}
      >
        <div>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>
            Adjustments filled
          </div>
          <div style={{ color: BRAND.ink, fontWeight: 700, fontSize: 16 }}>
            {filledAdjCells} / {totalAdjCells}
          </div>
        </div>
        <div>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>
            Features supported
          </div>
          <div style={{ color: BRAND.ink, fontWeight: 700, fontSize: 16 }}>
            {supportedFeatures} / {features.length}
          </div>
        </div>
        <div>
          <div style={{ ...sectionLabelStyle, color: BRAND.sub, fontSize: 10 }}>
            Comps in grid
          </div>
          <div style={{ color: BRAND.ink, fontWeight: 700, fontSize: 16 }}>{comps.length}</div>
        </div>
      </div>

      {/* Step 1 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
          Step 1 — Review & Flag
        </h3>
        <AdjStep1Grid
          subject={subject}
          comps={comps}
          gridRows={gridRows}
          features={features}
          flags={studentFlags}
          onToggleFlag={() => {}}
          mode="review"
          modelFlags={md.step1_correct_flags}
          modelRationale={md.step1_rationale}
        />
      </div>

      {/* Step 2 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
          Step 2 — Derive Adjustments
        </h3>
        {(step2.tabs || []).map((t) => (
          <div key={t.key} style={{ marginBottom: 14 }}>
            <div style={{ ...sectionLabelStyle, color: BRAND.sub, marginBottom: 8 }}>
              {t.label}
            </div>
            {t.key === 'paired' &&
              (t.tables || []).map((tbl, ti) => (
                <AdjPairedTable
                  key={ti}
                  table={tbl}
                  mode="review"
                  value={studentTables.paired?.[tbl.feature_key]}
                  onChange={() => {}}
                  modelTable={md.step2_tables?.paired?.[tbl.feature_key]}
                />
              ))}
            {t.key === 'cost' &&
              (t.items || []).map((item, ii) => (
                <AdjCostCalc
                  key={ii}
                  item={item}
                  mode="review"
                  value={studentTables.cost?.[item.feature_key]}
                  onChange={() => {}}
                  modelItem={md.step2_tables?.cost?.[item.feature_key]}
                />
              ))}
          </div>
        ))}
        {step2.reconciliation && (
          <AdjStep2Reconcile
            reconc={step2.reconciliation}
            features={features}
            value={studentRecon}
            onChange={() => {}}
            mode="review"
            modelData={md.step2_reconciliation}
          />
        )}
      </div>

      {/* Step 3 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
          Step 3 — Apply & Support
        </h3>
        <AdjStep3Apply
          step3={step3}
          comps={comps}
          features={features}
          flags={studentFlags}
          value={studentAdj}
          onChange={() => {}}
          mode="review"
          modelAdjustments={md.step3_adjustments}
        />
        <AdjStep3Support
          step3={step3}
          features={features}
          value={studentSupport}
          onChange={() => {}}
          mode="review"
          modelAdjustments={md.step3_adjustments}
        />
      </div>

      {/* Step 4 */}
      <div>
        <h3 style={{ ...sectionLabelStyle, color: BRAND.ink, marginBottom: 10 }}>
          Step 4 — Results & Reconciliation
        </h3>
        <AdjStep4Results
          comps={comps}
          features={features}
          applicable={step3.applicable}
          studentAdjustments={studentAdj}
          modelData={md}
          narrative={md.step4_reconciliation_narrative}
        />
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
    case 'comparables':     return <ComparablesField    {...props} />;
    case 'adjustment_grid': return <AdjustmentGridField {...props} />;
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
    case 'adjustment_grid':
      return {
        step1_flags: {},
        step2_tables: { paired: {}, cost: {} },
        step2_reconciliation: {},
        step3_adjustments: {},
        step3_support: {},
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
    case 'adjustment_grid': {
      // Strict: every reconciliation value, every applicable adjustment cell,
      // and every per-feature support entry (method + rationale ≥ minChars)
      // must be filled.
      const opts = field.options || {};
      const features = Array.isArray(opts.features) ? opts.features : [];
      const applicable = (opts.step3 && opts.step3.applicable) || {};
      const minChars = (opts.step3 && opts.step3.support_min_chars) || 15;
      const recon = (value && value.step2_reconciliation) || {};
      const adj = (value && value.step3_adjustments) || {};
      const sup = (value && value.step3_support) || {};
      // Reconciliation: one value per feature
      for (const f of features) {
        const v = recon[f.key];
        if (v == null || String(v).trim() === '') return false;
      }
      // Step 3 adjustments: one per (compId, featureKey) in applicable map
      for (const compId of Object.keys(applicable)) {
        for (const fk of (applicable[compId] || [])) {
          const v = adj[compId] && adj[compId][fk];
          if (v == null || String(v).trim() === '') return false;
        }
      }
      // Step 3 support: method + rationale per feature
      for (const f of features) {
        const s = sup[f.key];
        if (!s || !s.method || !String(s.method).trim()) return false;
        if (!s.rationale || String(s.rationale).trim().length < minChars) return false;
      }
      return true;
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
