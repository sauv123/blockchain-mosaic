// ============================================================================
// /trace XR — SURFACES
//
// The website, taken apart and hung in the room.
//
// Earlier builds put the whole page on one flat rectangle. That is faithful
// but it is not an experience, and it made every panel share one slow capture:
// re-rendering 1.6 million pixels because a tooltip moved. Here each region of
// the page — the mosaic, the header, the drawers, the sidebar, the guide — is
// its own surface in space, with its own texture, its own size, its own place
// around you, and its own capture that only runs when that piece changes.
//
// Every surface still maps back to the real element. A ray that lands on the
// drawer resolves to a point inside `#archive-drawer`'s own rectangle, so the
// click goes to the real button and mosaic.js runs its real handler.
// ============================================================================

import * as THREE from 'three';

/**
 * How a surface is anchored in the room.
 *
 *   pos      – metres, relative to the viewer's start point
 *   rot      – y-rotation in radians (panels angle inward so they face you)
 *   scale    – metres per CSS pixel; this is what makes a 400px drawer a
 *              readable 0.9m slab instead of a postage stamp
 *   follow   – 'cursor' pins the surface to the pointer instead of a fixed spot
 */
export const LAYOUT = {
  // The tapestry. 1600x915 at this scale is 4.5 x 2.6 m — about 65 degrees
  // wide at 3.4 m, which fills the view without swallowing the panels that
  // sit above and below it.
  'mosaic-canvas': { pos: [0, 1.92, -3.4], rot: 0, scale: 0.0028, live: true },

  // The weather line overlays the mosaic on the website, so it keeps doing
  // that here — just floated slightly in front, with no backing plate of its
  // own so the tapestry reads through it.
  'cinematic-weather-line': { pos: [0, 1.60, -3.18], rot: 0, scale: 0.0026, backing: false },

  // Chrome above and below, tilted to face you.
  'app-header': { pos: [0, 3.42, -3.15], rot: 0, rotX: -0.30, scale: 0.0026 },
  'app-footer': { pos: [0, 0.52, -3.00], rot: 0, rotX: 0.34, scale: 0.0026 },

  // The drawers become slabs either side, angled in.
  'archive-drawer':  { pos: [-2.05, 1.55, -1.70], rot: 0.85, scale: 0.0030 },
  'details-sidebar': { pos: [2.05, 1.55, -1.70], rot: -0.85, scale: 0.0030 },

  // Modals come to you, nearer than anything else.
  'guide-panel':          { pos: [0, 1.62, -1.60], rot: 0, scale: 0.0026 },
  'tx-inspector-content': { pos: [0, 1.58, -1.45], rot: 0, scale: 0.0028 },

  // Transport sits low and near, where your hands are.
  'playback-controls': { pos: [0, 1.02, -1.90], rot: 0, rotX: 0.40, scale: 0.0026 },

  // The injected keyboard sits low and near, like a desk.
  'xr-keyboard': { pos: [0, 1.05, -1.35], rot: 0, rotX: 0.42, scale: 0.0019 },

  // The tooltip rides the pointer.
  'hover-tooltip': { follow: 'cursor', scale: 0.0020, backing: false }
};

/** Elements we never want to see as surfaces (containers, overlays, backdrops). */
const SKIP_CAPTURE_BG = new Set(['mosaic-canvas']);

let surfaceSeq = 0;

