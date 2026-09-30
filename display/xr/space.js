// ============================================================================
// /trace XR — SPACE
//
// The website, dismantled and hung around you.
//
// It runs the real mosaic.html in an iframe, untouched, and then places each
// region of that page — the mosaic, the header, the drawers, the sidebar, the
// guide, the transport — as its own surface in the room. Panels appear where
// the site opens them and vanish where it closes them. Every ray lands back on
// the real element, so mosaic.js runs its own handlers.
//
// Compared with the flat-screen build this fixes the two things that made it
// feel dead: each panel captures independently (so hovering is immediate), and
// there is always a working pointer, including a head-aimed fallback.
// ============================================================================

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

import { World } from './world.js';
import { SurfaceManager } from './surfaces.js';
import { audio } from './audio.js';
import {
  installInteractions, toggleSelect, setRangeFromX,
  openKeyboard, closeKeyboard, keyboardOpen, closeAll
} from './interactions.js';

const PAGE_W = 1600;
const PAGE_H = 1500;
const EYE_Y = 1.6;

const statusEl = () => document.getElementById('boot-status');
const status = (m) => { const e = statusEl(); if (e) e.textContent = m; };

// ---------------------------------------------------------------------------
// Diagnostics — a headset has no console, so the input layer reports home.
// ---------------------------------------------------------------------------
const diag = {
  queue: [], lastFlush: 0, seen: new Set(),
  log(event, data) { this.queue.push({ event, ...data }); if (this.queue.length > 80) this.queue.shift(); },
  once(key, event, data) { if (this.seen.has(key)) return; this.seen.add(key); this.log(event, data); },
  flush(force) {
    const now = performance.now();
    if (!this.queue.length) return;
    if (!force && now - this.lastFlush < 2000) return;
    this.lastFlush = now;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      fetch('/xrlog', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ua: navigator.userAgent.slice(0, 120), build: 'space', batch }),
        keepalive: true
      }).catch(() => {});
    } catch (e) { /* diagnostics must never break the app */ }
  }
};
window.addEventListener('error', (e) => {
  diag.log('js-error', { msg: String(e.message).slice(0, 200), at: `${e.filename}:${e.lineno}` });
  diag.flush(true);
});

// ---------------------------------------------------------------------------
// Renderer / room
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
document.getElementById('xr-root').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, EYE_Y, 0);

const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

const world = new World(scene);
const surfaces = new SurfaceManager(scene, PAGE_W, PAGE_H);

// ---------------------------------------------------------------------------
// The site
// ---------------------------------------------------------------------------
const host = document.getElementById('site-host');
let site = null;
let liveTexture = null;
let controlSocket = null;

// ---------------------------------------------------------------------------
// Remote control
//
// Driving a native <select> with a laser is the one interaction that keeps
// failing in a headset. So the settings are also reachable from any ordinary
// browser: control.html sends a message, the relay fans it out, and this
// applies it to the real site running in the iframe — the same
// value + dispatch('change') path that is known to work.
// ---------------------------------------------------------------------------
function applyControl(msg) {
  if (!site) return;
  const doc = site.doc;
  const win = site.win;
  const mark = () => { win.__xrDirty = true; };

  try {
    switch (msg.action) {
      case 'select': {
        const el = doc.getElementById(msg.target);
        if (!el) return;
        el.value = msg.value;
        el.dispatchEvent(new win.Event('input', { bubbles: true }));
        el.dispatchEvent(new win.Event('change', { bubbles: true }));
        statusText = `remote: ${msg.target} → ${msg.value}`;
        break;
      }
      case 'click': {
        const el = doc.getElementById(msg.target);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        ['mousedown', 'mouseup', 'click'].forEach((t) =>
          el.dispatchEvent(new win.MouseEvent(t, {
            clientX: x, clientY: y, bubbles: true, cancelable: true, view: win, button: 0
          })));
        statusText = `remote: clicked ${msg.target}`;
        break;
      }
      case 'track': {
        const input = doc.getElementById('track-address-input');
        if (!input) return;
        input.value = msg.value || '';
        input.dispatchEvent(new win.Event('input', { bubbles: true }));
        input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        input.dispatchEvent(new win.Event('change', { bubbles: true }));
        statusText = msg.value ? `remote: tracking ${msg.value.slice(0, 12)}…` : 'remote: tracking cleared';
        break;
      }
      case 'date': {
        const day = doc.querySelector(`#calendar-days-grid .calendar-day[data-date="${msg.value}"]`);
        if (!day) { statusText = `remote: ${msg.value} not on screen`; return; }
        const r = day.getBoundingClientRect();
        ['mousedown', 'mouseup', 'click'].forEach((t) =>
          day.dispatchEvent(new win.MouseEvent(t, {
            clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
            bubbles: true, cancelable: true, view: win, button: 0
          })));
        statusText = `remote: loading ${msg.value}`;
        break;
      }
      case 'scrub': {
        const sl = doc.getElementById('playback-slider');
        if (!sl) return;
        sl.value = String(msg.value);
        sl.dispatchEvent(new win.Event('input', { bubbles: true }));
        sl.dispatchEvent(new win.Event('change', { bubbles: true }));
        statusText = `remote: scrub ${msg.value}`;
        break;
      }
      case 'hello':
        publishState();
        return;
      default:
        return;
    }
  } catch (e) {
    diag.log('control-failed', { action: msg.action, msg: String(e.message).slice(0, 120) });
  }

  mark();
  publishState();
}

