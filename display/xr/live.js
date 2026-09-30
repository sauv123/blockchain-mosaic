// ============================================================================
// /trace XR — LIVE SITE IN VR
//
// This does not reimplement anything. It loads the real mosaic.html in an
// iframe, untouched, and presents that running page inside the immersive room:
//
//   · the site's own <canvas> is textured straight onto the screen, so the
//     mosaic is literally mosaic.js drawing, frame for frame;
//   · the site's DOM chrome (header, drawers, sidebar, tooltips, modals) is
//     captured to a transparent layer above it;
//   · the controller ray is translated back into real mouse events on the real
//     elements, so every original handler runs — the selects, the calendar, the
//     sub-pixel inspector, the playback controls, all of it.
//
// The atmosphere (sky, fog, floor, data rain) is the same world.js used by the
// native build, so the room around the page is unchanged.
// ============================================================================

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

import { World } from './world.js';
import { state } from './core.js';
import { audio } from './audio.js';

// ---------------------------------------------------------------------------
// Spatial sound. Every voice is placed in the room, and the ambient bed orbits
// the listener — the "8D" effect — so the space reads as continuous even when
// nothing is happening.
// ---------------------------------------------------------------------------
const sound = {
  orbitAngle: 0,
  orbitNode: null,
  started: false,

  start() {
    if (this.started) return;
    this.started = true;
    audio.init();
    audio.resume();
    // Louder than the flat build: in a headset the bed is the room tone, and
    // it was sitting too far under the block tones to register.
    audio.masterGain.gain.setValueAtTime(0.62, audio.ctx.currentTime);
    audio.setAmbientProfile('hum');
    if (audio.ambientGain) {
      // Route the bed through a panner so it can be swung around the listener.
      this.orbitNode = audio.ctx.createPanner();
      this.orbitNode.panningModel = 'HRTF';
      this.orbitNode.distanceModel = 'inverse';
      this.orbitNode.refDistance = 1.6;
      this.orbitNode.rolloffFactor = 0.4;
      try { audio.ambientGain.disconnect(); } catch (e) { /* fresh graph */ }
      audio.ambientGain.connect(this.orbitNode);
      this.orbitNode.connect(audio.masterGain);
      audio.ambientGain.gain.setTargetAtTime(0.34, audio.ctx.currentTime, 1.5);
    }
  },

  /** Swings the ambient bed slowly around the head. */
  update(dt, cameraPos, pressure) {
    if (!this.started || !this.orbitNode) return;
    // Faster orbit when the network is busy, so the room feels the load.
    this.orbitAngle += dt * (0.22 + pressure * 0.5);
    const r = 2.4;
    const x = cameraPos.x + Math.cos(this.orbitAngle) * r;
    const z = cameraPos.z + Math.sin(this.orbitAngle) * r;
    const y = cameraPos.y + Math.sin(this.orbitAngle * 0.6) * 0.8;
    if (this.orbitNode.positionX) {
      const t = audio.ctx.currentTime;
      this.orbitNode.positionX.setTargetAtTime(x, t, 0.08);
      this.orbitNode.positionY.setTargetAtTime(y, t, 0.08);
      this.orbitNode.positionZ.setTargetAtTime(z, t, 0.08);
    } else {
      this.orbitNode.setPosition(x, y, z);
    }
    audio.setPressure(pressure);
  },

  onBlock(block, worldPos, whale, density) {
    if (!this.started) return;
    // The tone sounds from the tile it landed on.
    audio.playBlockTones(block, worldPos);
    if (whale) audio.playWhaleBoom();
  },

  onHoverTile(worldPos) {
    if (!this.started) return;
    audio.playUiTick(worldPos);
  },

  onUi(worldPos) {
    if (!this.started) return;
    audio.playUiTick(worldPos, true);
  }
};

// The viewport the site is laid out at. Matches #site-host in the HTML.
const PAGE_W = 1600;
const PAGE_H = 1000;

// The mosaic gets a wall of its own, in front: 6.4 m across at 3.6 m is about
// 83 degrees of view, so it fills your vision the way the tapestry should.
const FRONT_W = 6.4;
const FRONT_DIST = 3.6;
const FRONT_Y = 1.85;

// The website itself hangs behind you. Turn around to reach the header, the
// drawers, the sidebar and the footer at a comfortable reading size.
const REAR_W = 3.6;
const REAR_H = REAR_W * (PAGE_H / PAGE_W);
const REAR_DIST = 2.15;
const REAR_Y = 1.55;

const SCREEN_Y = FRONT_Y;

const status = (msg) => {
  const el = document.getElementById('boot-status');
  if (el) el.textContent = msg;
};

// ---------------------------------------------------------------------------
// 1. Boot the real site inside the iframe
// ---------------------------------------------------------------------------
const host = document.getElementById('site-host');

/**
 * Loads mosaic.html by its real URL — not srcdoc.
 *
 * srcdoc gives the document an opaque `about:srcdoc` origin, which breaks two
 * things the site relies on: history.replaceState() throws a SecurityError in
 * updateUrlParameters(), and window.location.hostname comes back empty so
 * connectRelay() picks the wrong socket and never finds the live feed. Loading
 * the real path keeps the page same-origin and behaving exactly as it does in
 * a normal tab.
 *
 * The two shims below are installed from here, after load. That is safe for
 * requestAnimationFrame because mosaic.js re-resolves the global on every call
 * of its draw loop, so replacing it later still captures every later frame.
 *
 * mosaic.html, mosaic.js and style.css are never edited on disk.
 */
async function bootSite() {
  status('Loading the live site');

  await new Promise((resolve, reject) => {
    host.addEventListener('load', resolve, { once: true });
    host.addEventListener('error', () => reject(new Error('iframe failed to load')), { once: true });
    host.src = 'mosaic.html';
  });

  const win = host.contentWindow;
  const doc = host.contentDocument;
  if (!doc || !win) throw new Error('cannot reach the iframe document (cross-origin?)');

  // --- rAF bridge --------------------------------------------------------
  // An iframe's rAF is throttled to a stop while the parent is in an immersive
  // session, which would freeze the mosaic mid-weave. Queue its callbacks and
  // flush them once per rendered XR frame instead.
  win.__xrQueue = [];
  win.__xrDriven = false;
  win.__xrFlush = function (t) {
    const due = win.__xrQueue;
    win.__xrQueue = [];
    for (let i = 0; i < due.length; i++) {
      try { due[i](t); } catch (e) { console.error('[site rAF]', e); }
    }
    return due.length;
  };
  const nativeRAF = win.requestAnimationFrame.bind(win);
  win.requestAnimationFrame = function (cb) {
    if (win.__xrDriven) { win.__xrQueue.push(cb); return win.__xrQueue.length; }
    return nativeRAF(cb);
  };

  // --- relay reachability ------------------------------------------------
  // connectRelay() in mosaic.js only tries localhost ports, *.onrender.com, or
  // a hard-coded railway host. Served from anywhere else — a tunnel, a LAN
  // address, a headset — none of those resolve, so it falls back to the
  // simulator. The relay is on this very origin, so rewrite those attempts to
  // point here. mosaic.js resolves `WebSocket` globally on each attempt and
  // retries on failure, so installing this after load still catches it.
  const NativeWS = win.WebSocket;
  const sameOriginWs = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;
  function PatchedWebSocket(url, protocols) {
    let target = url;
    try {
      const u = new URL(url, location.href);
      const isLoopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      const isHardCoded = /railway\.app$|onrender\.com$/.test(u.hostname);
      if ((isLoopback || isHardCoded) && u.hostname !== location.hostname) {
        target = sameOriginWs;
      }
    } catch (e) { /* leave the original URL alone */ }
    const sock = protocols === undefined ? new NativeWS(target) : new NativeWS(target, protocols);
    // Listen in on the same feed the site is reading. This is how the room
    // knows a block arrived without reaching into mosaic.js's module scope.
    sock.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'history' && Array.isArray(msg.data)) onSiteHistory(msg.data);
        else if (msg.type === 'block') onSiteBlock(msg.data);
      } catch (e) { /* not ours to care about */ }
    });
    return sock;
  }
  PatchedWebSocket.prototype = NativeWS.prototype;
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach((k, i) => { PatchedWebSocket[k] = i; });
  win.WebSocket = PatchedWebSocket;

  // --- change flag -------------------------------------------------------
  // The chrome layer only re-captures when the DOM actually changed.
  win.__xrDirty = true;
  win.__xrMarkDirty = () => { win.__xrDirty = true; };
  const mo = new win.MutationObserver((records) => {
    // The hover tooltip has its own fast layer. Letting it mark the whole page
    // dirty meant every pointer move queued a full html2canvas pass, which is
    // what made the view stutter while looking around.
    for (const rec of records) {
      const t = rec.target;
      const el = t.nodeType === 1 ? t : t.parentElement;
      if (el && el.closest && el.closest('#hover-tooltip')) continue;
      win.__xrMarkDirty();
      return;
    }
  });
  mo.observe(doc.body, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['class', 'style', 'value']
  });
  ['click', 'input', 'change'].forEach((evt) => {
    doc.addEventListener(evt, win.__xrMarkDirty, true);
  });

  status('Waiting for the mosaic');
  const canvas = await new Promise((resolve, reject) => {
    const started = Date.now();
    (function poll() {
      const c = doc.getElementById('mosaic-canvas');
      if (c && c.width > 0) return resolve(c);
      if (Date.now() - started > 15000) return reject(new Error('mosaic canvas never appeared'));
      setTimeout(poll, 80);
    }());
  });

  return { win, doc, canvas };
}