export class Surface {
  /**
   * @param {object} opts
   * @param {string} opts.key       stable id, also the LAYOUT key
   * @param {Element} opts.el       the real element in the site's document
   * @param {object} opts.layout    entry from LAYOUT
   * @param {THREE.Scene} opts.scene
   */
  constructor({ key, el, layout, scene }) {
    this.key = key;
    this.el = el;
    this.layout = layout;
    this.id = `surface-${surfaceSeq++}`;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 8;
    this.canvas.height = 8;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.anisotropy = 4;

    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    // A backing plate so a translucent panel still reads against the room.
    this.backing = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x0b0d11, transparent: true, opacity: 0.94 })
    );
    this.backing.position.z = -0.008;
    // Overlay elements (the weather line, the tooltip) are meant to read over
    // what is behind them, so they get no plate.
    if (layout.backing !== false) this.group.add(this.backing);

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false, depthWrite: false })
    );
    this.mesh.name = key;
    this.mesh.userData.surface = this;
    this.group.add(this.mesh);

    // A soft edge so a floating slab has a boundary in space.
    this.rim = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x3b6fd4, transparent: true, opacity: 0.12,
        depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    this.rim.position.z = -0.012;
    if (layout.backing !== false) this.group.add(this.rim);

    this.capturing = false;
    this.lastCapture = 0;
    this.lastRectKey = '';
    this.pageRect = null;
  }

  /**
   * Is the element actually on screen in the page right now?
   *
   * Checking only the element itself is not enough: the guide and the
   * transaction inspector are visible elements inside a hidden overlay, so
   * they reported themselves as open the entire time. The walk up to <body>
   * is what makes a closed modal actually closed.
   */
  isLive(pageW, pageH) {
    if (!this.el || !this.el.isConnected) return false;
    const win = this.el.ownerDocument.defaultView;
    const body = this.el.ownerDocument.body;

    let node = this.el;
    let depth = 0;
    while (node && node !== body && depth++ < 24) {
      const cs = win.getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (parseFloat(cs.opacity) < 0.05) return false;
      if (cs.pointerEvents === 'none' && node !== this.el && cs.position === 'fixed') {
        // An overlay parked behind everything with pointer-events disabled is
        // the site's way of saying "closed" for the guide and the inspector.
        const r0 = node.getBoundingClientRect();
        if (r0.width < 4 || r0.height < 4) return false;
      }
      node = node.parentElement;
    }

    const r = this.el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    // Drawers slide out of the viewport with a transform rather than hiding,
    // so "off the page" is the honest test for whether they are open.
    if (r.right < 8 || r.bottom < 8 || r.left > pageW - 8 || r.top > pageH - 8) return false;

    this.pageRect = r;
    return true;
  }

  /** Places and sizes the surface from its element's rect and its layout. */
  place(cursorWorld, cameraPos) {
    const r = this.pageRect;
    if (!r) return;

    const s = this.layout.scale;
    const w = Math.max(0.02, r.width * s);
    const h = Math.max(0.02, r.height * s);

    if (this.lastRectKey !== `${w.toFixed(3)}x${h.toFixed(3)}`) {
      this.lastRectKey = `${w.toFixed(3)}x${h.toFixed(3)}`;
      const set = (mesh, mw, mh) => {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.PlaneGeometry(mw, mh);
      };
      set(this.mesh, w, h);
      if (this.backing.parent) set(this.backing, w * 1.015, h * 1.02);
      if (this.rim.parent) set(this.rim, w * 1.05, h * 1.07);
    }

    if (this.layout.follow === 'cursor') {
      if (!cursorWorld) { this.group.visible = false; return; }
      // Sit just off the pointer, pushed toward the viewer so it never clips
      // into the surface it is describing.
      this.group.position.copy(cursorWorld);
      this.group.position.y += h * 0.65;
      const toCam = cameraPos.clone().sub(this.group.position).normalize();
      this.group.position.addScaledVector(toCam, 0.10);
      this.group.lookAt(cameraPos);
      return;
    }

    this.group.position.fromArray(this.layout.pos);
    this.group.rotation.set(this.layout.rotX || 0, this.layout.rot || 0, 0);
  }

  /** Converts a hit uv on this surface into a point inside the real page. */
  uvToPage(uv) {
    const r = this.pageRect;
    if (!r) return null;
    return {
      x: r.left + uv.x * r.width,
      y: r.top + (1 - uv.y) * r.height
    };
  }

  /** Re-renders just this element. Small elements stay responsive. */
  async capture(html2canvas, minInterval) {
    if (this.capturing || this.layout.live) return false;
    const now = performance.now();
    if (now - this.lastCapture < minInterval) return false;
    this.capturing = true;
    this.lastCapture = now;

    const r = this.pageRect;
    try {
      const out = await html2canvas(this.el, {
        backgroundColor: null,
        scale: 1,
        logging: false,
        useCORS: true,
        width: Math.ceil(r.width),
        height: Math.ceil(r.height),
        // The mosaic is textured live from the real canvas; a captured copy
        // would just be a stale still sitting on top of it.
        ignoreElements: (node) => SKIP_CAPTURE_BG.has(node.id)
      });
      if (out.width < 2 || out.height < 2) return;
      this.canvas.width = out.width;
      this.canvas.height = out.height;
      this.ctx.clearRect(0, 0, out.width, out.height);
      this.ctx.drawImage(out, 0, 0);
      this.texture.needsUpdate = true;
      this.hasPixels = true;
    } catch (e) {
      /* one dropped panel frame is not worth interrupting the session for */
    } finally {
      this.capturing = false;
    }
    return true;
  }

  /** Points the live canvas texture at the site's own canvas element. */
  bindLive(texture) {
    this.mesh.material.map = texture;
    this.mesh.material.needsUpdate = true;
    this.hasPixels = true;
  }

  setVisible(v) {
    this.group.visible = v && !!this.hasPixels;
  }

  dispose() {
    this.texture.dispose();
    [this.mesh, this.backing, this.rim].forEach((m) => {
      m.geometry.dispose();
      m.material.dispose();
    });
    this.group.removeFromParent();
  }
}