/** Sends the site's current settings back so the remote shows what is set. */
function publishState() {
  if (!site || !controlSocket || controlSocket.readyState !== 1) return;
  const doc = site.doc;
  const val = (id) => { const el = doc.getElementById(id); return el ? el.value : null; };
  const sl = doc.getElementById('playback-slider');
  try {
    controlSocket.send(JSON.stringify({
      type: 'control', action: 'state', value: {
        'chain-select': val('chain-select'),
        'palette-select': val('palette-select'),
        'theme-select': val('theme-select'),
        'sound-profile-select': val('sound-profile-select'),
        'ambient-profile-select': val('ambient-profile-select'),
        tracked: val('track-address-input') || '',
        playback: sl ? Number(sl.value) : 0,
        playbackMax: sl ? Number(sl.max) : 0
      }
    }));
  } catch (e) { /* the remote will ask again */ }
}

async function bootSite() {
  status('Loading the live site');
  await new Promise((resolve, reject) => {
    host.addEventListener('load', resolve, { once: true });
    host.addEventListener('error', () => reject(new Error('iframe failed to load')), { once: true });
    host.src = 'mosaic.html';
  });

  const win = host.contentWindow;
  const doc = host.contentDocument;
  if (!doc || !win) throw new Error('cannot reach the iframe document');

  // rAF bridge: an iframe's rAF stops while the parent is in an immersive
  // session, which would freeze the mosaic. mosaic.js re-resolves the global
  // each frame of its draw loop, so replacing it after load still catches it.
  win.__xrQueue = [];
  win.__xrDriven = false;
  win.__xrFlush = (t) => {
    const due = win.__xrQueue;
    win.__xrQueue = [];
    for (const cb of due) { try { cb(t); } catch (e) { /* the site's own frame */ } }
    return due.length;
  };
  const nativeRAF = win.requestAnimationFrame.bind(win);
  win.requestAnimationFrame = (cb) => {
    if (win.__xrDriven) { win.__xrQueue.push(cb); return win.__xrQueue.length; }
    return nativeRAF(cb);
  };

  // connectRelay() only knows localhost, onrender and a hard-coded railway
  // host. From a tunnel or a headset none resolve, so it falls back to the
  // simulator forever. The relay is on this origin; point those attempts here.
  const NativeWS = win.WebSocket;
  const sameOrigin = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;
  function PatchedWS(url, protocols) {
    let target = url;
    try {
      const u = new URL(url, location.href);
      const loopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      const hardCoded = /railway\.app$|onrender\.com$/.test(u.hostname);
      if ((loopback || hardCoded) && u.hostname !== location.hostname) target = sameOrigin;
    } catch (e) { /* keep the original */ }
    const sock = protocols === undefined ? new NativeWS(target) : new NativeWS(target, protocols);
    sock.addEventListener('message', (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m.type === 'block') onBlock(m.data);
        else if (m.type === 'control') applyControl(m);
      } catch (e) { /* not ours */ }
    });
    // Keep a handle so state can be published back to the remote.
    controlSocket = sock;
    sock.addEventListener('open', () => diag.once('ws', 'relay-open', { target }));
    return sock;
  }
  PatchedWS.prototype = NativeWS.prototype;
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach((k, i) => { PatchedWS[k] = i; });
  win.WebSocket = PatchedWS;

  // Change flag. The tooltip is excluded because it changes on every pointer
  // move, and letting it mark the page dirty re-captured every other panel too.
  win.__xrDirty = true;
  win.__xrMarkDirty = () => { win.__xrDirty = true; };
  const mo = new win.MutationObserver((records) => {
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
  ['click', 'input', 'change'].forEach((e) => doc.addEventListener(e, win.__xrMarkDirty, true));

  status('Waiting for the mosaic');
  const canvas = await new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function poll() {
      const c = doc.getElementById('mosaic-canvas');
      if (c && c.width > 0) return resolve(c);
      if (Date.now() - t0 > 15000) return reject(new Error('mosaic canvas never appeared'));
      setTimeout(poll, 80);
    }());
  });

  return { win, doc, canvas };
}