// ---------------------------------------------------------------------------
// 1b. Theme bridge — the room reads the site's CSS custom properties
//
// The room used to carry its own hard-coded palette (a neon green floor, blue
// rain) while the page next to it was painting from --accent-color and
// --bg-color. Toggle the site to Charcoal and the page changed but the room
// did not, which broke the illusion that you were standing inside the website.
//
// So nothing here invents a colour. getComputedStyle() on the site's own
// <body> is the single source of truth, and every surface in the room —
// particles, floor grid, haze, sky, frames, cursor, arrival blocks — is
// repainted from it.
//
// Why watch class *and* poll:
//   · mosaic.js switches themes with `document.body.className = theme + '-theme'`,
//     so an attribute observer catches every toggle the moment it lands;
//   · but the site also restores a theme from its URL parameters during boot,
//     and can be driven from other code paths, so a slow poll is kept as a
//     safety net. It only does work when the resolved values actually differ.
// ---------------------------------------------------------------------------
const VAR_MAP = {
  bg:            '--bg-color',
  accent:        '--accent-color',
  success:       '--success-color',
  tracked:       '--tracked-color',
  whale:         '--whale-accent',
  textPrimary:   '--text-primary',
  textSecondary: '--text-secondary',
  border:        '--border-color',
  panel:         '--panel-bg'
};

const siteTheme = {
  tokens: null,
  _sig: '',

  /** Resolves every mapped custom property off the site's <body>. */
  read(doc) {
    const cs = doc.defaultView.getComputedStyle(doc.body);
    const out = {};
    for (const [key, prop] of Object.entries(VAR_MAP)) {
      const v = cs.getPropertyValue(prop).trim();
      if (v) out[key] = v;
    }
    // The theme *name* is not used to pick colours — world.js decides light vs
    // dark from the background's luminance — but it is worth carrying for
    // anything that genuinely needs to know which named theme is active.
    out.name = (doc.body.className.match(/([\w-]+)-theme/) || [, 'charcoal'])[1];
    return out;
  },

  /** Pushes a resolved token set into every themed surface in the room. */
  apply(tokens) {
    const sig = JSON.stringify(tokens);
    if (sig === this._sig) return false;   // nothing actually changed
    this._sig = sig;
    this.tokens = tokens;

    const t = world.applyPalette(tokens);
    const accent = t.accent, bg = t.bg, text = t.textPrimary;

    // The wall furniture is the page's own background, so the screen sits in
    // the room without a seam where the frame meets the void.
    frontBacking.material.color.copy(bg).lerp(new THREE.Color(0x000000), t.light ? 0.06 : 0.35);
    rearBacking.material.color.copy(bg);
    frontFrame.material.color.copy(accent);
    // Additive glow over a pale studio reads as grey mush; on light themes the
    // frame becomes a drawn edge instead of a bloom.
    frontFrame.material.blending = t.light ? THREE.NormalBlending : THREE.AdditiveBlending;
    frontFrame.material.opacity  = t.light ? 0.28 : 0.16;
    frontFrame.material.needsUpdate = true;

    // Pointer furniture.
    cursorDot.material.color.copy(accent);
    cursorRing.material.color.copy(accent);
    pointers.forEach((ptr) => ptr.setAccent && ptr.setAccent(accent));

    // Arrival blocks take the theme as their base; a block's own fee/whale
    // colour is mixed on top of it (see arrivals.spawn).
    arrivals.setTokens(t);

    // The 2D chrome and status boards are drawn from the page itself, so they
    // only need a repaint to pick the new colours up.
    statusLast = '';
    if (site) { site.win.__xrDirty = true; }
    return true;
  },

  /** Installs the observers. Safe to call once the iframe is live. */
  watch(doc) {
    this.apply(this.read(doc));
    // Instant: the class swap that mosaic.js performs on a theme change.
    new doc.defaultView.MutationObserver(() => {
      this.apply(this.read(doc));
    }).observe(doc.body, { attributes: true, attributeFilter: ['class', 'style'] });
    // Safety net for boot-time restores and any path that bypasses the class.
    setInterval(() => this.apply(this.read(doc)), 1200);
  }
};

// ---------------------------------------------------------------------------
// 2. The room
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
document.getElementById('xr-root').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, SCREEN_Y, 0);

const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

const world = new World(scene);

// ---------------------------------------------------------------------------
// 3. Two surfaces: the mosaic in front, the website behind
// ---------------------------------------------------------------------------

// ============ FRONT: the mosaic, and nothing else =========================
const frontScreen = new THREE.Group();
frontScreen.position.set(0, FRONT_Y, -FRONT_DIST);
scene.add(frontScreen);

let canvasTexture = null;
let FRONT_H = FRONT_W * (915 / 1600); // corrected once the canvas is known

const frontBacking = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: 0x0a0a08, transparent: true, opacity: 0.92 })
);
frontBacking.position.z = -0.02;
frontScreen.add(frontBacking);

const canvasLayer = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false })
);
frontScreen.add(canvasLayer);

// A soft frame so the wall reads as an object in the room, not a floating rect.
const frontFrame = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    color: 0x3b6fd4, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false
  })
);
frontFrame.position.z = -0.03;
frontScreen.add(frontFrame);

/** The plate the ray tests against for the mosaic. */
const frontPlate = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ visible: false })
);
frontPlate.position.z = 0.01;
frontPlate.name = 'mosaic';
frontScreen.add(frontPlate);

/** Sizes the front wall to the live canvas's aspect ratio. */
function layoutFront(canvas) {
  const aspect = canvas.height / canvas.width;
  FRONT_H = FRONT_W * aspect;
  const set = (mesh, w, h) => {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(w, h);
  };
  set(canvasLayer, FRONT_W, FRONT_H);
  set(frontPlate, FRONT_W, FRONT_H);
  set(frontBacking, FRONT_W * 1.02, FRONT_H * 1.04);
  set(frontFrame, FRONT_W * 1.06, FRONT_H * 1.12);
  statusBoard.position.set(0, FRONT_H / 2 + 0.14, 0.02);
}

// ============ REAR: the website =========================================
const rearScreen = new THREE.Group();
rearScreen.position.set(0, REAR_Y, REAR_DIST);
rearScreen.rotation.y = Math.PI;
scene.add(rearScreen);

const rearBacking = new THREE.Mesh(
  new THREE.PlaneGeometry(REAR_W * 1.02, REAR_H * 1.03),
  new THREE.MeshBasicMaterial({ color: 0x14140f, transparent: true, opacity: 0.97 })
);
rearBacking.position.z = -0.012;
rearScreen.add(rearBacking);

const chromeCanvas = document.createElement('canvas');
chromeCanvas.width = PAGE_W;
chromeCanvas.height = PAGE_H;
const chromeCtx = chromeCanvas.getContext('2d');
const chromeTexture = new THREE.CanvasTexture(chromeCanvas);
chromeTexture.colorSpace = THREE.SRGBColorSpace;
chromeTexture.minFilter = THREE.LinearFilter;
chromeTexture.magFilter = THREE.LinearFilter;
chromeTexture.anisotropy = 4;

