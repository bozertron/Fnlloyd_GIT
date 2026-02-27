// !Fnlloyd STUDIO — Pure UI builder helpers
// All functions create DOM elements with gold/obsidian theme styling.
// None hold state — they accept callbacks for interactivity.

// ─── Section builders ───────────────────────────────────────────────────────────

export function buildSection(title: string, children: HTMLElement[]): HTMLElement {
  const sec = document.createElement('div');
  Object.assign(sec.style, { marginBottom: '20px' });
  const h = document.createElement('div');
  h.textContent = title;
  Object.assign(h.style, {
    color: '#C5A028', fontSize: '13px', fontWeight: 'bold',
    letterSpacing: '2px', marginBottom: '10px',
    borderBottom: '1px solid rgba(197,160,40,0.3)', paddingBottom: '6px',
    fontFamily: "'Marcellus SC', serif",
  });
  sec.appendChild(h);
  children.forEach(c => sec.appendChild(c));
  return sec;
}

// Alias — left sections are identical to right sections
export const buildLeftSection = buildSection;

// ─── Control builders ───────────────────────────────────────────────────────────

export function buildSlider(label: string, min: number, max: number, def: number, step: number, cb: (v: number) => void): HTMLElement {
  const row = document.createElement('div');
  Object.assign(row.style, { marginBottom: '10px' });
  const lbl = document.createElement('div');
  lbl.style.color = '#ccc'; lbl.style.fontSize = '13px'; lbl.style.marginBottom = '4px';
  const valSpan = document.createElement('span');
  valSpan.style.color = '#F4C430'; valSpan.style.fontFamily = "'VT323', monospace"; valSpan.style.fontSize = '15px'; valSpan.textContent = String(def);
  lbl.textContent = label;
  lbl.appendChild(valSpan);
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = String(min); inp.max = String(max);
  inp.step = String(step); inp.value = String(def);
  inp.style.cssText = 'width:100%; accent-color:#C5A028;';
  inp.oninput = () => { const v = parseFloat(inp.value); valSpan.textContent = String(v); cb(v); };
  row.appendChild(lbl); row.appendChild(inp);
  return row;
}

export function buildColorRow(label: string, def: string, cb: (c: string) => void): HTMLElement {
  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' });
  const lbl = document.createElement('span');
  lbl.textContent = label; lbl.style.color = '#ccc'; lbl.style.fontSize = '13px'; lbl.style.flex = '1';
  const inp = document.createElement('input');
  inp.type = 'color'; inp.value = def;
  inp.style.cssText = 'width:40px; height:28px; border:1px solid #333; border-radius:4px; cursor:pointer;';
  inp.oninput = () => cb(inp.value);
  row.appendChild(lbl); row.appendChild(inp);
  return row;
}

export function buildToggleRow(label: string, def: boolean, cb: (on: boolean) => void): HTMLElement {
  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' });
  const lbl = document.createElement('span');
  lbl.textContent = label; lbl.style.color = '#ccc'; lbl.style.fontSize = '13px'; lbl.style.flex = '1';
  const inp = document.createElement('input');
  inp.type = 'checkbox'; inp.checked = def;
  inp.style.accentColor = '#C5A028'; inp.style.width = '16px'; inp.style.height = '16px';
  inp.onchange = () => cb(inp.checked);
  row.appendChild(lbl); row.appendChild(inp);
  return row;
}

