// ============================================================================
// /trace XR — WORLD-SPACE UI FRAMEWORK
//
// Why this exists: `dom-overlay` is an immersive-AR feature. Inside an
// immersive-VR session the browser does not composite the DOM into the
// headset, so the old quest.js approach left every panel, drawer and tooltip
// invisible. Here each surface is a canvas painted with 2D commands, uploaded
// as a texture onto a real plane in the room, with hit regions tested against
// the raycast UV. Same drawing code, same layout, but you reach for it.
// ============================================================================

import * as THREE from 'three';

// Re-exported so existing call sites keep working, but every value now comes
// from theme.js, which mirrors style.css. Read these through UI.* at paint
// time — they change when the user switches theme or palette.
import { css, paletteAccent, FONT_SANS, FONT_MONO } from './theme.js';

export const UI = {
  get bg()        { return css().panelBg; },
  get drawerBg()  { return css().drawerBg; },
  get bgSolid()   { return css().bgColor; },
  get panelEdge() { return css().borderColor; },
  get accent()    { return paletteAccent(); },
  get accentDim() { return css().borderColor; },
  get chrome()    { return css().accentColor; },
  get text()      { return css().textPrimary; },
  get textDim()   { return css().textSecondary; },
  get textFaint() { return css().textSecondary; },
  get danger()    { return '#ff6b6b'; },
  get good()      { return css().successColor; },
  get tracked()   { return css().trackedColor; },
  sans: FONT_SANS,
  mono: FONT_MONO
};

/** Pixels of canvas per metre of world surface. 1100 reads crisply on Quest 3. */
const DEFAULT_DPM = 1100;

/** Accepts #rgb/#rrggbb or an hsl()/rgb() string and applies an alpha to it. */
export function hexToRgba(color, alpha) {
  if (color.startsWith('#')) {
    const h = color.slice(1);
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  return color;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Greedy word wrap. Returns the y the caller should continue from. */
export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, cy); cy += lineHeight; }
  return cy;
}

export function shortHash(h, head = 10, tail = 8) {
  if (!h) return '0x…';
  return h.length > head + tail + 2 ? `${h.slice(0, head)}…${h.slice(-tail)}` : h;
}

// ---------------------------------------------------------------------------

let panelSeq = 0;

export class Panel {
  /**
   * @param {object} opts
   * @param {number} opts.width  surface width in metres
   * @param {number} opts.height surface height in metres
   * @param {string} opts.name   for debugging / raycast identification
   * @param {number} [opts.dpm]  canvas pixels per metre
   * @param {boolean} [opts.curved] bend the surface around the viewer
   */
  constructor({ width, height, name, dpm = DEFAULT_DPM, curved = false, opacity = 1 }) {
    this.name = name || `panel-${panelSeq++}`;
    this.widthM = width;
    this.heightM = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(width * dpm);
    this.canvas.height = Math.round(height * dpm);
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const geo = curved
      ? this._curvedGeometry(width, height)
      : new THREE.PlaneGeometry(width, height);

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = this.name;
    // renderOrder 0 lets three sort these transparent surfaces back-to-front
    // by distance. Giving panels fixed render orders made a far panel paint
    // over a near one — the HUD drew straight through the guide card.
    // Only genuinely always-on-top surfaces (tooltip, toast) override this.
    this.mesh.renderOrder = 0;
    this.mesh.userData.panel = this;

    /** @type {{x:number,y:number,w:number,h:number,id:string,onClick?:Function,onDrag?:Function,hover?:boolean,data?:any}[]} */
    this.regions = [];
    this.hoveredId = null;
    this.dirty = true;
    this.visible = true;
  }

  _curvedGeometry(width, height) {
    // A shallow cylindrical section so wide panels stay equidistant from the
    // eye instead of receding at the edges.
    const radius = 1.6;
    const arc = width / radius;
    const geo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true, -arc / 2, arc);
    geo.scale(-1, 1, 1);
    geo.rotateY(Math.PI);
    return geo;
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  setVisible(v) {
    this.visible = v;
    this.mesh.visible = v;
  }

