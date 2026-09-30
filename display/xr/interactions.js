// ============================================================================
// /trace XR — INTERACTION SHIMS
//
// Three controls on the site cannot be driven by a ray as they stand. This
// layer replaces them at runtime, inside the live document, so the rest of the
// page keeps working exactly as written:
//
//   1. <select>  — a native dropdown opens an OS popup that no WebGL scene can
//                  display and no synthetic click can open. Replaced with an
//                  in-page option list, so choosing a palette in VR is the
//                  same two clicks it is in a browser.
//   2. <input type=range> — the thumb only moves for real pointer events.
//                  Replaced with a value computed from where you are pointing,
//                  so the playback scrubber can actually be dragged.
//   3. text input — there is no keyboard in a headset. An on-page keyboard is
//                  injected, which the surface system picks up automatically
//                  and hangs in front of you like any other panel.
//
// Everything here runs against the DOM in memory. mosaic.html, mosaic.js and
// style.css are never edited on disk.
// ============================================================================

const STYLE_ID = 'xr-interaction-style';

const CSS = `
.xr-select-list {
  position: absolute;
  z-index: 2147483000;
  min-width: 100%;
  margin-top: 4px;
  padding: 6px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(20,20,16,0.98));
  border: 1px solid var(--border-color, rgba(255,255,255,0.12));
  box-shadow: 0 18px 44px rgba(0,0,0,0.55);
  display: none;
  flex-direction: column;
  gap: 4px;
}
.xr-select-list.open { display: flex; }
.xr-select-option {
  font-family: var(--font-family-sans, 'Outfit', sans-serif);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-primary, #e2e2da);
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
}
.xr-select-option:hover {
  background: rgba(59,111,212,0.16);
  border-color: var(--accent-color, #3b6fd4);
}
.xr-select-option[aria-selected="true"] {
  color: var(--accent-color, #3b6fd4);
  border-color: var(--accent-color, #3b6fd4);
  background: rgba(59,111,212,0.12);
}

#xr-keyboard {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 2147483100;
  display: none;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 14px;
  background: var(--panel-bg, rgba(16,16,13,0.98));
  border: 1px solid var(--border-color, rgba(255,255,255,0.12));
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  width: 860px;
}
#xr-keyboard.open { display: flex; }
#xr-keyboard .xr-kb-display {
  font-family: var(--font-family-mono, 'Space Mono', monospace);
  font-size: 1.1rem;
  color: var(--text-primary, #e2e2da);
  background: rgba(0,0,0,0.45);
  border: 1px solid var(--accent-color, #3b6fd4);
  border-radius: 8px;
  padding: 12px 16px;
  min-height: 26px;
  overflow: hidden;
  white-space: nowrap;
}
#xr-keyboard .xr-kb-row { display: flex; gap: 8px; justify-content: center; }
#xr-keyboard .xr-kb-key {
  flex: 1;
  text-align: center;
  font-family: var(--font-family-mono, 'Space Mono', monospace);
  font-size: 1.05rem;
  color: var(--text-primary, #e2e2da);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border-color, rgba(255,255,255,0.14));
  border-radius: 8px;
  padding: 16px 0;
  cursor: pointer;
  user-select: none;
}
#xr-keyboard .xr-kb-key:hover {
  background: rgba(59,111,212,0.22);
  border-color: var(--accent-color, #3b6fd4);
}
#xr-keyboard .xr-kb-key.wide { flex: 2.4; }
#xr-keyboard .xr-kb-key.go {
  background: rgba(59,111,212,0.28);
  border-color: var(--accent-color, #3b6fd4);
  color: #fff;
}
`;

function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// 1. Selects
// ---------------------------------------------------------------------------
const selectLists = new WeakMap();

function enhanceSelects(doc, markDirty) {
  doc.querySelectorAll('select').forEach((sel) => {
    if (selectLists.has(sel)) return;

    const list = doc.createElement('div');
    list.className = 'xr-select-list';
    list.dataset.xrFor = sel.id || '';

    const rebuild = () => {
      list.innerHTML = '';
      [...sel.options].forEach((opt, i) => {
        const row = doc.createElement('div');
        row.className = 'xr-select-option';
        row.textContent = opt.textContent;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(i === sel.selectedIndex));
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          sel.selectedIndex = i;
          // The site listens for 'change'; fire 'input' too so anything
          // written against either event behaves the same as a real pick.
          sel.dispatchEvent(new sel.ownerDocument.defaultView.Event('input', { bubbles: true }));
          sel.dispatchEvent(new sel.ownerDocument.defaultView.Event('change', { bubbles: true }));
          closeAll(doc);
          rebuild();
          markDirty && markDirty();
        });
        list.appendChild(row);
      });
    };

    rebuild();
    sel.addEventListener('change', rebuild);

    // The list sits as a sibling so it inherits the drawer's stacking context
    // and gets captured as part of whichever surface owns the select.
    const holder = sel.parentElement;
    if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
    holder.appendChild(list);

    selectLists.set(sel, { list, rebuild });
  });
}

