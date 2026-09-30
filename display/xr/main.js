// ============================================================================
// /trace XR — ASSEMBLY
//
// Boots the renderer, builds the room, wires every interaction from the
// website to something you reach for, and runs one animation loop that works
// identically in an immersive session and in a plain browser tab.
// ============================================================================

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

import * as core from './core.js';
import { state, TX_TYPES, HUMAN_LABELS } from './core.js';
import { audio } from './audio.js';
import { Tapestry, WALL } from './tiles.js';
import { World } from './world.js';
import { LazyFollow, billboardY } from './ui3d.js';
import {
  StatsHud, HoverLabel, BlockSlab, SettingsDrawer, GuideCard, Keyboard, PlaybackRail, Toast
} from './panels.js';

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const container = document.getElementById('xr-root');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
// A slightly reduced framebuffer scale buys headroom on Quest 2 without a
// visible softness penalty on the wall.
renderer.xr.setFramebufferScaleFactor(1.0);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.6, 0);

// The player rig: moving this moves the viewer, which is how teleport-free
// locomotion and the scale-shift stay comfortable.
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

// Wall shape. Chosen for a headset's field of view rather than a browser
// window: ~115 degrees of sweep, a little over head height, so the tapestry
// fills the view without forcing you to crane.
state.cols = 34;
state.rows = 13;

const world = new World(scene);
const tapestry = new Tapestry(scene, state.maxTiles);

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------
const hud = new StatsHud();
const hudGroup = new THREE.Group();
hudGroup.add(hud.mesh);
hud.mesh.position.set(0, 0, 0);
hudGroup.position.set(0, 1.30, -1.75);
scene.add(hudGroup);
const hudFollow = new LazyFollow(hudGroup, { distance: 1.75, height: -0.30, stiffness: 0.06, deadzone: 0.10 });

const hoverLabel = new HoverLabel();
scene.add(hoverLabel.mesh);

const slab = new BlockSlab(scene);
// Mounted on the wall opposite the mosaic: turn around and it is there.
const drawer = new SettingsDrawer(scene);

const guide = new GuideCard(scene);
const keyboard = new Keyboard(scene);
const rail = new PlaybackRail(scene);

const toast = new Toast();
const toastGroup = new THREE.Group();
toastGroup.add(toast.mesh);
scene.add(toastGroup);
const toastFollow = new LazyFollow(toastGroup, { distance: 1.35, height: 0.46, stiffness: 0.14, deadzone: 0.04 });

const allPanels = [hud, hoverLabel, slab, drawer, guide, keyboard, rail.panel, toast];

// ---------------------------------------------------------------------------
// Panel handlers — this is where the website's click targets land
// ---------------------------------------------------------------------------
hud.onMenu = () => { faceDrawer(); toast.show('Settings & Archives is behind you — turn around'); };
hud.onGuide = () => guide.toggle(camera);
hud.onAudio = () => {
  state.muted = audio.toggle();
  toast.show(state.muted ? 'Sound muted' : 'Sound on');
  hud.paint();
};
hud.onTrack = () => keyboard.open(camera, state.trackedAddress);
hud.onFocus = () => setFocusMode(!state.focusMode);
hud.onLive = () => { core.switchToLive(); toast.show('Back to the live grid'); };
hud.onScale = () => drawer.onScale(state.renderScale === 'MICRO' ? 'MACRO' : 'MICRO');

hoverLabel.onClose = () => hoverLabel.hide();

slab.onClose = () => slab.close();
slab.onPin = () => { slab.pinned = !slab.pinned; slab.paint(); toast.show(slab.pinned ? 'Slab pinned in place' : 'Slab unpinned'); };
slab.onCopy = () => {
  if (!slab.block) return;
  const write = navigator.clipboard && navigator.clipboard.writeText
    ? navigator.clipboard.writeText(slab.block.hash)
    : Promise.reject(new Error('clipboard unavailable'));
  write.then(() => {
    slab._copied = true;
    slab.paint();
    toast.show('Block hash copied');
    setTimeout(() => { slab._copied = false; slab.paint(); }, 1600);
  }).catch(() => toast.show('Clipboard blocked in this session'));
};
slab.onExplorer = () => {
  if (!slab.block) return;
  const url = state.chain === 'solana'
    ? `https://solscan.io/block/${slab.block.block_number}`
    : `https://etherscan.io/block/${slab.block.block_number}`;
  // Opening a tab suspends the XR session, so say so rather than surprising them.
  if (renderer.xr.isPresenting) {
    toast.show('Receipts open in the browser — exit VR first');
  } else {
    window.open(url, '_blank', 'noopener');
  }
};