/**
 * Owns every surface: finds the elements, keeps their visibility in step with
 * the page, and hands the pointer a list of things to ray against.
 */
export class SurfaceManager {
  constructor(scene, pageW, pageH) {
    this.scene = scene;
    this.pageW = pageW;
    this.pageH = pageH;
    /** @type {Map<string, Surface>} */
    this.surfaces = new Map();
    this.order = [];
    this.cursor = 0;
  }

  /**
   * Binds LAYOUT to real elements. Selectors are the site's own ids and
   * classes — if a piece is missing the surface is simply skipped, so this
   * degrades quietly rather than throwing.
   */
  build(doc) {
    const find = (key) => doc.getElementById(key) || doc.querySelector(`.${key}`);

    for (const [key, layout] of Object.entries(LAYOUT)) {
      const el = find(key);
      if (!el) continue;
      const surface = new Surface({ key, el, layout, scene: this.scene });
      this.surfaces.set(key, surface);
      this.order.push(surface);
    }
    return this.order.length;
  }

  get(key) { return this.surfaces.get(key); }

  /** Everything currently on screen, for raycasting. */
  pickables() {
    const out = [];
    for (const s of this.order) {
      if (s.group.visible) out.push(s.mesh);
    }
    return out;
  }

  /**
   * One pass per frame: decide what is open, place it, and queue a capture for
   * whatever changed. Captures are staggered — at most one starts per frame —
   * so a burst of panel changes cannot stall the render.
   */
  update(html2canvas, cursorWorld, cameraPos, dirty) {
    const pending = [];

    for (const s of this.order) {
      const live = s.isLive(this.pageW, this.pageH);

      if (!live) {
        s.setVisible(false);
        s.wasLive = false;
        continue;
      }

      s.place(cursorWorld, cameraPos);
      s.setVisible(true);

      if (s.layout.live) continue;

      const justOpened = !s.wasLive;
      if (justOpened || !s.hasPixels || dirty) pending.push(s);
      s.wasLive = true;
    }

    if (!pending.length) return;

    // Round-robin, and only one *started* capture per frame.
    //
    // The previous version claimed the frame's slot even when the chosen
    // surface was still inside its throttle window, so the first panel in the
    // list blocked every other panel forever — the drawers opened in the DOM
    // and never appeared in the room. Rotating the start point and only
    // consuming the slot on a real start fixes both halves of that.
    const n = pending.length;
    for (let i = 0; i < n; i++) {
      const s = pending[(this.cursor + i) % n];
      const interval = s.key === 'hover-tooltip' ? 70 : 240;
      // A panel that has never been drawn cannot wait its turn.
      const urgent = !s.hasPixels;
      if (s.capture(html2canvas, urgent ? 0 : interval)) {
        this.cursor = (this.cursor + i + 1) % n;
        return;
      }
    }
  }
}