const chromeLayer = new THREE.Mesh(
  new THREE.PlaneGeometry(REAR_W, REAR_H),
  new THREE.MeshBasicMaterial({
    map: chromeTexture, transparent: true, depthWrite: false, toneMapped: false
  })
);
chromeLayer.position.z = 0.006;
rearScreen.add(chromeLayer);

const rearPlate = new THREE.Mesh(
  new THREE.PlaneGeometry(REAR_W, REAR_H),
  new THREE.MeshBasicMaterial({ visible: false })
);
rearPlate.position.z = 0.01;
rearPlate.name = 'page';
rearScreen.add(rearPlate);

// ============ Cursor + status =============================================
// A large, bright cursor drawn on the wall. If this dot tracks your hand, the
// pointer is alive; if it does not, the problem is input, not the page. It is
// the fastest way to tell those two apart from inside a headset.
const cursor = new THREE.Group();
const cursorDot = new THREE.Mesh(
  new THREE.CircleGeometry(0.035, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false })
);
const cursorRing = new THREE.Mesh(
  new THREE.RingGeometry(0.055, 0.075, 32),
  new THREE.MeshBasicMaterial({ color: 0x3b6fd4, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })
);
cursor.add(cursorDot, cursorRing);
cursor.renderOrder = 998;
cursorDot.renderOrder = 999;
cursorRing.renderOrder = 999;
cursor.visible = false;
scene.add(cursor);

// Status board, pinned to the top edge of the front wall.
const statusCanvas = document.createElement('canvas');
statusCanvas.width = 1400; statusCanvas.height = 90;
const statusCtx = statusCanvas.getContext('2d');
const statusTexture = new THREE.CanvasTexture(statusCanvas);
const statusBoard = new THREE.Mesh(
  new THREE.PlaneGeometry(2.6, 2.6 * (90 / 1400)),
  new THREE.MeshBasicMaterial({ map: statusTexture, transparent: true, depthWrite: false })
);
statusBoard.renderOrder = 997;
frontScreen.add(statusBoard);

let statusText = 'starting…';
let statusLast = '';
function drawStatus() {
  if (statusText === statusLast) return;
  statusLast = statusText;
  statusCtx.clearRect(0, 0, 1400, 90);
  statusCtx.fillStyle = 'rgba(8,10,14,0.82)';
  statusCtx.fillRect(0, 0, 1400, 90);
  statusCtx.fillStyle = '#8fb3ff';
  statusCtx.font = "500 34px 'Space Mono', monospace";
  statusCtx.textAlign = 'center';
  statusCtx.textBaseline = 'middle';
  statusCtx.fillText(statusText, 700, 46);
  statusTexture.needsUpdate = true;
}

// ============ The tooltip, re-parented to whichever wall is hovered ======
const tipCanvas = document.createElement('canvas');
tipCanvas.width = 520; tipCanvas.height = 260;
const tipCtx = tipCanvas.getContext('2d');
const tipTexture = new THREE.CanvasTexture(tipCanvas);
tipTexture.colorSpace = THREE.SRGBColorSpace;
tipTexture.minFilter = THREE.LinearFilter;
const tooltipLayer = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: tipTexture, transparent: true, depthWrite: false, toneMapped: false })
);
tooltipLayer.renderOrder = 20;
tooltipLayer.visible = false;
scene.add(tooltipLayer);

// ---------------------------------------------------------------------------
// Page-coordinate mapping. Each wall covers a different part of the page: the
// front wall IS the canvas rectangle, the rear wall is the whole document.
// ---------------------------------------------------------------------------
function frontUvToPage(uv) {
  const r = site.canvas.getBoundingClientRect();
  return { x: r.left + uv.x * r.width, y: r.top + (1 - uv.y) * r.height };
}

function rearUvToPage(uv) {
  return { x: uv.x * PAGE_W, y: (1 - uv.y) * PAGE_H };
}

/** Where a page point sits in the world, on whichever wall owns it. */
function pageToWorld(pageX, pageY) {
  const r = site ? site.canvas.getBoundingClientRect() : null;
  const onCanvas = r && pageX >= r.left && pageX <= r.right && pageY >= r.top && pageY <= r.bottom;
  if (onCanvas) {
    const u = (pageX - r.left) / r.width;
    const v = (pageY - r.top) / r.height;
    return frontScreen.localToWorld(new THREE.Vector3(
      (u - 0.5) * FRONT_W, -(v - 0.5) * FRONT_H, 0.03
    ));
  }
  return rearScreen.localToWorld(new THREE.Vector3(
    (pageX / PAGE_W - 0.5) * REAR_W, -(pageY / PAGE_H - 0.5) * REAR_H, 0.03
  ));
}

// ---------------------------------------------------------------------------
// 4. Chrome capture
// ---------------------------------------------------------------------------
let capturing = false;
let lastCapture = 0;

/**
 * Re-draws the page's DOM into the chrome texture. html2canvas re-renders from
 * the DOM rather than screenshotting, so it works even while the parent is in
 * an immersive session and the iframe is not being composited.
 *
 * It runs asynchronously and never blocks a frame: the texture simply swaps in
 * whenever a capture finishes.
 */
async function captureChrome(doc, force) {
  if (capturing) return;
  const now = performance.now();
  if (!force && !doc.defaultView.__xrDirty) return;
  if (!force && now - lastCapture < 600) return;

  capturing = true;
  doc.defaultView.__xrDirty = false;
  lastCapture = now;

  try {
    const out = await html2canvas(doc.body, {
      backgroundColor: null,
      width: PAGE_W,
      height: PAGE_H,
      windowWidth: PAGE_W,
      windowHeight: PAGE_H,
      scale: 1,
      logging: false,
      useCORS: true,
      // The mosaic is already live on its own layer; capturing it here would
      // freeze it at the capture rate and hide the real thing behind a stale copy.
      ignoreElements: (el) => el.id === 'mosaic-canvas' || el.id === 'hover-tooltip',
      /**
       * `backgroundColor: null` only clears html2canvas's own backdrop — the
       * <body> still paints its --bg-color, which came out as an opaque sheet
       * covering the live mosaic layer behind this one. onclone edits a throwaway
       * copy of the document, so the real page is never touched.
       */
      onclone: (clonedDoc) => {
        const clear = (el) => { if (el) el.style.setProperty('background', 'transparent', 'important'); };
        clear(clonedDoc.documentElement);
        clear(clonedDoc.body);
        clear(clonedDoc.querySelector('.canvas-container'));
        clear(clonedDoc.querySelector('.ambient-glow'));
        const cvs = clonedDoc.getElementById('mosaic-canvas');
        if (cvs) cvs.style.visibility = 'hidden';
      }
    });
    chromeCtx.clearRect(0, 0, PAGE_W, PAGE_H);
    chromeCtx.drawImage(out, 0, 0, PAGE_W, PAGE_H);
    chromeTexture.needsUpdate = true;
  } catch (err) {
    console.error('[chrome capture]', err);
  } finally {
    capturing = false;
  }
}

// ---------------------------------------------------------------------------
// 4b. Reading the site's grid, so events can be placed on the right tile
// ---------------------------------------------------------------------------

/**
 * Works out the tile pitch the site is currently drawing at.
 *
 * mosaic.js keeps tileSize in module scope and shrinks it (64 → 48 → 32 → 24
 * → 16) as the grid fills, so it cannot be read directly. But the tiles are
 * laid on a strict pitch with a gutter between them, which shows up as evenly
 * spaced dark columns. Sampling one row of pixels and measuring the period of
 * those gaps recovers the pitch exactly, without touching their code.
 */
