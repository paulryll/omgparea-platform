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
    case 'checklist':  return <ChecklistField  {...props} />;
    case 'select':     return <SelectField     {...props} />;
    case 'parameters': return <ParametersField {...props} />;
    case 'approaches': return <ApproachesField {...props} />;
    case 'text':
    default:           return <TextField       {...props} />;
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