// ---------------------------------------------------------------------------
// Events back into the real page
// ---------------------------------------------------------------------------
function deepElementFromPoint(doc, x, y) {
  let el = doc.elementFromPoint(x, y);
  while (el && el.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

function fire(el, type, x, y, extra = {}) {
  if (!el || !site) return;
  el.dispatchEvent(new site.win.MouseEvent(type, {
    clientX: x, clientY: y, bubbles: true, cancelable: true, view: site.win, ...extra
  }));
}

let hoverEl = null;
function pageMove(x, y) {
  if (!site) return;
  const el = deepElementFromPoint(site.doc, x, y);
  if (el !== hoverEl) {
    if (hoverEl) { fire(hoverEl, 'mouseout', x, y); fire(hoverEl, 'mouseleave', x, y); }
    if (el) { fire(el, 'mouseover', x, y); fire(el, 'mouseenter', x, y); }
    hoverEl = el;
  }
  fire(el, 'mousemove', x, y);
}

function describe(el) {
  if (!el) return null;
  if (el.id === 'mosaic-canvas') return 'a block';
  if (el.id) return `#${el.id}`;
  const txt = (el.textContent || '').trim().slice(0, 28);
  return txt || el.tagName.toLowerCase();
}

function pageClick(x, y) {
  if (!site) return null;
  const el = deepElementFromPoint(site.doc, x, y);
  if (!el) return null;
  const mark = () => site.win.__xrMarkDirty && site.win.__xrMarkDirty();

  // A native dropdown cannot open in a headset, so a press on a <select>
  // opens the injected option list instead — same two clicks as a browser.
  const sel = el.tagName === 'SELECT' ? el : el.closest && el.closest('select');
  if (sel) {
    toggleSelect(sel, mark);
    return `${describe(sel)} (open)`;
  }

  // Ranges are driven by geometry; see interactions.js.
  const range = el.tagName === 'INPUT' && el.type === 'range' ? el : null;
  if (range) {
    setRangeFromX(range, x, mark);
    return describe(range);
  }

  fire(el, 'mousedown', x, y, { button: 0, buttons: 1 });
  fire(el, 'mouseup', x, y, { button: 0 });
  fire(el, 'click', x, y, { button: 0 });

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.focus();
    openKeyboard(site.doc, el, mark);
  } else if (!el.closest('.xr-select-list') && !el.closest('#xr-keyboard')) {
    // Clicking anywhere else dismisses an open dropdown, as a page would.
    closeAll(site.doc);
  }

  mark();
  return describe(el);
}

// A physical keyboard still works when one is attached.
window.addEventListener('keydown', (e) => {
  if (!site || !keyboardOpen(site.doc)) return;
  if (e.key === 'Escape') closeKeyboard(site.doc);
});

// ---------------------------------------------------------------------------
// Block arrivals — a slab rises from the floor into its tile
// ---------------------------------------------------------------------------
const arrivals = (() => {
  const POOL = 18;
  const items = [];
  const geo = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < POOL; i++) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false
    }));
    mesh.visible = false;
    scene.add(mesh);
    items.push({ mesh, active: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() });
  }

  return {
    spawn(target, fee, whale) {
      const it = items.find((x) => !x.active);
      if (!it) return;
      const color = whale ? 0xffffff : fee > 60 ? 0xff6b6b : fee > 20 ? 0x3b6fd4 : 0x00d2ff;

      // Start transform must be set before `visible`, or the pooled mesh
      // renders one frame at the origin — a cube flashing at your feet.
      it.to.copy(target);
      it.from.set(target.x, 0.02, target.z + 0.9);
      it.mesh.position.copy(it.from);
      it.mesh.scale.setScalar(0.13);
      it.mesh.material.color.setHex(color);
      it.mesh.material.opacity = 0;
      it.active = true;
      it.t = 0;
      it.whale = whale;
      it.mesh.visible = true;
    },

    update(dt, camPos) {
      for (const it of items) {
        if (!it.active) continue;
        it.t += dt / (it.whale ? 1.5 : 1.0);
        if (it.t >= 1) { it.active = false; it.mesh.visible = false; continue; }
        const e = 1 - Math.pow(1 - it.t, 3);
        it.mesh.position.lerpVectors(it.from, it.to, e);
        const s = 0.13 * (1 - it.t * 0.7) * (it.whale ? 1.8 : 1);
        it.mesh.scale.set(s, s, s * 0.25);
        it.mesh.material.opacity = Math.sin(it.t * Math.PI) * 0.95;
        it.mesh.lookAt(camPos);
      }
    }
  };
})();