guide.onClose = () => guide.toggle(camera);

/** Repaints every surface whose colours depend on theme or palette. */
function repaintAll() {
  hud.paint();
  drawer.paint();
  guide.paint();
  if (slab.visible) slab.paint();
  if (rail.group.visible) rail.paint();
}

drawer.onChain = (v) => { core.setChain(v); drawer.paint(); toast.show(`Stream: ${v}`); };
drawer.onPalette = (v) => {
  state.palette = v;
  tapestry.setPalette(v);
  tapestry.repackAll();
  tapestry.rebuild();
  // The panels take their accent from the palette, so everything repaints.
  repaintAll();
  toast.show(`Palette: ${v}`);
};
drawer.onTheme = (v) => {
  state.theme = v;
  tapestry.setTheme(v);
  world.setTheme(v);
  repaintAll();
  toast.show(`Theme: ${v === 'charcoal' ? 'Charcoal' : 'Warm Gray'}`);
};
drawer.onScale = (v) => {
  state.renderScale = v;
  tapestry.setRenderScale(v);
  drawer.paint();
  hud.paint();
  toast.show(v === 'MACRO' ? 'Macro — one colour per block' : 'Micro — sub-pixel detail');
};
drawer.onSound = (v) => { state.soundProfile = v; audio.setProfile(v); drawer.paint(); toast.show(`Instrument: ${v}`); };
drawer.onAmbient = (v) => { state.ambientProfile = v; audio.setAmbientProfile(v); drawer.paint(); toast.show(`Ambience: ${v}`); };
drawer.onMute = () => { hud.onAudio(); drawer.paint(); };
drawer.onFocus = () => { setFocusMode(!state.focusMode); drawer.paint(); };
drawer.onLive = () => { core.switchToLive(); drawer.paint(); toast.show('Back to the live grid'); };
drawer.onPortrait = () => { togglePortrait(); drawer.paint(); };
drawer.onExport = () => {
  const svg = core.exportSVG();
  if (!svg) { toast.show('Nothing to export yet'); return; }
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trace-${state.mode === 'HISTORICAL' ? state.selectedHistoricalDate : 'live'}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast.show(renderer.xr.isPresenting ? 'SVG saved — find it after you exit VR' : 'SVG exported');
};
drawer.onLegend = (type) => {
  state.legendFilter = type;
  tapestry.setFilter(type === null ? null : TX_TYPES.indexOf(type));
  tapestry.rebuild();
  drawer.paint();
  toast.show(type ? `Filtered to ${HUMAN_LABELS[type] || type}` : 'Filter cleared');
};
drawer.onPickDate = async (dateStr, dayNum) => {
  toast.show(`Loading ${dateStr}\u2026`, 4000);
  await core.loadHistoricalPortrait(dateStr, dayNum);
  drawer.paint();
  toast.show(core.getCategoryLabel(core.getCategoryForDay(dayNum)));
};

keyboard.onSubmit = (value) => {
  state.trackedAddress = value.trim();
  keyboard.close();
  tapestry.repackAll();
  tapestry.rebuild();
  hud.paint();
  toast.show(state.trackedAddress ? `Tracking ${value.slice(0, 10)}…` : 'Tracking cleared');
};

rail.onPlayToggle = () => { core.togglePlayback(); rail.paint(); };
rail.onPortrait = () => togglePortrait();

// ---------------------------------------------------------------------------
// Focus mode / portrait synthesis
// ---------------------------------------------------------------------------
let focusAmount = 0;
let focusTarget = 0;

function setFocusMode(on) {
  state.focusMode = on;
  focusTarget = on ? 1 : 0;
  // Visibility is driven by hudOpacity in the frame loop, which also handles
  // fading the HUD out when you turn to the settings wall.
  if (on) toast.show('Focus mode — press B or the trigger on empty space to exit');
  hud.paint();
}

/**
 * Spins the player rig so the settings wall comes into view. In VR you cannot
 * move someone's head, but you can rotate the world under them; this is a
 * single snap rather than a slew, which is far less nauseating.
 */
function faceDrawer() {
  drawer.setVisible(true);
  drawer.paint();
  if (!renderer.xr.isPresenting) {
    desktop.yaw = Math.PI;
    desktop.pitch = 0;
    return;
  }
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const heading = Math.atan2(fwd.x, fwd.z);
  // The drawer sits at +Z, so the viewer should be looking that way.
  rig.rotation.y += (0 - heading);
}