function calibrateGrid(canvas) {
  const fallback = { tile: 64, cols: Math.max(12, Math.floor(canvas.width / 64)) };
  try {
    const probe = document.createElement('canvas');
    probe.width = canvas.width;
    probe.height = 1;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    // Sample a row a little below the top edge of the first tile row.
    pctx.drawImage(canvas, 0, 6, canvas.width, 1, 0, 0, canvas.width, 1);
    const px = pctx.getImageData(0, 0, canvas.width, 1).data;

    const dark = [];
    for (let x = 0; x < canvas.width; x++) {
      const i = x * 4;
      if (px[i] + px[i + 1] + px[i + 2] < 24) dark.push(x);
    }
    if (dark.length < 4) return fallback;

    // Gaps between runs of dark pixels give the pitch.
    const gaps = [];
    for (let i = 1; i < dark.length; i++) {
      const d = dark[i] - dark[i - 1];
      if (d > 8) gaps.push(d);
    }
    if (!gaps.length) return fallback;
    gaps.sort((a, b) => a - b);
    const pitch = gaps[Math.floor(gaps.length / 2)];
    for (const candidate of [16, 24, 32, 48, 64]) {
      if (Math.abs(pitch - candidate) <= 3) {
        return { tile: candidate, cols: Math.max(12, Math.floor(canvas.width / candidate)) };
      }
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

let grid = { tile: 64, cols: 24 };
let blockCount = 0;
let maxTiles = 0;

function onSiteHistory(list) {
  blockCount = list.length;
}

/** Converts a block's index in the grid into a world point on the screen. */
function tileWorldPosition(index) {
  if (!site) return new THREE.Vector3(0, SCREEN_Y, -SCREEN_DIST);
  const r = site.canvas.getBoundingClientRect();
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);

  // Canvas backing-store coords -> the canvas's CSS box -> page -> screen.
  const sx = ((col + 0.5) * grid.tile) / site.canvas.width;
  const sy = ((row + 0.5) * grid.tile) / site.canvas.height;
  const pageX = r.left + sx * r.width;
  const pageY = r.top + sy * r.height;

  return pageToWorld(pageX, pageY);
}

/**
 * A block landed. Everything the room does in response is driven by that
 * block's real numbers: where it sits in the grid, how busy it was, what it
 * cost, and whether it moved enough money to count as a whale.
 */
function onSiteBlock(block) {
  if (!site) return;

  grid = calibrateGrid(site.canvas);
  const rows = Math.max(8, Math.floor(site.canvas.height / grid.tile));
  maxTiles = grid.cols * rows;

  // The tap is installed after mosaic.js has already connected, so the initial
  // 'history' burst can be missed. Recover the count from the site's own
  // GRID FILL readout rather than starting from zero and animating arrivals
  // into the top-left corner.
  if (!blockCount) {
    const fillEl = site.doc.getElementById('grid-fill-val');
    const pct = fillEl ? parseFloat(fillEl.textContent) : NaN;
    if (!Number.isNaN(pct)) blockCount = Math.round((pct / 100) * maxTiles);
  }

  const index = Math.min(blockCount, maxTiles - 1);
  blockCount = Math.min(blockCount + 1, maxTiles);

  const target = tileWorldPosition(index);
  const whale = block.whale_flag === 1;
  const density = Math.min(1, (block.tx_count || 0) / 300);

  arrivals.spawn(target, block, whale, density);
  world.pulseFloor(target, whale ? 1.4 : 0.6 + density * 0.5);
  if (whale) world.spawnShockwave(new THREE.Vector3(0, 0, 0));

  sound.onBlock(block, target, whale, density);
}

// ---------------------------------------------------------------------------
// 4c. Arrival animation — a solid block rises through the floor and glides
//     into the wall
//
// The old version was a flat additive quad that faded in near the tile. It
// read as a particle effect, not as a block: there was nothing to look at
// while it travelled, and nothing that said "this is a real object taking its
// place in the ledger".
//
// This is a real slab with real depth, lit so it turns in the light as it
// comes up, and its motion is in two deliberate phases:
//
//   RISE  — it breaks the floor directly in front of the giant screen, in the
//           column it is going to occupy, and climbs to the height of its
//           tile. It is oversized and turned slightly off-axis here, because
//           this is the beat where you are meant to read it as an object.
//   GLIDE — it squares up, travels back into the screen plane, and converges
//           to exactly the tile's footprint while its depth collapses to
//           nothing, so it does not *land on* the wall, it becomes part of it.
//
// The handover between the two is velocity-matched (rise ends slow, glide
// starts slow) so the path reads as one continuous move rather than two.
// ---------------------------------------------------------------------------
const arrivals = (() => {
  const POOL = 20;
  const items = [];

  // How far in front of the screen the block surfaces. Far enough that it is
  // unmistakably in the room with you, close enough that the glide is a short,
  // confident move rather than a long drift.
  const STAGE_FORWARD = 1.15;

  // The rise is always the *same* move, ending at eye level near the middle of
  // the wall, and the glide does all the travelling to the tile.
  //
  // The obvious alternative — rise straight up the tile's own column to the
  // tile's own height — was tried first and is worse for two reasons. The wall
  // is 6.4 m across but only about 4.5 m of it is inside the field of view at
  // this distance, so a block bound for an edge tile surfaced off-screen and
  // you simply never saw it. And a rise whose length depends on the target row
  // has a different speed and duration every time, which reads as erratic
  // rather than composed.
  //
  // Staging is therefore pulled towards the centre (not pinned to it, so two
  // blocks in flight are still distinguishable) and always ends at PRESENT_Y.
  const STAGE_X_PULL = 0.4;
  const PRESENT_Y = 1.55;         // just under eye height: you look down at it
  // Pulling every stage towards the centre means two blocks in flight at once
  // can surface on top of each other and read as one malformed object. Any
  // arrival landing within this distance of one already staged is moved to the
  // nearest free lane.
  const LANE_MIN = 0.78;
  // ...but never past the edge of what you can actually see. At the staging
  // distance the field of view is about 2.2 m either side of centre, so a lane
  // beyond this would hide the block completely. Past this point overlapping
  // is the lesser evil, and in practice blocks arrive ~12 s apart so it is
  // only ever reached during a replay burst.
  const LANE_LIMIT = 1.85;

  // It starts below the floor plane (y = 0) so the first thing you see is it
  // cutting through the grid.
  const START_Y = -0.75;
  const RISE_END = 0.5;           // fraction of the animation spent rising

  const easeOutCubic  = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // --- Lighting ------------------------------------------------------------
  // Everything else in this scene uses MeshBasicMaterial or a raw shader, so
  // these two lights cost nothing anywhere except on the ~20 pooled slabs.
  // Without them a box is a flat silhouette and the whole point of making the
  // arrival three-dimensional is lost.
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(1.4, 2.6, 2.2);
  scene.add(key);
  const fill = new THREE.HemisphereLight(0xffffff, 0x101018, 0.7);
  scene.add(fill);

  const boxGeo   = new THREE.BoxGeometry(1, 1, 1);
  const edgeGeo  = new THREE.EdgesGeometry(boxGeo);
  const planeGeo = new THREE.PlaneGeometry(1, 1);

  for (let i = 0; i < POOL; i++) {
    const group = new THREE.Group();
    group.visible = false;
    group.renderOrder = 6;

    // The slab itself. Phong rather than Standard: the look wanted here is a
    // hard specular edge on a dense body, which Phong gives directly and far
    // more cheaply than a PBR roughness workflow on a mobile GPU.
    const core = new THREE.Mesh(boxGeo, new THREE.MeshPhongMaterial({
      color: 0x3b6fd4,
      emissive: 0x000000,
      specular: 0xffffff,
      shininess: 64,
      transparent: true,
      opacity: 1
    }));
    group.add(core);

    // Crisp additive edges. This is what makes it read as "sleek" rather than
    // as a plastic cube, and it survives at distance where shading does not.
    const rim = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(rim);

    // An inside-out shell one step larger: a cheap in-scene bloom. A real
    // post-process bloom is not available here — three's EffectComposer does
    // not survive WebXR's multiview targets.
    const shell = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({
      color: 0x3b6fd4, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false
    }));
    shell.scale.setScalar(1.18);
    group.add(shell);

    scene.add(group);

    // The shaft of light it is drawn up out of the floor on. Billboarded, and
    // only alive during the rise.
    const column = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
      color: 0x3b6fd4, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    column.visible = false;
    column.renderOrder = 5;
    scene.add(column);

    // The bloom on the wall at the instant it merges in.
    const flash = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    flash.visible = false;
    flash.renderOrder = 7;
    scene.add(flash);

    items.push({
      group, core, rim, shell, column, flash,
      active: false, t: 0,
      to: new THREE.Vector3(), stage: new THREE.Vector3()
    });
  }

  // Fee bands, matching the site's own reading of a block: cheap, normal,
  // congested. Mixed with the theme accent in spawn() so a block is always
  // recognisably part of the current palette.
  const BANDS = {
    low:  new THREE.Color(0x00d2ff),
    mid:  new THREE.Color(0x3b6fd4),
    high: new THREE.Color(0xff6b6b)
  };

  let tokens = null;

  /**
   * How hard the glow layers are pushed. Additive blending only works against
   * darkness: over the light theme's #c8c6c0 studio every additive layer
   * saturates straight to flat white, which turned the halo, the shaft and the
   * landing bloom into solid white rectangles parked over the wall.
   *
   * So on light themes the glow is not dimmed, it is *changed*: normal
   * blending, low alpha, and a dark rim instead of a bright one. A block on
   * paper is drawn, not lit.
   */
  const glowAmount = () => (tokens && tokens.light ? 0.38 : 1);

  return {
    /** Theme changed: repaint the glow layers for light vs dark. */
    setTokens(t) {
      tokens = t;
      const blend = t.light ? THREE.NormalBlending : THREE.AdditiveBlending;
      for (const it of items) {
        for (const m of [it.rim.material, it.shell.material,
                         it.column.material, it.flash.material]) {
          m.blending = blend;
          m.needsUpdate = true;
        }
      }
    },

    spawn(target, block, whale, density) {
      const item = items.find((x) => !x.active);
      if (!item) return;

      const fee = block.base_fee_gwei || 0;
      const band = whale ? null : fee > 60 ? BANDS.high : fee > 20 ? BANDS.mid : BANDS.low;

      // A whale is the theme's whale accent, but never pure white: a white
      // diffuse under a white emissive and an additive halo clips every face
      // to the same value and the slab loses its form entirely — it reads as a
      // glowing rectangle, not as a block. A little accent mixed in keeps the
      // shading visible while it still reads as "this one is different".
      // Everything else is its fee band pulled 40% towards the theme accent,
      // which keeps the three bands distinguishable while tying them to the
      // active palette.
      const color = whale
        ? (tokens ? tokens.whale.clone().lerp(tokens.accent, 0.16) : new THREE.Color(0xe0e6f5))
        : (tokens ? band.clone().lerp(tokens.accent, 0.4) : band.clone());

      // The tile's footprint on the big front wall, in metres. This is what the
      // block converges to, so it lands exactly the size of its own tile.
      const tileM = Math.max(0.012, (grid.tile / site.canvas.width) * FRONT_W);

      item.active = true;
      item.t = 0;
      item.whale = whale;
      item.density = density;
      item.tileM = tileM;
      // Oversized while it is in the room, so it is an object; whales more so.
      // At ~0.24 m per tile this is a 0.5 m slab presented 2.4 m away — about
      // 12 degrees of view, which reads as something handed to you. Earlier
      // multipliers put a full metre cube at the same distance and it simply
      // filled the screen.
      item.bigM = tileM * (whale ? 2.7 : 1.95);
      item.to.copy(target);
      // Surfaces in front of the screen, biased towards the centre so it is
      // always inside the field of view no matter which tile it is bound for.
      const baseX = target.x * STAGE_X_PULL;
      // Candidate lanes are measured from the base every time, alternating
      // sides so the set stays centred on the wall.
      //
      // The offsets must be absolute, not cumulative: stepping +L then -L from
      // the running value simply returns to the start, so a cumulative version
      // oscillates instead of searching, and repeated pushes march a block
      // clean out of the field of view.
      let stageX = baseX;
      const busy = items.filter((o) => o !== item && o.active).map((o) => o.stage.x);
      const nearest = (x) => busy.reduce((d, b) => Math.min(d, Math.abs(b - x)), Infinity);

      if (nearest(stageX) < LANE_MIN) {
        const lanes = [1, -1, 2, -2, 3, -3]
          .map((n) => baseX + n * LANE_MIN)
          .filter((x) => Math.abs(x) <= LANE_LIMIT);
        const clear = lanes.find((x) => nearest(x) >= LANE_MIN);
        if (clear !== undefined) {
          stageX = clear;
        } else {
          // Every lane inside the field of view is taken — only reachable when
          // several blocks are in flight at once, which on the real chain
          // (~12 s between blocks, 1.45 s of animation) means a replay burst.
          // Rather than dropping back onto the base position and landing
          // exactly on top of a neighbour, take whichever spot is furthest
          // from anything already staged, so the crowding degrades evenly.
          let best = baseX, bestGap = -1;
          for (let x = -LANE_LIMIT; x <= LANE_LIMIT; x += 0.1) {
            const gap = nearest(x);
            if (gap > bestGap) { bestGap = gap; best = x; }
          }
          stageX = best;
        }
      }
      item.stage.set(stageX, PRESENT_Y, target.z + STAGE_FORWARD);
      // A small fixed tilt per arrival, so a run of blocks does not look
      // mechanically identical.
      item.tilt = (Math.random() - 0.5) * 0.5;

      item.core.material.color.copy(color);
      // Emissive lifts the block off the background, but on an already-bright
      // whale it is what clips the faces, so it is kept lower there, not higher.
      item.core.material.emissive.copy(color).multiplyScalar(whale ? 0.18 : 0.28);
      item.core.material.opacity = 1;
      // On dark the edge is a highlight (white pulled towards the block's own
      // colour); on light it is a drawn line, so it takes the theme's ink.
      item.rim.material.color.copy(
        tokens && tokens.light ? tokens.textPrimary : new THREE.Color(0xffffff)
      );
      if (!(tokens && tokens.light)) item.rim.material.color.lerp(color, 0.35);
      item.shell.material.color.copy(color);
      item.column.material.color.copy(color);
      item.flash.material.color.copy(color);

      // Put the group into its *starting* pose before it is ever shown.
      //
      // Without this it is revealed at the pool's default transform — origin,
      // unit scale — and renders there for the one frame before the first
      // update() moves it. That is a metre-wide cube flashing at your feet on
      // every single arrival, which is very hard to miss in a headset.
      const startSize = item.bigM * 0.42;
      item.group.position.set(item.stage.x, START_Y, item.stage.z);
      item.group.scale.set(startSize, startSize, startSize * 0.55);
      item.group.rotation.set(item.tilt, 1.15, 0);
      item.core.material.opacity = 0;
      item.rim.material.opacity = 0;
      item.shell.material.opacity = 0;
      item.column.material.opacity = 0;
      item.flash.material.opacity = 0;

      item.group.visible = true;
      item.column.visible = true;
      item.flash.visible = true;
      item.flash.position.copy(target);
      item.flash.scale.setScalar(item.tileM);
    },

    update(dt, cameraPos) {
      for (const item of items) {
        if (!item.active) continue;

        // Whales are given longer so the eye has time to follow them up.
        item.t += dt / (item.whale ? 2.05 : 1.45);
        if (item.t >= 1) {
          item.active = false;
          item.group.visible = false;
          item.column.visible = false;
          item.flash.visible = false;
          continue;
        }

        const t = item.t;

        if (t < RISE_END) {
          // ---- RISE ---------------------------------------------------
          const p = t / RISE_END;
          const e = easeOutCubic(p);

          item.group.position.set(
            item.stage.x,
            START_Y + (item.stage.y - START_Y) * e,
            item.stage.z
          );

          // Grows into its presentation size as it clears the floor.
          const size = item.bigM * (0.42 + 0.58 * e);
          const depth = size * 0.55;
          item.group.scale.set(size, size, depth);

          // Turns as it comes up, squaring off by the end of the rise so the
          // glide begins from a face-on pose with no snap.
          item.group.rotation.set(item.tilt * (1 - e), (1 - e) * 1.15, 0);

          // Anything still under the floor is hidden, so it genuinely appears
          // to emerge through the grid rather than float up in front of it.
          const cut = Math.min(1, Math.max(0, (item.group.position.y + size * 0.5) / (size || 1)));
          const vis = Math.min(1, cut * 1.6);
          const g = glowAmount();
          item.core.material.opacity = vis;
          item.rim.material.opacity = vis * (tokens && tokens.light ? 0.55 : 0.9);
          item.shell.material.opacity = vis * (0.18 + 0.14 * Math.sin(p * Math.PI)) * g;

          // The shaft from the floor up to the block.
          const top = item.group.position.y;
          const len = Math.max(0.001, top - START_Y);
          item.column.position.set(item.stage.x, START_Y + len / 2, item.stage.z);
          item.column.scale.set(size * 0.34, len, 1);
          item.column.lookAt(cameraPos);
          item.column.material.opacity = (1 - p) * 0.4 * vis * g;

          item.flash.material.opacity = 0;

        } else {
          // ---- GLIDE ---------------------------------------------------
          const p = (t - RISE_END) / (1 - RISE_END);
          const e = easeInOutCubic(p);

          item.group.position.lerpVectors(item.stage, item.to, e);
          item.group.rotation.set(0, 0, 0);

          // Converges to exactly one tile, and flattens to nothing, so it does
          // not sit proud of the wall at the end — it becomes the wall.
          const size = item.bigM + (item.tileM - item.bigM) * e;
          const depth = size * 0.55 * (1 - e) + item.tileM * 0.02;
          item.group.scale.set(size, size, Math.max(0.0005, depth));

          // Solid body dissolves over the last third, handing off to the flash
          // so the merge is a light event, not a disappearance.
          const g = glowAmount();
          const fade = 1 - Math.max(0, (p - 0.62) / 0.38);
          item.core.material.opacity = fade;
          item.rim.material.opacity = fade * (tokens && tokens.light ? 0.55 : 0.9);
          item.shell.material.opacity = fade * 0.2 * g;

          item.column.material.opacity = 0;
          item.column.visible = false;

          // Bloom on the tile, peaking exactly as the block arrives.
          const fl = Math.max(0, (p - 0.55) / 0.45);
          item.flash.scale.setScalar(item.tileM * (1.4 + fl * 2.6));
          item.flash.material.opacity = Math.sin(fl * Math.PI) * (item.whale ? 0.85 : 0.5) * g;
          item.flash.lookAt(cameraPos);
        }
      }
    }
  };
})();

let tipBusy = false;
let tipLast = 0;

/** Keeps the floating tooltip in step with the pointer without a full capture. */
async function captureTooltip(doc) {
  const el = doc.getElementById('hover-tooltip');
  if (!el) return;
  const visible = el.classList.contains('visible') &&
    doc.defaultView.getComputedStyle(el).visibility !== 'hidden';

  if (!visible) { tooltipLayer.visible = false; return; }

  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) { tooltipLayer.visible = false; return; }

  tooltipLayer.visible = true;

  // The tooltip follows the cursor around the page, so it can belong to either
  // wall. Place it in world space from its page position and face the viewer.
  const centre = pageToWorld(r.left + r.width / 2, r.top + r.height / 2);
  tooltipLayer.position.copy(centre);
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  tooltipLayer.lookAt(camPos);

  // Scaled against the front wall so it stays readable on the big surface.
  const onCanvas = site && (() => {
    const c = site.canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom;
  })();
  const unit = onCanvas
    ? FRONT_W / site.canvas.getBoundingClientRect().width
    : REAR_W / PAGE_W;
  tooltipLayer.scale.set(r.width * unit, r.height * unit, 1);

  const now = performance.now();
  if (tipBusy || now - tipLast < 80) return;
  tipBusy = true;
  tipLast = now;
  try {
    const out = await html2canvas(el, {
      backgroundColor: null, scale: 1, logging: false, useCORS: true,
      width: Math.ceil(r.width), height: Math.ceil(r.height)
    });
    tipCanvas.width = out.width;
    tipCanvas.height = out.height;
    tipCtx.clearRect(0, 0, out.width, out.height);
    tipCtx.drawImage(out, 0, 0);
    tipTexture.needsUpdate = true;
  } catch (e) {
    /* a dropped tooltip frame is not worth reporting */
  } finally {
    tipBusy = false;
  }
}