  /** Begin a repaint: wipes the canvas and the hit regions together. */
  begin() {
    this.regions = [];
    this.ctx.clearRect(0, 0, this.w, this.h);
    return this.ctx;
  }

  end() {
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  /** The standard frosted slab every panel sits on. */
  drawChrome(title, opts = {}) {
    const ctx = this.ctx;
    const pad = opts.pad ?? 0;
    const r = opts.radius ?? 28;

    roundRect(ctx, pad, pad, this.w - pad * 2, this.h - pad * 2, r);
    ctx.fillStyle = opts.bg || UI.bg;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = opts.border || UI.panelEdge;
    ctx.stroke();

    // Accent hairline along the top, the same signature the website's header has
    if (opts.accentBar !== false) {
      ctx.save();
      roundRect(ctx, pad, pad, this.w - pad * 2, this.h - pad * 2, r);
      ctx.clip();
      const accent = opts.accent || UI.accent;
      const grad = ctx.createLinearGradient(pad, pad, this.w - pad, pad);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, accent);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = grad;
      ctx.fillRect(pad, pad, this.w - pad * 2, 3);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (title) {
      ctx.font = `700 ${opts.titleSize || 26}px ${UI.mono}`;
      ctx.fillStyle = UI.textDim;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.letterSpacing = '3px';
      ctx.fillText(title.toUpperCase(), pad + 36, pad + 30);
      ctx.letterSpacing = '0px';
    }
  }

  /**
   * Registers a clickable area. Drawing is the caller's job; this only records
   * where the laser may land.
   */
  region(id, x, y, w, h, handlers = {}) {
    const r = { id, x, y, w, h, hover: this.hoveredId === id, ...handlers };
    this.regions.push(r);
    return r;
  }

  /** Convenience: a labelled button that draws itself and registers its region. */
  button(id, label, x, y, w, h, opts = {}) {
    const ctx = this.ctx;
    const hovered = this.hoveredId === id;
    const active = opts.active;

    // .chain-select: transparent fill, 1px --border-color, --text-primary.
    // Active borrows .mood-badge: a 12% wash of the accent plus accent text.
    const accent = opts.accent || UI.accent;
    roundRect(ctx, x, y, w, h, opts.radius ?? 6);
    if (active) {
      ctx.fillStyle = opts.activeBg || hexToRgba(accent, 0.14);
    } else {
      ctx.fillStyle = hovered ? hexToRgba(accent, 0.07) : (opts.bg || css().cellBg);
    }
    ctx.fill();
    ctx.lineWidth = hovered || active ? 2 : 1;
    ctx.strokeStyle = active || hovered ? accent : UI.panelEdge;
    ctx.stroke();

    ctx.font = `${opts.weight || 600} ${opts.size || 22}px ${opts.font || UI.sans}`;
    ctx.fillStyle = active ? accent : opts.color || UI.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    return this.region(id, x, y, w, h, { onClick: opts.onClick, data: opts.data });
  }

  /** A label/value pair, matching the website's `.detail-cell`. */
  cell(label, value, x, y, w, opts = {}) {
    const ctx = this.ctx;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `500 ${opts.labelSize || 15}px ${UI.sans}`;
    ctx.fillStyle = UI.textDim;
    ctx.letterSpacing = '1.5px';
    ctx.fillText(String(label).toUpperCase(), x, y);
    ctx.letterSpacing = '0px';
    ctx.font = `${opts.weight || 500} ${opts.size || 24}px ${opts.mono ? UI.mono : UI.sans}`;
    ctx.fillStyle = opts.color || UI.text;
    const text = String(value);
    // Clip overly long values rather than letting them run off the slab.
    let shown = text;
    if (w && ctx.measureText(shown).width > w) {
      while (shown.length > 4 && ctx.measureText(shown + '…').width > w) shown = shown.slice(0, -1);
      shown += '…';
    }
    ctx.fillText(shown, x, y + (opts.labelSize || 15) + 10);
    return y + (opts.labelSize || 15) + 10 + (opts.size || 24) + 14;
  }

  // -------------------------------------------------------------------------
  // Pointer plumbing. `uv` comes straight from a THREE.Intersection.
  // -------------------------------------------------------------------------
  uvToPx(uv) {
    return { x: uv.x * this.w, y: (1 - uv.y) * this.h };
  }

  hitTest(uv) {
    const p = this.uvToPx(uv);
    // Later regions win, matching DOM stacking where the last drawn is on top.
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        return { region: r, px: p };
      }
    }
    return { region: null, px: p };
  }

  /** @returns {boolean} true if the hover target changed (caller may tick audio) */
  pointerMove(uv) {
    const { region, px } = this.hitTest(uv);
    const id = region ? region.id : null;
    const changed = id !== this.hoveredId;
    this.hoveredId = id;
    if (changed) this.dirty = true;
    if (region && region.onMove) region.onMove(px, region);
    return changed;
  }

  pointerLeave() {
    if (this.hoveredId !== null) {
      this.hoveredId = null;
      this.dirty = true;
    }
  }

  pointerDown(uv) {
    const { region, px } = this.hitTest(uv);
    if (region && region.onClick) {
      region.onClick(region.data, px, region);
      this.dirty = true;
      return true;
    }
    return false;
  }

  pointerDrag(uv) {
    const { region, px } = this.hitTest(uv);
    if (region && region.onDrag) {
      region.onDrag(px, region);
      this.dirty = true;
      return true;
    }
    return false;
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}