function onBlock(block) {
  const mosaic = surfaces.get('mosaic-canvas');
  if (!mosaic || !mosaic.group.visible) return;
  // Land somewhere on the mosaic surface; the exact tile is the site's to draw.
  const w = mosaic.pageRect ? mosaic.pageRect.width * mosaic.layout.scale : 4;
  const h = mosaic.pageRect ? mosaic.pageRect.height * mosaic.layout.scale : 2;
  const local = new THREE.Vector3((Math.random() - 0.5) * w * 0.9, (Math.random() - 0.5) * h * 0.6, 0.04);
  const target = mosaic.group.localToWorld(local);

  arrivals.spawn(target, block.base_fee_gwei || 0, block.whale_flag === 1);
  world.pulseFloor(target, block.whale_flag === 1 ? 1.4 : 0.7);
  if (block.whale_flag === 1) {
    world.spawnShockwave(new THREE.Vector3(0, 0, 0));
    audio.playWhaleBoom();
  }
  audio.playBlockTones(block, target);
}

// ---------------------------------------------------------------------------
// Pointers
// ---------------------------------------------------------------------------
const LASER = 0x3b6fd4;
const controllerModels = new XRControllerModelFactory();
const handModels = new XRHandModelFactory();
const laserGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)
]);

let cursorWorld = null;
const cursor = new THREE.Group();
cursor.add(
  new THREE.Mesh(new THREE.CircleGeometry(0.012, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false })),
  new THREE.Mesh(new THREE.RingGeometry(0.020, 0.028, 28),
    new THREE.MeshBasicMaterial({ color: LASER, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }))
);
cursor.children.forEach((c) => { c.renderOrder = 1000; });
cursor.visible = false;
scene.add(cursor);

class Pointer {
  constructor(index, isGaze = false) {
    this.index = index;
    this.isGaze = isGaze;
    this.raycaster = new THREE.Raycaster();
    this.m = new THREE.Matrix4();
    this.connected = false;
    this.pressed = false;
    this.wasDown = false;
    this.hit = null;
    this.smoothX = undefined;
    this.lastX = -999;
    this.lastY = -999;

    this.controller = renderer.xr.getController(index);
    this.controller.addEventListener('selectstart', () => this.press());
    this.controller.addEventListener('selectend', () => { this.pressed = false; this.dragRange = null; });
    this.controller.addEventListener('connected', (e) => {
      this.connected = true;
      this.gamepad = e.data.gamepad || null;
      this.handedness = e.data.handedness || 'none';
      diag.log('input-connected', {
        index, handedness: this.handedness, targetRayMode: e.data.targetRayMode,
        hasGamepad: !!this.gamepad, isHand: !!e.data.hand
      });
      diag.flush(true);
    });
    this.controller.addEventListener('disconnected', () => {
      this.connected = false;
      this.gamepad = null;
      this.laser.visible = false;
      diag.log('input-disconnected', { index });
    });
    rig.add(this.controller);

    this.laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({
      color: LASER, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
    }));
    this.laser.scale.z = 5;
    this.laser.frustumCulled = false;
    this.controller.add(this.laser);