// ---------------------------------------------------------------------------
// 5. Input — the ray becomes real mouse events on real elements
// ---------------------------------------------------------------------------
let site = null;

function deepElementFromPoint(doc, x, y) {
  let el = doc.elementFromPoint(x, y);
  // Walk into open shadow roots, in case the page ever grows any.
  while (el && el.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

function fire(el, type, x, y, extra = {}) {
  if (!el) return;
  el.dispatchEvent(new site.win.MouseEvent(type, {
    clientX: x, clientY: y, bubbles: true, cancelable: true, view: site.win, ...extra
  }));
}

let hoverEl = null;

function pageMove(x, y) {
  if (!site) return;
  const el = deepElementFromPoint(site.doc, x, y);
  if (el !== hoverEl) {
    if (hoverEl) {
      fire(hoverEl, 'mouseout', x, y);
      fire(hoverEl, 'mouseleave', x, y);
    }
    if (el) {
      fire(el, 'mouseover', x, y);
      fire(el, 'mouseenter', x, y);
    }
    hoverEl = el;
  }
  fire(el, 'mousemove', x, y);
  site.win.__xrMarkDirty && site.win.__xrMarkDirty();
}

function pageClick(x, y) {
  if (!site) return null;
  const el = deepElementFromPoint(site.doc, x, y);
  if (!el) return null;

  fire(el, 'mousedown', x, y, { button: 0, buttons: 1 });
  fire(el, 'mouseup', x, y, { button: 0 });
  fire(el, 'click', x, y, { button: 0 });

  // Native form controls need their own nudge: a synthetic click does not
  // change a <select>, and text inputs need focus before the keyboard works.
  const tag = el.tagName;
  if (tag === 'SELECT') {
    el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
    el.dispatchEvent(new site.win.Event('change', { bubbles: true }));
  } else if (tag === 'INPUT' || tag === 'TEXTAREA') {
    el.focus();
    openKeyboard(el);
  }

  site.win.__xrMarkDirty && site.win.__xrMarkDirty();
  return describe(el);
}

/** A short human label for an element, for the status board. */
function describe(el) {
  if (!el) return null;
  if (el.id === 'mosaic-canvas') return 'a block';
  if (el.id) return `#${el.id}`;
  const txt = (el.textContent || '').trim().slice(0, 28);
  if (txt) return txt;
  return el.tagName.toLowerCase();
}

// A minimal text entry path for the wallet tracker, driven by the page's own input.
let keyboardTarget = null;
function openKeyboard(el) {
  keyboardTarget = el;
  // The desktop keyboard already works; in VR the Quest's own overlay keyboard
  // appears on focus of a focused input inside the session.
}

window.addEventListener('keydown', (e) => {
  if (!keyboardTarget || !site) return;
  if (e.key === 'Escape') { keyboardTarget.blur(); keyboardTarget = null; return; }
  if (e.key === 'Backspace') keyboardTarget.value = keyboardTarget.value.slice(0, -1);
  else if (e.key.length === 1) keyboardTarget.value += e.key;
  else return;
  keyboardTarget.dispatchEvent(new site.win.Event('input', { bubbles: true }));
  site.win.__xrMarkDirty && site.win.__xrMarkDirty();
});

// ---------------------------------------------------------------------------
// 6. Pointers
// ---------------------------------------------------------------------------
const LASER = 0x3b6fd4;

/**
 * Diagnostics sink. A headset has no console, so the input layer reports what
 * it is actually doing to the relay, which appends it to a file. This exists
 * because three rounds of "it should work now" were guesses; this makes the
 * failure observable instead.
 */
const diag = {
  queue: [],
  lastFlush: 0,
  seen: new Set(),

  log(event, data) {
    this.queue.push({ event, ...data });
    if (this.queue.length > 60) this.queue.shift();
  },

  /** Logs an event only the first time it happens, to keep the file readable. */
  once(key, event, data) {
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.log(event, data);
  },

  flush(force) {
    const now = performance.now();
    if (!this.queue.length) return;
    if (!force && now - this.lastFlush < 2000) return;
    this.lastFlush = now;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      fetch('/xrlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ua: navigator.userAgent.slice(0, 120), batch }),
        keepalive: true
      }).catch(() => {});
    } catch (e) { /* diagnostics must never break the app */ }
  }
};
const controllerModelFactory = new XRControllerModelFactory();
const handModelFactory = new XRHandModelFactory();
const laserGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)
]);