export function closeAll(doc) {
  doc.querySelectorAll('.xr-select-list.open').forEach((l) => l.classList.remove('open'));
}

/** Called when a ray press lands on a <select>. Returns true if handled. */
export function toggleSelect(sel, markDirty) {
  const entry = selectLists.get(sel);
  if (!entry) return false;
  const wasOpen = entry.list.classList.contains('open');
  closeAll(sel.ownerDocument);
  if (!wasOpen) {
    entry.rebuild();
    entry.list.classList.add('open');
  }
  markDirty && markDirty();
  return true;
}

// ---------------------------------------------------------------------------
// 2. Range inputs
// ---------------------------------------------------------------------------
/**
 * Sets a range from a page x coordinate. A synthetic mousedown does not move a
 * native range thumb, so the value is computed from geometry instead and the
 * site's own 'input' handler is fired with it.
 */
export function setRangeFromX(el, pageX, markDirty) {
  const r = el.getBoundingClientRect();
  if (r.width < 2) return false;
  const min = parseFloat(el.min || '0');
  const max = parseFloat(el.max || '100');
  const step = parseFloat(el.step || '1') || 1;

  const frac = Math.min(1, Math.max(0, (pageX - r.left) / r.width));
  let value = min + frac * (max - min);
  value = Math.round(value / step) * step;
  value = Math.min(max, Math.max(min, value));

  if (String(value) === el.value) return true;
  el.value = String(value);
  const win = el.ownerDocument.defaultView;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
  markDirty && markDirty();
  return true;
}

// ---------------------------------------------------------------------------
// 3. On-page keyboard
// ---------------------------------------------------------------------------
const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

let keyboardTarget = null;

function buildKeyboard(doc, markDirty) {
  if (doc.getElementById('xr-keyboard')) return doc.getElementById('xr-keyboard');

  const kb = doc.createElement('div');
  kb.id = 'xr-keyboard';

  const display = doc.createElement('div');
  display.className = 'xr-kb-display';
  kb.appendChild(display);

  const press = (fn) => (e) => {
    e.stopPropagation();
    if (!keyboardTarget) return;
    fn();
    display.textContent = keyboardTarget.value || keyboardTarget.placeholder || '';
    keyboardTarget.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
    markDirty && markDirty();
  };

  ROWS.forEach((row) => {
    const rowEl = doc.createElement('div');
    rowEl.className = 'xr-kb-row';
    [...row].forEach((ch) => {
      const key = doc.createElement('div');
      key.className = 'xr-kb-key';
      key.textContent = ch;
      key.addEventListener('click', press(() => { keyboardTarget.value += ch; }));
      rowEl.appendChild(key);
    });
    kb.appendChild(rowEl);
  });

  const actions = doc.createElement('div');
  actions.className = 'xr-kb-row';
  const mk = (label, cls, fn) => {
    const key = doc.createElement('div');
    key.className = `xr-kb-key ${cls}`;
    key.textContent = label;
    key.addEventListener('click', fn);
    actions.appendChild(key);
  };
  mk('x', '', press(() => { keyboardTarget.value += 'x'; }));
  mk('0x', '', press(() => { keyboardTarget.value += '0x'; }));
  mk('⌫', 'wide', press(() => { keyboardTarget.value = keyboardTarget.value.slice(0, -1); }));
  mk('Clear', 'wide', press(() => { keyboardTarget.value = ''; }));
  mk('Done', 'wide go', (e) => {
    e.stopPropagation();
    if (keyboardTarget) {
      const win = doc.defaultView;
      keyboardTarget.dispatchEvent(new win.Event('change', { bubbles: true }));
      keyboardTarget.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    closeKeyboard(doc);
    markDirty && markDirty();
  });
  kb.appendChild(actions);

  doc.body.appendChild(kb);
  return kb;
}

export function openKeyboard(doc, input, markDirty) {
  const kb = buildKeyboard(doc, markDirty);
  keyboardTarget = input;
  kb.querySelector('.xr-kb-display').textContent = input.value || input.placeholder || '';
  kb.classList.add('open');
  markDirty && markDirty();
}

export function closeKeyboard(doc) {
  const kb = doc.getElementById('xr-keyboard');
  if (kb) kb.classList.remove('open');
  keyboardTarget = null;
}

export function keyboardOpen(doc) {
  const kb = doc.getElementById('xr-keyboard');
  return !!(kb && kb.classList.contains('open'));
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------
/**
 * Enhances the document and keeps enhancing it as the site rebuilds parts of
 * itself (the calendar redraws, the drawer repopulates).
 */
export function installInteractions(doc, markDirty) {
  ensureStyle(doc);
  enhanceSelects(doc, markDirty);
  buildKeyboard(doc, markDirty);

  const win = doc.defaultView;
  const mo = new win.MutationObserver(() => enhanceSelects(doc, markDirty));
  mo.observe(doc.body, { childList: true, subtree: true });

  return {
    refresh: () => enhanceSelects(doc, markDirty)
  };
}