function togglePortrait() {
  state.portraitMode = !state.portraitMode;
  if (state.portraitMode) {
    setFocusMode(true);
    const label = state.mode === 'HISTORICAL'
      ? core.getCategoryLabel(core.getCategoryForDay(state.historicalDayNumber))
      : 'Today, still being woven';
    toast.show(label, 4500);
  } else {
    setFocusMode(false);
  }
}

// ---------------------------------------------------------------------------
// Controllers, hands and the laser
// ---------------------------------------------------------------------------
/** Laser + reticle colour: the site's own accent, not an invented neon. */
const LASER_COLOR = 0x3b6fd4;

/**
 * In-headset diagnostics. When something does not respond inside a headset
 * there is no console to look at, so the HUD carries a one-line status: how
 * many input sources are connected, and what the ray last touched. Toggle it
 * off from the guide once things are behaving.
 */
const diag = {
  enabled: true,
  lines: [],
  note(msg) {
    this.lines.unshift(msg);
    if (this.lines.length > 2) this.lines.pop();
    if (typeof hud !== 'undefined') hud.dirty = true;
  },
  status() {
    if (!this.enabled) return '';
    const live = pointersReady ? pointers.filter((p) => p.connected) : [];
    const src = live.length === 0
      ? (gazeReady && gaze.enabled ? 'GAZE (no controllers)' : 'no input sources')
      : live.map((p) => p.handedness).join(' + ');
    return `${src}${this.lines.length ? '  ·  ' + this.lines[0] : ''}`;
  }
};
let pointersReady = false;
let gazeReady = false;

const controllerModelFactory = new XRControllerModelFactory();
const handModelFactory = new XRHandModelFactory();

const laserGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)
]);

/** Everything a pointer can touch, rebuilt each frame so hidden panels drop out. */
function pickTargets() {
  const t = [tapestry.mesh];
  allPanels.forEach((p) => { if (p.visible && p.mesh.visible) t.push(p.mesh); });
  if (rail.group.visible) t.push(rail.handle);
  return t;
}

/**
 * One pointing device. WebXR gives every input source — controller OR tracked
 * hand — a target-ray space, and three exposes it as getController(i). That
 * single space is the only thing this class rays from.
 *
 * The previous version branched on whether the source was a hand and, if hand
 * joints were not yet tracked, disabled the ray entirely and returned early.
 * The result was a pointer that silently did nothing: no laser, no hover, no
 * select. There is now no code path that turns the ray off while an input
 * source is connected.
 */