class Pointer {
  constructor(index) {
    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();
    this.connected = false;
    this.pressed = false;
    this.wasTriggerDown = false;
    this.lastSentX = -999;
    this.lastSentY = -999;

    this.controller = renderer.xr.getController(index);
    this.controller.addEventListener('selectstart', () => this.press());
    this.controller.addEventListener('selectend', () => { this.pressed = false; });
    this.controller.addEventListener('connected', (e) => {
      this.connected = true;
      this.gamepad = e.data.gamepad || null;
      this.handedness = e.data.handedness || 'none';
      diag.log('input-connected', {
        index,
        handedness: this.handedness,
        targetRayMode: e.data.targetRayMode,
        hasGamepad: !!this.gamepad,
        buttons: this.gamepad ? this.gamepad.buttons.length : 0,
        isHand: !!e.data.hand
      });
      diag.flush(true);
    });
    this.controller.addEventListener('disconnected', () => {
      this.connected = false;
      this.gamepad = null;
      this.laser.visible = false;
      this.reticle.visible = false;
      diag.log('input-disconnected', { index });
    });
    rig.add(this.controller);

    this.laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({
      color: LASER, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
    }));
    this.laser.scale.z = 5;
    this.laser.frustumCulled = false;
    this.controller.add(this.laser);

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.008, 0.016, 24),
      new THREE.MeshBasicMaterial({ color: LASER, side: THREE.DoubleSide, transparent: true, depthTest: false })
    );
    this.reticle.renderOrder = 999;
    this.reticle.visible = false;
    this.reticle.frustumCulled = false;
    scene.add(this.reticle);

    this.grip = renderer.xr.getControllerGrip(index);
    this.grip.add(controllerModelFactory.createControllerModel(this.grip));
    rig.add(this.grip);

    this.hand = renderer.xr.getHand(index);
    this.hand.add(handModelFactory.createHandModel(this.hand, 'mesh'));
    rig.add(this.hand);
  }

  /** Follows the site's --accent-color, like everything else in the room. */
  setAccent(color) {
    this.laser.material.color.copy(color);
    this.reticle.material.color.copy(color);
  }

  /** Ray for this frame. Controllers use their target-ray space; gaze uses the head. */
  buildRay() {
    if (this.isGaze) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const origin = new THREE.Vector3();
      camera.getWorldPosition(origin);
      this.raycaster.set(origin, dir);
      return;
    }
    this.tempMatrix.identity().extractRotation(this.controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
  }

  pulse(intensity, ms) {
    const g = this.gamepad;
    if (g && g.hapticActuators && g.hapticActuators[0]) {
      try { g.hapticActuators[0].pulse(intensity, ms); } catch (e) { /* unsupported */ }
    }
  }

  press() {
    if (this.pressed) return;
    this.pressed = true;
    if (!this.hit) return;
    const p = this.hit.object === frontPlate
      ? frontUvToPage(this.hit.uv)
      : rearUvToPage(this.hit.uv);
    const target = pageClick(p.x, p.y);
    diag.log('press', {
      index: this.index, plate: this.hit.object.name,
      page: [Math.round(p.x), Math.round(p.y)], target
    });
    diag.flush(true);
    statusText = `pressed: ${target || 'nothing'}`;
    sound.onUi(this.hit.point);
    this.pulse(0.5, 25);
  }

  update() {
    // Poll the trigger too, so a missed selectstart never leaves it dead.
    const g = this.gamepad;
    if (g && g.buttons && g.buttons[0]) {
      const down = g.buttons[0].pressed || g.buttons[0].value > 0.6;
      if (down && !this.wasTriggerDown) this.press();
      else if (!down && this.wasTriggerDown) this.pressed = false;
      this.wasTriggerDown = down;
    }
    // On gaze there is no trigger pointing anywhere, so any button counts.
    if (this.isGaze) {
      const anyDown = pointers.some((p) => p.gamepad && p.gamepad.buttons.some((b) => b && b.pressed));
      if (anyDown && !this.wasTriggerDown) this.press();
      else if (!anyDown && this.wasTriggerDown) this.pressed = false;
      this.wasTriggerDown = anyDown;
    }

    if (!this.connected) { this.hit = null; return; }

    this.buildRay();
    this.laser.visible = !this.isGaze;

    const hits = this.raycaster.intersectObjects([frontPlate, rearPlate], false);
    this.hit = hits.length ? hits[0] : null;

    // One line per stage, first time only. If input is dead, the log says
    // exactly how far it got: ray built, plate hit, page point, element found.
    diag.once(`ray${this.index}`, 'ray-built', {
      index: this.index,
      origin: this.raycaster.ray.origin.toArray().map((v) => +v.toFixed(2)),
      dir: this.raycaster.ray.direction.toArray().map((v) => +v.toFixed(2))
    });
    if (this.hit) {
      diag.once(`hit${this.index}`, 'plate-hit', {
        index: this.index,
        plate: this.hit.object.name,
        dist: +this.hit.distance.toFixed(2)
      });
    }

    if (!this.hit) {
      this.reticle.visible = false;
      this.laser.scale.z = 5;
      return;
    }


    this.laser.scale.z = Math.max(0.05, this.hit.distance);
    this.reticle.visible = true;
    this.reticle.position.copy(this.hit.point);
    this.reticle.lookAt(this.raycaster.ray.origin);

    // Park the big cursor here and face it at the wall it landed on.
    cursor.visible = true;
    cursor.position.copy(this.hit.point).addScaledVector(this.raycaster.ray.direction, -0.02);
    cursor.quaternion.copy(this.hit.object.getWorldQuaternion(new THREE.Quaternion()));

    const p = this.hit.object === frontPlate
      ? frontUvToPage(this.hit.uv)
      : rearUvToPage(this.hit.uv);
    // Ease the page cursor. Raw controller jitter was being forwarded straight
    // into mousemove, which made hovered tiles flicker between neighbours.
    if (this.smoothX === undefined) { this.smoothX = p.x; this.smoothY = p.y; }
    this.smoothX += (p.x - this.smoothX) * 0.35;
    this.smoothY += (p.y - this.smoothY) * 0.35;
    if (Math.abs(this.smoothX - this.lastSentX) > 1.5 || Math.abs(this.smoothY - this.lastSentY) > 1.5) {
      this.lastSentX = this.smoothX;
      this.lastSentY = this.smoothY;
      pageMove(this.smoothX, this.smoothY);
      const el = deepElementFromPoint(site.doc, this.smoothX, this.smoothY);
      statusText = `pointing at ${describe(el) || 'nothing'}`;
    }
  }
}