    if (!isGaze) {
      this.grip = renderer.xr.getControllerGrip(index);
      this.grip.add(controllerModels.createControllerModel(this.grip));
      rig.add(this.grip);
      this.hand = renderer.xr.getHand(index);
      this.hand.add(handModels.createHandModel(this.hand, 'mesh'));
      rig.add(this.hand);
    } else {
      this.laser.visible = false;
      this.controller.visible = false;
    }
  }

  pulse(i, ms) {
    const g = this.gamepad;
    if (g && g.hapticActuators && g.hapticActuators[0]) {
      try { g.hapticActuators[0].pulse(i, ms); } catch (e) { /* unsupported */ }
    }
  }

  press() {
    if (this.pressed || !this.hit) return;
    this.pressed = true;
    audio.resume();
    const surface = this.hit.object.userData.surface;
    const p = surface && surface.uvToPage(this.hit.uv);
    if (!p) return;

    // Remember a range so holding the trigger scrubs it.
    const under = deepElementFromPoint(site.doc, p.x, p.y);
    this.dragRange = under && under.tagName === 'INPUT' && under.type === 'range' ? under : null;

    const target = pageClick(p.x, p.y);
    diag.log('press', { index: this.index, surface: surface.key, page: [Math.round(p.x), Math.round(p.y)], target });
    diag.flush(true);
    statusText = `pressed: ${target || 'nothing'}`;
    audio.playUiTick(this.hit.point, true);
    this.pulse(0.5, 25);
  }

  update() {
    const g = this.gamepad;
    if (g && g.buttons && g.buttons[0]) {
      const down = g.buttons[0].pressed || g.buttons[0].value > 0.6;
      if (down && !this.wasDown) this.press();
      else if (!down && this.wasDown) { this.pressed = false; this.dragRange = null; }
      this.wasDown = down;
    }
    if (this.isGaze) {
      const any = pointers.some((p) => p.gamepad && p.gamepad.buttons.some((b) => b && b.pressed));
      if (any && !this.wasDown) this.press();
      else if (!any && this.wasDown) this.pressed = false;
      this.wasDown = any;
    }

    if (!this.connected) { this.hit = null; return; }

    if (this.isGaze) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const o = new THREE.Vector3();
      camera.getWorldPosition(o);
      this.raycaster.set(o, dir);
    } else {
      this.m.identity().extractRotation(this.controller.matrixWorld);
      this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.m);
      this.laser.visible = true;
    }

    diag.once(`ray${this.index}`, 'ray-built', {
      index: this.index,
      origin: this.raycaster.ray.origin.toArray().map((v) => +v.toFixed(2))
    });

    const hits = this.raycaster.intersectObjects(surfaces.pickables(), false);
    this.hit = hits.length ? hits[0] : null;
    if (!this.hit) { this.laser.scale.z = 5; return; }

    diag.once(`hit${this.index}`, 'surface-hit', {
      index: this.index, surface: this.hit.object.name, dist: +this.hit.distance.toFixed(2)
    });

    this.laser.scale.z = Math.max(0.05, this.hit.distance);
    cursor.visible = true;
    cursor.position.copy(this.hit.point).addScaledVector(this.raycaster.ray.direction, -0.012);
    cursor.quaternion.copy(this.hit.object.getWorldQuaternion(new THREE.Quaternion()));
    cursorWorld = this.hit.point.clone();

    const surface = this.hit.object.userData.surface;
    const p = surface && surface.uvToPage(this.hit.uv);
    if (!p) return;

    // Ease the page cursor: raw controller jitter forwarded straight into
    // mousemove made hovered tiles flicker between neighbours.
    if (this.smoothX === undefined) { this.smoothX = p.x; this.smoothY = p.y; }
    this.smoothX += (p.x - this.smoothX) * 0.4;
    this.smoothY += (p.y - this.smoothY) * 0.4;
    if (this.dragRange && this.pressed) {
      setRangeFromX(this.dragRange, this.smoothX, () => site.win.__xrMarkDirty && site.win.__xrMarkDirty());
      statusText = `scrubbing ${this.dragRange.value}`;
      return;
    }

    if (Math.abs(this.smoothX - this.lastX) > 1.2 || Math.abs(this.smoothY - this.lastY) > 1.2) {
      this.lastX = this.smoothX;
      this.lastY = this.smoothY;
      pageMove(this.smoothX, this.smoothY);
      statusText = `pointing at ${describe(deepElementFromPoint(site.doc, this.smoothX, this.smoothY)) || 'nothing'}`;
    }
  }
}