class Pointer {
  constructor(index) {
    this.index = index;
    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();
    this.connected = false;
    this.selecting = false;
    this.squeezing = false;
    this.wasTriggerDown = false;
    this.lastHoverPanel = null;
    this.lastHoverInstance = -1;
    this.grabbedPanel = null;
    this.draggingRail = false;
    this.currentHit = null;
    this.rayOrigin = new THREE.Vector3();

    this.controller = renderer.xr.getController(index);
    this.controller.addEventListener('selectstart', () => this.press());
    this.controller.addEventListener('selectend', () => this.release());
    this.controller.addEventListener('squeezestart', () => this.onSqueezeStart());
    this.controller.addEventListener('squeezeend', () => this.onSqueezeEnd());
    this.controller.addEventListener('connected', (e) => {
      this.gamepad = e.data.gamepad || null;
      this.handedness = e.data.handedness || 'none';
      this.isHand = !!e.data.hand;
      this.connected = true;
      diag.note(`input ${index}: ${this.handedness}${this.isHand ? ' (hand)' : ''}`);
    });
    this.controller.addEventListener('disconnected', () => {
      this.connected = false;
      this.gamepad = null;
      this.laser.visible = false;
      this.reticle.visible = false;
      diag.note(`input ${index}: disconnected`);
    });
    rig.add(this.controller);

    this.laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
    }));
    this.laser.material.color.set(LASER_COLOR);
    this.laser.scale.z = 5;
    this.laser.frustumCulled = false;
    this.controller.add(this.laser);

    // A generous reticle: a small ring is hard to find in a headset.
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.010, 0.020, 24),
      new THREE.MeshBasicMaterial({
        color: LASER_COLOR, side: THREE.DoubleSide, transparent: true,
        opacity: 0.95, depthTest: false
      })
    );
    this.reticle.renderOrder = 1001;
    this.reticle.visible = false;
    this.reticle.frustumCulled = false;
    scene.add(this.reticle);

    this.grip = renderer.xr.getControllerGrip(index);
    this.grip.add(controllerModelFactory.createControllerModel(this.grip));
    rig.add(this.grip);

    // The hand model is cosmetic only — the ray never comes from its joints.
    this.hand = renderer.xr.getHand(index);
    this.hand.add(handModelFactory.createHandModel(this.hand, 'mesh'));
    rig.add(this.hand);
  }

  /**
   * Builds this frame's ray from the target-ray space. Works identically for
   * a Touch controller and a pinching hand, because WebXR aims both.
   */
  updateRay() {
    if (!this.connected) {
      this.laser.visible = false;
      this.reticle.visible = false;
      return false;
    }
    this.tempMatrix.identity().extractRotation(this.controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    this.rayOrigin.copy(this.raycaster.ray.origin);
    this.laser.visible = true;
    return true;
  }

  pulse(intensity, ms) {
    const g = this.gamepad;
    if (g && g.hapticActuators && g.hapticActuators[0]) {
      try { g.hapticActuators[0].pulse(intensity, ms); } catch (e) { /* unsupported */ }
    }
  }

  press() {
    if (this.selecting) return;
    this.selecting = true;
    this.activate();
  }

  release() {
    this.selecting = false;
    this.draggingRail = false;
  }

  onSqueezeStart() {
    this.squeezing = true;
    const hit = this.currentHit;
    if (hit && hit.panelOwner && hit.panelOwner.grabbable) {
      hit.panelOwner.grabbable.grab(this.controller);
      this.grabbedPanel = hit.panelOwner;
      this.pulse(0.4, 30);
    } else if (this.handedness === 'left') {
      faceDrawer();
    }
  }

  onSqueezeEnd() {
    this.squeezing = false;
    if (this.grabbedPanel) {
      this.grabbedPanel.grabbable.release();
      this.grabbedPanel = null;
    }
  }

  /** Acts on whatever the ray is currently on. */
  activate() {
    audio.resume();
    const hit = this.currentHit;
    if (!hit) {
      if (state.focusMode) { state.portraitMode = false; setFocusMode(false); }
      return;
    }

    if (hit.type === 'panel') {
      audio.playUiTick(hit.point, true);
      this.pulse(0.4, 20);
      const acted = hit.panel.pointerDown(hit.uv);
      if (hit.panel.dirty || acted) hit.panel.paint();
      diag.note(`hit ${hit.panel.name}/${hit.panel.hoveredId || '-'}`);
      return;
    }

    if (hit.type === 'rail') {
      this.draggingRail = true;
      this.pulse(0.3, 20);
      return;
    }

    if (hit.type === 'tile') {
      const block = tapestry.blockAt(hit.instanceId);
      if (!block) return;
      this.pulse(0.7, 40);
      audio.playBlockTones(block, hit.point);
      hoverLabel.hide();
      slab.open(block);
      slab.presentTo(camera);
      world.pulseFloor(hit.point, 0.6);
      diag.note(`block #${block.block_number}`);
    }
  }

  /** Runs every frame: raycast, hover feedback, haptics, drag. */
  update(dt) {
    // A trigger poll backs up selectstart. If the event is ever missed or the
    // runtime does not deliver it, the button still works.
    const g = this.gamepad;
    if (g && g.buttons && g.buttons[0]) {
      const down = g.buttons[0].pressed || g.buttons[0].value > 0.6;
      if (down && !this.wasTriggerDown) this.press();
      else if (!down && this.wasTriggerDown) this.release();
      this.wasTriggerDown = down;
    }

    if (!this.updateRay()) { this.currentHit = null; return; }
    this.applyHit(this.raycaster.intersectObjects(pickTargets(), false));
  }

  applyHit(hits) {
    const hit = hits.length > 0 ? hits[0] : null;
    this.currentHit = null;

    if (!hit) {
      this.reticle.visible = false;
      this.laser.scale.z = 5;
      if (this.lastHoverPanel) { this.lastHoverPanel.pointerLeave(); this.lastHoverPanel.paint(); this.lastHoverPanel = null; }
      if (this.lastHoverInstance !== -1) {
        this.lastHoverInstance = -1;
        if (tapestry.hoveredIndex !== -1) { tapestry.setHovered(-1); hoverLabel.hide(); }
      }
      return;
    }

    this.laser.scale.z = Math.max(0.05, hit.distance);
    this.reticle.visible = true;
    this.reticle.position.copy(hit.point);
    this.reticle.lookAt(this.rayOrigin);

    // ---- a panel ---------------------------------------------------------
    const panel = hit.object.userData.panel;
    if (panel) {
      const owner = panel === slab ? slab : panel === guide ? guide : panel === drawer ? drawer : null;
      this.currentHit = { type: 'panel', panel, uv: hit.uv, point: hit.point, panelOwner: owner };
      if (this.lastHoverPanel && this.lastHoverPanel !== panel) {
        this.lastHoverPanel.pointerLeave();
        this.lastHoverPanel.paint();
      }
      this.lastHoverPanel = panel;
      if (panel.pointerMove(hit.uv)) {
        if (panel.hoveredId) { audio.playUiTick(hit.point); this.pulse(0.15, 12); }
        panel.paint();
      }
      if (this.lastHoverInstance !== -1) {
        this.lastHoverInstance = -1;
        tapestry.setHovered(-1);
        hoverLabel.hide();
      }
      return;
    }

    // ---- the playback rail handle ---------------------------------------
    if (hit.object.userData.railHandle) {
      this.currentHit = { type: 'rail', point: hit.point };
      if (this.draggingRail || this.selecting) {
        const f = rail.fractionFromWorld(hit.point);
        rail.setFraction(f);
        core.scrubPlayback(f);
        rail.paint();
      }
      return;
    }

    // ---- a block tile ----------------------------------------------------
    if (hit.object === tapestry.mesh && hit.instanceId !== undefined) {
      const block = tapestry.blockAt(hit.instanceId);
      if (!block) return;
      this.currentHit = { type: 'tile', instanceId: hit.instanceId, point: hit.point };

      if (hit.instanceId !== this.lastHoverInstance) {
        this.lastHoverInstance = hit.instanceId;
        tapestry.setHovered(hit.instanceId);
        if (!slab.visible || slab.pinned) hoverLabel.show(block);
        const density = Math.min(1, block.tx_count / 300);
        this.pulse(0.06 + density * 0.45, 8 + Math.round(density * 22));
        audio.playUiTick(hit.point);
      }

      hoverLabel.mesh.position.copy(hit.point).lerp(camera.position, 0.18);
      hoverLabel.mesh.position.y += 0.16;
      billboardY(hoverLabel.mesh, camera.position);
    }
  }
}