/**
 * Head-aimed fallback. If a session reports no usable input source — asleep
 * controllers, hand tracking off, or a runtime that does not surface them —
 * you can still aim by looking and press with any button. Without this there
 * is no way to recover from inside the headset, which is exactly the state
 * "it runs but nothing responds" describes.
 */
class GazePointer extends Pointer {
  constructor() {
    super(2);
    this.isGaze = true;
    this.connected = false;
    this.laser.visible = false;
    this.controller.visible = false;
    this.grip.visible = false;
    this.hand.visible = false;
  }
}

const pointers = [new Pointer(0), new Pointer(1)];
const gaze = new GazePointer();

// ---------------------------------------------------------------------------
// 7. Desktop fallback — the same room, mouse driven
// ---------------------------------------------------------------------------
const desk = {
  yaw: 0, pitch: 0, dragging: false, moved: false, lastX: 0, lastY: 0,
  mouse: new THREE.Vector2(-2, -2), keys: new Set(), raycaster: new THREE.Raycaster()
};

renderer.domElement.addEventListener('mousedown', (e) => {
  if (renderer.xr.isPresenting) return;
  desk.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  desk.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  desk.dragging = true; desk.moved = false;
  desk.lastX = e.clientX; desk.lastY = e.clientY;
});

window.addEventListener('mouseup', () => {
  if (renderer.xr.isPresenting) return;
  const was = desk.dragging;
  desk.dragging = false;
  if (was && !desk.moved) {
    const hit = deskHit();
    if (hit) {
      const p = hit.object === frontPlate ? frontUvToPage(hit.uv) : rearUvToPage(hit.uv);
      const target = pageClick(p.x, p.y);
      statusText = `pressed: ${target || 'nothing'}`;
      sound.onUi(hit.point);
    }
  }
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (renderer.xr.isPresenting) return;
  desk.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  desk.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  if (desk.dragging) {
    const dx = e.clientX - desk.lastX;
    const dy = e.clientY - desk.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) desk.moved = true;
    desk.yaw -= dx * 0.0035;
    desk.pitch = THREE.MathUtils.clamp(desk.pitch - dy * 0.0035, -1.1, 1.1);
    desk.lastX = e.clientX; desk.lastY = e.clientY;
  }
});