export function buildDropdown(label: string, options: string[], def: number, cb: (i: number) => void): HTMLElement {
  const row = document.createElement('div');
  row.style.marginBottom = '10px';
  const lbl = document.createElement('div');
  lbl.textContent = label; lbl.style.color = '#ccc'; lbl.style.fontSize = '13px'; lbl.style.marginBottom = '4px';
  const sel = document.createElement('select');
  sel.style.cssText = 'width:100%; padding:6px; background:#0a0805; color:#F4C430; border:1px solid #C5A028; border-radius:4px; font-family:inherit;';
  options.forEach((o, i) => {
    const opt = document.createElement('option');
    opt.value = String(i); opt.textContent = o;
    if (i === def) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => cb(parseInt(sel.value));
  row.appendChild(lbl); row.appendChild(sel);
  return row;
}

export function buildFileRow(label: string, accept: string, cb: (f: File) => void): HTMLElement {
  const row = document.createElement('div');
  row.style.marginBottom = '10px';
  const lbl = document.createElement('div');
  lbl.textContent = label; lbl.style.color = '#ccc'; lbl.style.fontSize = '13px'; lbl.style.marginBottom = '4px';
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.style.cssText = 'width:100%; color:#fff; font-size:13px;';
  inp.onchange = () => { if (inp.files?.[0]) cb(inp.files[0]); };
  row.appendChild(lbl); row.appendChild(inp);
  return row;
}

export function buildInfo(text: string): HTMLElement {
  const el = document.createElement('pre');
  el.textContent = text;
  Object.assign(el.style, {
    color: '#999', fontSize: '12px', lineHeight: '1.6',
    whiteSpace: 'pre-wrap', margin: '0',
  });
  return el;
}

export function buildButtonRow(label: string, cb: () => void): HTMLElement {
  const row = document.createElement('div');
  Object.assign(row.style, { marginBottom: '10px' });
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    background: 'rgba(197,160,40,0.2)', border: '1px solid #C5A028',
    color: '#C5A028', padding: '6px 12px', borderRadius: '4px',
    cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
  });
  btn.onclick = cb;
  row.appendChild(btn);
  return row;
}

/** Creates a slider with a paired number input (two-way bound) */
export function buildSliderWithNumber(
  label: string,
  min: number,
  max: number,
  def: number,
  step: number,
  onSliderChange: (v: number) => void,
  onNumberChange: (v: number) => void
): { container: HTMLElement; slider: HTMLInputElement; number: HTMLInputElement } {
  const container = document.createElement('div');
  Object.assign(container.style, { marginBottom: '10px' });

  // Label row
  const labelRow = document.createElement('div');
  Object.assign(labelRow.style, { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' });
  const lbl = document.createElement('span');
  lbl.textContent = label;
  Object.assign(lbl.style, { color: '#ccc', fontSize: '13px' });
  const valSpan = document.createElement('span');
  valSpan.style.color = '#F4C430';
  valSpan.style.fontFamily = "'VT323', monospace";
  valSpan.style.fontSize = '15px';
  valSpan.textContent = String(def);
  labelRow.appendChild(lbl);
  labelRow.appendChild(valSpan);
  container.appendChild(labelRow);

  // Slider
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(def);
  Object.assign(slider.style, { width: '60%', accentColor: '#C5A028', marginRight: '8px' });
  slider.oninput = () => {
    const v = parseFloat(slider.value);
    valSpan.textContent = String(v);
    onSliderChange(v);
  };

  // Number input
  const number = document.createElement('input');
  number.type = 'number';
  number.min = String(min);
  number.max = String(max);
  number.step = String(step);
  number.value = String(def);
  Object.assign(number.style, {
    width: '35%', padding: '4px', background: '#0a0805', color: '#F4C430',
    border: '1px solid #C5A028', borderRadius: '4px', boxSizing: 'border-box',
    fontFamily: "'VT323', monospace", fontSize: '14px',
  });
  number.oninput = () => {
    let v = parseFloat(number.value);
    v = Math.max(min, Math.min(max, v));
    valSpan.textContent = String(v);
    slider.value = String(v);
    onNumberChange(v);
  };

  // Row for slider + number
  const inputRow = document.createElement('div');
  Object.assign(inputRow.style, { display: 'flex', alignItems: 'center' });
  inputRow.appendChild(slider);
  inputRow.appendChild(number);
  container.appendChild(inputRow);

  return { container, slider, number };
}

// ─── Utilities ──────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