/**
 * Gaze pointer. If a session reports no input sources — controllers asleep,
 * hand tracking off, or a runtime that simply does not surface them — you can
 * still aim with your head and select with any button or a tap. Without this
 * there is no way to recover inside the headset.
 */
class GazePointer extends Pointer {
  constructor() {
    super(2);
    this.controller.visible = false;
    this.grip.visible = false;
    this.hand.visible = false;
    this.laser.visible = false;
    this.enabled = false;
  }

  update(dt) {
    if (!this.enabled) {
      this.currentHit = null;
      this.reticle.visible = false;
      return;
    }
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.getWorldPosition(this.rayOrigin);
    this.raycaster.set(this.rayOrigin, dir);
    this.laser.visible = false;
    this.applyHit(this.raycaster.intersectObjects(pickTargets(), false));
  }
}

const pointers = [new Pointer(0), new Pointer(1)];
const gaze = new GazePointer();
pointersReady = true;
gazeReady = true;


// ---------------------------------------------------------------------------
// Thumbstick + face buttons (Quest Touch mapping)
// ---------------------------------------------------------------------------
let buttonCooldown = 0;

function readGamepads(dt) {
  const now = performance.now();

  pointers.forEach((p) => {
    const g = p.gamepad;
    if (!g) return;

    // --- thumbstick: push/pull the wall, strafe along it -------------------
    if (g.axes && g.axes.length >= 4) {
      const x = g.axes[2];
      const y = g.axes[3];
      if (Math.abs(y) > 0.15) {
        // Move the viewer, not the wall — moving the world under a stationary
        // head is the classic way to make someone sick.
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();
        rig.position.addScaledVector(dir, -y * dt * 1.6);
      }
      if (Math.abs(x) > 0.15 && p.handedness === 'left') {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0; dir.normalize();
        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
        rig.position.addScaledVector(right, x * dt * 1.4);
      }
      // Keep the viewer inside the wall's radius so it never clips through.
      const d = Math.hypot(rig.position.x, rig.position.z);
      if (d > WALL.radius - 0.8) {
        rig.position.multiplyScalar((WALL.radius - 0.8) / d);
      }
    }

    // With the gaze pointer, any face button selects — there is no trigger
    // aimed at anything.
    if (gaze.enabled && g.buttons && g.buttons.some((b) => b && b.pressed) && now - buttonCooldown >= 350) {
      buttonCooldown = now;
      gaze.activate();
      return;
    }

    if (!g.buttons || now - buttonCooldown < 350) return;

    // A / X (button 4) — sound; B / Y (button 5) — guide, or exit focus
    if (g.buttons[4] && g.buttons[4].pressed) {
      buttonCooldown = now;
      hud.onAudio();
    }
    if (g.buttons[5] && g.buttons[5].pressed) {
      buttonCooldown = now;
      if (state.focusMode) { state.portraitMode = false; setFocusMode(false); }
      else guide.toggle(camera);
    }
  });
}