window.addEventListener('keydown', (e) => {
  desk.keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === 'r') { desk.yaw = 0; desk.pitch = 0; rig.position.set(0, 0, 0); }
});
window.addEventListener('keyup', (e) => desk.keys.delete(e.key.toLowerCase()));

function deskHit() {
  desk.raycaster.setFromCamera(desk.mouse, camera);
  const hits = desk.raycaster.intersectObjects([frontPlate, rearPlate], false);
  return hits.length ? hits[0] : null;
}

function updateDesktop(dt) {
  camera.rotation.set(desk.pitch, desk.yaw, 0, 'YXZ');
  const speed = dt * 1.8;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0; dir.normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  if (desk.keys.has('w')) rig.position.addScaledVector(dir, speed);
  if (desk.keys.has('s')) rig.position.addScaledVector(dir, -speed);
  if (desk.keys.has('a')) rig.position.addScaledVector(right, -speed);
  if (desk.keys.has('d')) rig.position.addScaledVector(right, speed);

  const hit = deskHit();
  document.body.style.cursor = hit ? 'pointer' : (desk.dragging ? 'grabbing' : 'grab');
  if (hit) {
    const p = hit.object === frontPlate ? frontUvToPage(hit.uv) : rearUvToPage(hit.uv);
    pageMove(p.x, p.y);
    cursor.visible = true;
    cursor.position.copy(hit.point).addScaledVector(desk.raycaster.ray.direction, -0.02);
    cursor.quaternion.copy(hit.object.getWorldQuaternion(new THREE.Quaternion()));
    const el = deepElementFromPoint(site.doc, p.x, p.y);
    statusText = `pointing at ${describe(el) || 'nothing'}`;
  }
}

// ---------------------------------------------------------------------------
// 8. VR button + frame loop
// ---------------------------------------------------------------------------
const vrButton = VRButton.createButton(renderer, {
  optionalFeatures: ['hand-tracking', 'local-floor', 'bounded-floor']
});
Object.assign(vrButton.style, {
  position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
  zIndex: '9999', fontFamily: "'Space Mono', monospace", background: 'rgba(59,111,212,0.16)',
  color: '#8fb3ff', border: '1px solid #3b6fd4', borderRadius: '6px',
  padding: '14px 32px', cursor: 'pointer', fontWeight: '700', letterSpacing: '0.12em'
});
document.body.appendChild(vrButton);

renderer.xr.addEventListener('sessionstart', () => {
  const session = renderer.xr.getSession();
  diag.log('sessionstart', {
    mode: session && session.environmentBlendMode,
    inputSources: session ? session.inputSources.length : -1,
    siteReady: !!site
  });
  diag.flush(true);
  if (session) {
    session.addEventListener('inputsourceschange', (e) => {
      diag.log('inputsourceschange', {
        added: [...e.added].map((s2) => `${s2.handedness}/${s2.targetRayMode}`),
        removed: [...e.removed].map((s2) => `${s2.handedness}/${s2.targetRayMode}`),
        total: session.inputSources.length
      });
      diag.flush(true);
    });
  }
  sound.start();
  document.getElementById('hint')?.classList.add('hidden');
  rig.position.set(0, 0, 0);
  if (site) site.win.__xrDriven = true;
});
renderer.xr.addEventListener('sessionend', () => {
  diag.log('sessionend', {});
  diag.flush(true);
  document.getElementById('hint')?.classList.remove('hidden');
  if (site) site.win.__xrDriven = false;
});

['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, () => sound.start(), { once: true }));

const clock = new THREE.Clock();
let canvasAccum = 0;

/** 0..1 congestion, read from the site's own AVG FEE display. */
let pressureSmooth = 0.3;
function readPressure() {
  if (site) {
    const el = site.doc.getElementById('avg-fee-val');
    if (el) {
      const v = parseFloat(el.textContent);
      if (!Number.isNaN(v)) {
        const target = Math.min(1, v / 90);
        pressureSmooth += (target - pressureSmooth) * 0.02;
      }
    }
  }
  return pressureSmooth;
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;
  const pressure = readPressure();

  // Drive the site's own draw loop. Inside an XR session the iframe's rAF is
  // throttled, so its callbacks are flushed from here instead — the mosaic
  // keeps weaving at the headset's framerate.
  if (site && site.win.__xrDriven && site.win.__xrFlush) {
    site.win.__xrFlush(performance.now());
  }

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);

  // Network pressure comes from the site's own average-fee readout, so the
  // room's fog, drone and orbit speed track the real chain.
  world.update(dt, elapsed, pressure);
  arrivals.update(dt, camPos);
  sound.update(dt, camPos, pressure);

  if (site && canvasTexture) {
    canvasAccum += dt;
    if (canvasAccum >= 1 / 30) { canvasAccum = 0; canvasTexture.needsUpdate = true; }
  }
  if (site) {
    captureChrome(site.doc, false);
    captureTooltip(site.doc);
  }

  if (renderer.xr.isPresenting) {
    scene.updateMatrixWorld(true);
    pointers.forEach((p) => p.update());

    const live = pointers.filter((p) => p.connected);
    // Head aiming takes over only when there is nothing better.
    gaze.connected = live.length === 0;
    gaze.update();

    if (live.length === 0) {
      statusText = gaze.hit ? 'look to aim · any button to press'
        : 'no controller — look at the wall';
      if (!gaze.hit) cursor.visible = false;
    } else if (!live.some((p) => p.hit)) {
      cursor.visible = false;
    }

    diag.once('presenting', 'session-start', {
      inputs: live.length,
      frontPlate: !!frontPlate, rearPlate: !!rearPlate,
      siteReady: !!site,
      canvas: site ? [site.canvas.width, site.canvas.height] : null
    });
    diag.flush(false);
  } else {
    updateDesktop(dt);
    if (!deskHit()) cursor.visible = false;
  }

  drawStatus();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// 9. Go
// ---------------------------------------------------------------------------
bootSite().then((s) => {
  site = s;

  canvasTexture = new THREE.CanvasTexture(s.canvas);
  canvasTexture.colorSpace = THREE.SRGBColorSpace;
  canvasTexture.minFilter = THREE.LinearFilter;
  canvasTexture.magFilter = THREE.LinearFilter;
  canvasTexture.anisotropy = 4;
  canvasLayer.material.map = canvasTexture;
  canvasLayer.material.needsUpdate = true;

  layoutFront(s.canvas);
  // The site rescales its grid as blocks arrive; keep the wall in step.
  new ResizeObserver(() => layoutFront(s.canvas)).observe(s.canvas);

  // Lock the whole room to the site's live CSS variables, and keep it locked.
  siteTheme.watch(s.doc);

  status('Capturing the interface');
  return captureChrome(s.doc, true);
}).then(() => {
  document.getElementById('boot-veil')?.classList.add('gone');
}).catch((err) => {
  console.error('[live]', err);
  status(`Failed to start — ${err.message}`);
});

window.traceLive = {
  get site() { return site; },
  scene, renderer, world, pointers, gaze, diag, frontScreen, rearScreen, chromeCanvas,
  recapture: () => site && captureChrome(site.doc, true),
  siteTheme, arrivals,
  /** Force a theme re-read, e.g. after driving the site's select directly. */
  resyncTheme: () => site && siteTheme.apply(siteTheme.read(site.doc)),
  /** Fire a synthetic arrival at a grid index, for checking the animation. */
  testArrival: (index = 0, whale = false) => {
    const target = tileWorldPosition(index);
    arrivals.spawn(target, { base_fee_gwei: whale ? 90 : 25, tx_count: 180 }, whale, 0.6);
    world.pulseFloor(target, whale ? 1.4 : 0.9);
  },
  state
};