// ---------------------------------------------------------------------------
// Grabbable behaviour — lets a panel be pulled off its anchor and left
// floating in the room (interaction item 16, and how the block slab works).
// ---------------------------------------------------------------------------
export class Grabbable {
  constructor(object3D) {
    this.object = object3D;
    this.grabbedBy = null;
    this._offset = new THREE.Matrix4();
  }

  grab(controller) {
    if (this.grabbedBy) return;
    this.grabbedBy = controller;
    // Record the object's pose relative to the controller so it does not snap.
    const inv = new THREE.Matrix4().copy(controller.matrixWorld).invert();
    this._offset.copy(inv).multiply(this.object.matrixWorld);
  }

  release() {
    this.grabbedBy = null;
  }

  update() {
    if (!this.grabbedBy) return;
    const m = new THREE.Matrix4().copy(this.grabbedBy.matrixWorld).multiply(this._offset);
    m.decompose(this.object.position, this.object.quaternion, this.object.scale);
  }
}

/**
 * Makes an object face the viewer without rolling — the behaviour every
 * floating panel wants so text never tilts sideways.
 */
export function billboardY(object, cameraPos) {
  const dx = cameraPos.x - object.position.x;
  const dz = cameraPos.z - object.position.z;
  object.rotation.set(0, Math.atan2(dx, dz), 0);
}

/**
 * Head-locked-with-lag follow. Hard head-locking is a reliable way to make
 * people ill, so the HUD chases the gaze with a spring and a dead zone.
 */
export class LazyFollow {
  constructor(object, { distance = 1.6, height = -0.18, stiffness = 0.045, deadzone = 0.30 } = {}) {
    this.object = object;
    this.distance = distance;
    this.height = height;
    this.stiffness = stiffness;
    this.deadzone = deadzone;
    this._target = new THREE.Vector3();
    this._forward = new THREE.Vector3();
  }

  update(camera) {
    camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    if (this._forward.lengthSq() < 1e-6) return;
    this._forward.normalize();

    this._target.copy(camera.position)
      .addScaledVector(this._forward, this.distance);
    this._target.y = camera.position.y + this.height;

    const dist = this.object.position.distanceTo(this._target);
    if (dist > this.deadzone) {
      this.object.position.lerp(this._target, this.stiffness);
    }
    billboardY(this.object, camera.position);
  }
}