// ---------------------------------------------------------------------------
// Two-handed grab-scale (interaction item 12)
// ---------------------------------------------------------------------------
let scaleBaseline = null;
let tapestryScale = 1;

function updateGrabScale() {
  const bothSqueezing = pointers.every((p) => p.squeezing && p.active && !p.grabbedPanel);
  const bothPinching = pointers.every((p) => p.usingHand && p.pinching);

  if (!bothSqueezing && !bothPinching) { scaleBaseline = null; return; }

  const handPoint = (p) => {
    const v = new THREE.Vector3();
    const tip = p.usingHand && p.hand.joints ? p.hand.joints['index-finger-tip'] : null;
    if (tip) tip.getWorldPosition(v);
    else v.setFromMatrixPosition(p.controller.matrixWorld);
    return v;
  };
  const dist = handPoint(pointers[0]).distanceTo(handPoint(pointers[1]));

  if (scaleBaseline === null) {
    scaleBaseline = { dist, scale: tapestryScale };
    return;
  }

  const ratio = dist / Math.max(0.05, scaleBaseline.dist);
  tapestryScale = THREE.MathUtils.clamp(scaleBaseline.scale * ratio, 0.55, 2.6);
  tapestry.setScaleFactor(tapestryScale);
}

// ---------------------------------------------------------------------------
// Desktop fallback — the same world, driven by mouse and keyboard
// ---------------------------------------------------------------------------
const desktop = {
  enabled: true,
  yaw: 0,
  pitch: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  keys: new Set(),
  mouse: new THREE.Vector2(-2, -2),
  raycaster: new THREE.Raycaster(),
  hoverPanel: null,
  hoverInstance: -1
};

renderer.domElement.addEventListener('mousedown', (e) => {
  if (renderer.xr.isPresenting) return;
  // Seed the pick coordinates here too: a tap, or a click with no preceding
  // move, would otherwise raycast from the off-screen default and miss.
  desktop.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  desktop.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  desktop.dragging = true;
  desktop.lastX = e.clientX;
  desktop.lastY = e.clientY;
  desktop.dragMoved = false;
});

window.addEventListener('mouseup', (e) => {
  if (renderer.xr.isPresenting) return;
  const wasDragging = desktop.dragging;
  desktop.dragging = false;
  if (wasDragging && !desktop.dragMoved) desktopClick();
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (renderer.xr.isPresenting) return;
  desktop.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  desktop.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (desktop.dragging) {
    const dx = e.clientX - desktop.lastX;
    const dy = e.clientY - desktop.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) desktop.dragMoved = true;
    desktop.yaw -= dx * 0.0035;
    desktop.pitch = THREE.MathUtils.clamp(desktop.pitch - dy * 0.0035, -1.1, 1.1);
    desktop.lastX = e.clientX;
    desktop.lastY = e.clientY;
  }
});

window.addEventListener('keydown', (e) => {
  desktop.keys.add(e.key.toLowerCase());
  if (renderer.xr.isPresenting) return;
  if (e.key.toLowerCase() === 'p') togglePortrait();
  if (e.key.toLowerCase() === 'f') setFocusMode(!state.focusMode);
  if (e.key === '?' || e.key === '/') guide.toggle(camera);
  if (e.key === 'Escape') { slab.close(); keyboard.close(); }
});
window.addEventListener('keyup', (e) => desktop.keys.delete(e.key.toLowerCase()));

function desktopClick() {
  const hit = desktopRaycast();
  if (!hit) {
    if (state.focusMode) { state.portraitMode = false; setFocusMode(false); }
    return;
  }
  const panel = hit.object.userData.panel;
  if (panel) {
    audio.resume();
    panel.pointerDown(hit.uv);
    if (panel.dirty) panel.paint();
    return;
  }
  if (hit.object.userData.railHandle) {
    rail.setFraction(rail.fractionFromWorld(hit.point));
    core.scrubPlayback(rail.fraction);
    rail.paint();
    return;
  }
  if (hit.object === tapestry.mesh && hit.instanceId !== undefined) {
    const block = tapestry.blockAt(hit.instanceId);
    if (!block) return;
    audio.resume();
    audio.playBlockTones(block, hit.point);
    hoverLabel.hide();
    slab.open(block);
    slab.presentTo(camera);
    world.pulseFloor(hit.point, 0.6);
  }
}