const pointers = [new Pointer(0), new Pointer(1)];
const gaze = new Pointer(2, true);

// ---------------------------------------------------------------------------
// Status board — floats above the mosaic so a dead pointer is visible
// ---------------------------------------------------------------------------
let statusText = 'starting…';
let statusLast = '';
const statusCanvas = document.createElement('canvas');
statusCanvas.width = 1400; statusCanvas.height = 80;
const statusCtx = statusCanvas.getContext('2d');
const statusTex = new THREE.CanvasTexture(statusCanvas);
const statusBoard = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 2.2 * (80 / 1400)),
  new THREE.MeshBasicMaterial({ map: statusTex, transparent: true, depthWrite: false })
);
statusBoard.position.set(0, 0.55, -3.45);
scene.add(statusBoard);

function drawStatus() {
  if (statusText === statusLast) return;
  statusLast = statusText;
  statusCtx.clearRect(0, 0, 1400, 80);
  statusCtx.fillStyle = 'rgba(8,10,14,0.8)';
  statusCtx.fillRect(0, 0, 1400, 80);
  statusCtx.fillStyle = '#8fb3ff';
  statusCtx.font = "500 32px 'Space Mono', monospace";
  statusCtx.textAlign = 'center';
  statusCtx.textBaseline = 'middle';
  statusCtx.fillText(statusText, 700, 42);
  statusTex.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Desktop fallback
// ---------------------------------------------------------------------------
const desk = {
  yaw: 0, pitch: 0, dragging: false, moved: false, lastX: 0, lastY: 0,
  mouse: new THREE.Vector2(-2, -2), keys: new Set(), ray: new THREE.Raycaster()
};

renderer.domElement.addEventListener('mousedown', (e) => {
  if (renderer.xr.isPresenting) return;
  desk.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  desk.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  desk.dragging = true; desk.moved = false;
  desk.lastX = e.clientX; desk.lastY = e.clientY;
  const h = deskHit();
  if (h) {
    const s = h.object.userData.surface;
    const p = s && s.uvToPage(h.uv);
    const under = p && site && deepElementFromPoint(site.doc, p.x, p.y);
    desk.dragRange = under && under.tagName === 'INPUT' && under.type === 'range' ? under : null;
  }
});
window.addEventListener('mouseup', () => {
  if (renderer.xr.isPresenting) return;
  const was = desk.dragging;
  const wasRange = desk.dragRange;
  desk.dragging = false;
  desk.dragRange = null;
  if (wasRange) return;
  if (!was || desk.moved) return;
  const hit = deskHit();
  if (!hit) return;
  audio.resume();
  const s = hit.object.userData.surface;
  const p = s && s.uvToPage(hit.uv);
  if (p) { statusText = `pressed: ${pageClick(p.x, p.y) || 'nothing'}`; }
});
renderer.domElement.addEventListener('mousemove', (e) => {
  if (renderer.xr.isPresenting) return;
  desk.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  desk.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  if (!desk.dragging) return;
  const dx = e.clientX - desk.lastX, dy = e.clientY - desk.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 3) desk.moved = true;
  desk.yaw -= dx * 0.0035;
  desk.pitch = THREE.MathUtils.clamp(desk.pitch - dy * 0.0035, -1.1, 1.1);
  desk.lastX = e.clientX; desk.lastY = e.clientY;
});
window.addEventListener('keydown', (e) => {
  desk.keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === 'r') { desk.yaw = 0; desk.pitch = 0; rig.position.set(0, 0, 0); }
});
window.addEventListener('keyup', (e) => desk.keys.delete(e.key.toLowerCase()));