function desktopRaycast() {
  desktop.raycaster.setFromCamera(desktop.mouse, camera);
  const hits = desktop.raycaster.intersectObjects(pickTargets(), false);
  return hits.length > 0 ? hits[0] : null;
}

function updateDesktop(dt) {
  camera.rotation.set(desktop.pitch, desktop.yaw, 0, 'YXZ');

  const speed = dt * 1.8;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0; dir.normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));

  if (desktop.keys.has('w')) rig.position.addScaledVector(dir, speed);
  if (desktop.keys.has('s')) rig.position.addScaledVector(dir, -speed);
  if (desktop.keys.has('a')) rig.position.addScaledVector(right, -speed);
  if (desktop.keys.has('d')) rig.position.addScaledVector(right, speed);

  const d = Math.hypot(rig.position.x, rig.position.z);
  if (d > WALL.radius - 0.8) rig.position.multiplyScalar((WALL.radius - 0.8) / d);

  // Hover
  const hit = desktopRaycast();
  if (!hit) {
    if (desktop.hoverPanel) { desktop.hoverPanel.pointerLeave(); desktop.hoverPanel.paint(); desktop.hoverPanel = null; }
    if (desktop.hoverInstance !== -1) { desktop.hoverInstance = -1; tapestry.setHovered(-1); hoverLabel.hide(); }
    document.body.style.cursor = desktop.dragging ? 'grabbing' : 'grab';
    return;
  }

  const panel = hit.object.userData.panel;
  if (panel) {
    if (desktop.hoverPanel && desktop.hoverPanel !== panel) { desktop.hoverPanel.pointerLeave(); desktop.hoverPanel.paint(); }
    desktop.hoverPanel = panel;
    if (panel.pointerMove(hit.uv)) panel.paint();
    document.body.style.cursor = panel.hoveredId ? 'pointer' : 'grab';
    if (desktop.hoverInstance !== -1) { desktop.hoverInstance = -1; tapestry.setHovered(-1); hoverLabel.hide(); }
    return;
  }

  if (hit.object === tapestry.mesh && hit.instanceId !== undefined) {
    const block = tapestry.blockAt(hit.instanceId);
    document.body.style.cursor = 'pointer';
    if (block && hit.instanceId !== desktop.hoverInstance) {
      desktop.hoverInstance = hit.instanceId;
      tapestry.setHovered(hit.instanceId);
      if (!slab.visible || slab.pinned) hoverLabel.show(block);
    }
    hoverLabel.mesh.position.copy(hit.point).lerp(camera.position, 0.22);
    hoverLabel.mesh.position.y += 0.16;
    billboardY(hoverLabel.mesh, camera.position);
  }
}

// ---------------------------------------------------------------------------
// Data events
// ---------------------------------------------------------------------------
core.on('block', (block) => {
  tapestry.onBlockAdded();
  const i = block._slot;
  const pos = typeof i === 'number' ? tapestry.worldPositionOf(i) : new THREE.Vector3(0, 1.6, -WALL.radius);

  world.spawnShard(pos, block.whale_flag === 1);
  world.pulseFloor(pos, block.whale_flag === 1 ? 1.4 : 0.75);

  const progress = state.mode === 'HISTORICAL' && state.playback.fullList.length
    ? state.playback.index / state.playback.fullList.length
    : undefined;
  audio.playBlockTones(block, pos, progress);

  hud.paint();
  if (state.mode === 'HISTORICAL') rail.paint();
});

core.on('whale', (block) => {
  const pos = typeof block._slot === 'number'
    ? tapestry.worldPositionOf(block._slot)
    : new THREE.Vector3(0, 1.6, -WALL.radius);
  world.spawnShockwave(new THREE.Vector3(0, 0, 0));
  audio.playWhaleBoom();
  // Room-shaking haptics on both hands.
  pointers.forEach((p) => p.pulse(1.0, 180));
  toast.show(`🐳 Whale — ${block.largest_tx_value_usd ? '$' + Math.round(block.largest_tx_value_usd).toLocaleString() : 'massive transfer'}`);
});

core.on('reset', () => {
  tapestry.rebuild();
  hud.paint();
  rail.setVisible(state.mode === 'HISTORICAL');
  if (state.mode === 'HISTORICAL') {
    rail.setFraction(state.playback.fullList.length ? state.playback.index / state.playback.fullList.length : 1);
    rail.paint();
  }
});

core.on('stats', () => { hud.dirty = true; });
core.on('relay', ({ status }) => {
  hud.setRelay(status);
  hud.paint();
  if (status === 'simulated') toast.show('Relay unreachable — showing a simulated feed');
});

// ---------------------------------------------------------------------------
// VR button + session lifecycle
// ---------------------------------------------------------------------------
const vrButton = VRButton.createButton(renderer, {
  optionalFeatures: ['hand-tracking', 'local-floor', 'bounded-floor', 'layers']
});
Object.assign(vrButton.style, {
  position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
  zIndex: '9999', fontFamily: "'Space Mono', monospace", background: 'rgba(59,111,212,0.16)',
  color: '#8fb3ff', border: '1px solid #3b6fd4', borderRadius: '6px',
  padding: '14px 32px', cursor: 'pointer', fontWeight: '700', letterSpacing: '0.12em'
});
document.body.appendChild(vrButton);

// Entering XR is a user gesture, which is exactly when audio is allowed to start.
renderer.xr.addEventListener('sessionstart', () => {
  audio.resume();
  document.getElementById('desktop-hint')?.classList.add('hidden');
  rig.position.set(0, 0, 0);
  rail.place(1.6);
  toast.show('Reach out. Trigger a block to open it.', 4000);
});

renderer.xr.addEventListener('sessionend', () => {
  document.getElementById('desktop-hint')?.classList.remove('hidden');
});

// Resume audio on the first desktop interaction too.
['pointerdown', 'keydown'].forEach((evt) => {
  window.addEventListener(evt, () => audio.resume(), { once: true });
});

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let hudRepaintAccum = 0;
let hudOpacity = 1;

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;
  const pressure = core.getGasPressure();

  // Focus fade
  focusAmount += (focusTarget - focusAmount) * 0.06;
  world.setFocus(focusAmount);

  world.update(dt, elapsed, pressure);
  tapestry.update(elapsed);
  audio.setPressure(pressure);

  if (renderer.xr.isPresenting) {
    // Controller poses are written by three before this callback, but their
    // world matrices are only refreshed during render. Raycasting against
    // last frame's matrices makes a moving pointer feel unreliable, so bring
    // the whole graph up to date first.
    scene.updateMatrixWorld(true);

    pointers.forEach((p) => p.update(dt));
    // If nothing is connected, fall back to aiming with your head so the
    // session is never stuck with no way to press anything.
    gaze.enabled = !pointers.some((p) => p.connected);
    gaze.update(dt);
    readGamepads(dt);
    updateGrabScale();
  } else {
    updateDesktop(dt);
  }

  // The HUD ticker animates continuously, so repaint it at ~12Hz rather than
  // every frame — canvas uploads are the expensive part, not the drawing.
  hudRepaintAccum += dt;
  if (hudRepaintAccum > 0.08 && hudGroup.visible) {
    const nextDiag = renderer.xr.isPresenting ? diag.status() : '';
    if (hud.needsRepaint() || nextDiag !== hud.diagText) {
      hudRepaintAccum = 0;
      hud.diagText = nextDiag;
      hud.paint();
    }
  }

  // The HUD chases your gaze, which would park it right on top of the
  // settings wall. Fade it out as you turn to face the drawer.
  const gaze = new THREE.Vector3();
  camera.getWorldDirection(gaze);
  const facingDrawer = gaze.z > 0.35;
  const hudTarget = facingDrawer || state.focusMode ? 0 : 1;
  hudOpacity += (hudTarget - hudOpacity) * 0.12;
  hud.material.opacity = hudOpacity;
  hudGroup.visible = hudOpacity > 0.02;
  if (!facingDrawer) hudFollow.update(camera);
  if (toast.visible) toastFollow.update(camera);
  toast.update();

  slab.update(dt);
  if (slab.visible && !slab.pinned && !slab.grabbable.grabbedBy) {
    // Unpinned slabs drift to stay readable as you turn.
    billboardY(slab.group, camera.position);
  }
  if (guide.group.visible) guide.grabbable.update();

  drawer.grabbable.update();

  if (rail.group.visible) rail.place(camera.position.y);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
hud.paint();
core.primeInitialBlocks();
core.connectRelay();

// Expose a little surface for debugging from the Quest's remote inspector.
window.trace = { core, state, tapestry, world, scene, renderer, pointers, gaze, diag, panels: { hud, slab, drawer, guide, rail, keyboard } };

document.getElementById('boot-veil')?.classList.add('gone');