function deskHit() {
  desk.ray.setFromCamera(desk.mouse, camera);
  const hits = desk.ray.intersectObjects(surfaces.pickables(), false);
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
  document.body.style.cursor = hit ? 'pointer' : 'grab';
  if (!hit) { cursor.visible = false; cursorWorld = null; return; }

  cursor.visible = true;
  cursor.position.copy(hit.point).addScaledVector(desk.ray.ray.direction, -0.012);
  cursor.quaternion.copy(hit.object.getWorldQuaternion(new THREE.Quaternion()));
  cursorWorld = hit.point.clone();

  const s = hit.object.userData.surface;
  const p = s && s.uvToPage(hit.uv);
  if (!p) return;

  if (desk.dragRange && desk.dragging) {
    setRangeFromX(desk.dragRange, p.x, () => site.win.__xrMarkDirty && site.win.__xrMarkDirty());
    statusText = `scrubbing ${desk.dragRange.value}`;
    return;
  }
  pageMove(p.x, p.y);
  statusText = `pointing at ${describe(deepElementFromPoint(site.doc, p.x, p.y)) || 'nothing'}`;
}

// ---------------------------------------------------------------------------
// Session
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
  diag.log('sessionstart', { inputSources: session ? session.inputSources.length : -1, siteReady: !!site });
  diag.flush(true);
  if (session) {
    session.addEventListener('inputsourceschange', (e) => {
      diag.log('inputsourceschange', {
        added: [...e.added].map((s) => `${s.handedness}/${s.targetRayMode}`),
        total: session.inputSources.length
      });
      diag.flush(true);
    });
  }
  audio.resume();
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

['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, () => audio.resume(), { once: true }));

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let liveAccum = 0;
let statePublishAccum = 0;

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;

  if (site && site.win.__xrDriven && site.win.__xrFlush) site.win.__xrFlush(performance.now());

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);

  world.update(dt, elapsed, 0.35);
  arrivals.update(dt, camPos);

  // The mosaic texture is ~6 MB per upload; 30 Hz is plenty and leaves the
  // bus free for everything else.
  if (liveTexture) {
    liveAccum += dt;
    if (liveAccum >= 1 / 30) { liveAccum = 0; liveTexture.needsUpdate = true; }
  }

  if (renderer.xr.isPresenting) {
    scene.updateMatrixWorld(true);
    pointers.forEach((p) => p.update());
    const live = pointers.filter((p) => p.connected);
    gaze.connected = live.length === 0;
    gaze.update();
    if (live.length === 0 && !gaze.hit) {
      statusText = 'no controller — look at a panel';
      cursor.visible = false;
    } else if (live.length && !live.some((p) => p.hit)) {
      cursor.visible = false;
    }
    diag.once('presenting', 'presenting', { surfaces: surfaces.order.length });
    diag.flush(false);
  } else {
    updateDesktop(dt);
  }

  if (site) {
    const dirty = site.win.__xrDirty;
    site.win.__xrDirty = false;
    surfaces.update(window.html2canvas, cursorWorld, camPos, dirty);
  }

  statePublishAccum += dt;
  if (statePublishAccum > 2) { statePublishAccum = 0; publishState(); }

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
// Go
// ---------------------------------------------------------------------------
bootSite().then((s) => {
  site = s;

  // Runtime control shims, before surfaces are bound so the injected
  // keyboard exists as an element the surface system can find.
  installInteractions(s.doc, () => { s.win.__xrDirty = true; });

  const count = surfaces.build(s.doc);
  diag.log('surfaces-built', { count, keys: surfaces.order.map((x) => x.key) });

  liveTexture = new THREE.CanvasTexture(s.canvas);
  liveTexture.colorSpace = THREE.SRGBColorSpace;
  liveTexture.minFilter = THREE.LinearFilter;
  liveTexture.magFilter = THREE.LinearFilter;
  liveTexture.anisotropy = 4;
  surfaces.get('mosaic-canvas')?.bindLive(liveTexture);

  status('Arranging the room');
  statusText = 'ready — point at a panel';
  diag.flush(true);
  document.getElementById('boot-veil')?.classList.add('gone');
}).catch((err) => {
  console.error('[space]', err);
  status(`Failed to start — ${err.message}`);
  diag.log('boot-failed', { msg: String(err.message) });
  diag.flush(true);
});

window.traceSpace = {
  get site() { return site; },
  scene, renderer, world, surfaces, pointers, gaze, diag, arrivals, camera,
  get status() { return statusText; }
};
