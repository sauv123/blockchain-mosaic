// ============================================================================
// /trace XR — ATMOSPHERE
//
// Everything that is not the tapestry and not UI: the circadian sky, the
// volumetric haze, the floor that answers every block, the falling data rain,
// the shard a new block rides in on, and the shockwave a whale sends through
// the room.
//
// Post-processing note: three's EffectComposer does not support WebXR's
// multi-view render targets, so a real bloom/grain/aberration pass would break
// stereo rendering on Quest. Bloom here is done honestly in-scene (additive
// glow shells, additive sprites); grain and aberration are applied only on the
// desktop fallback path, where a composer is safe.
// ============================================================================

import * as THREE from 'three';
import { getCircadianSky, getCircadianState, state } from './core.js';
import { WALL } from './tiles.js';

// ---------------------------------------------------------------------------
// Theme tokens
//
// The room does not own a palette of its own. It is handed the *same* CSS
// custom properties the website is painting with (--bg-color, --accent-color,
// --success-color, --tracked-color, --text-primary), so the atmosphere can
// never drift out of step with the page: toggle the site to Charcoal and the
// rain, the floor grid, the haze and the arrival blocks all move with it.
//
// Light vs dark is decided by measuring the background's luminance rather than
// matching a theme *name*. A name test breaks the moment a third theme is
// added; a luminance test keeps working, because what the room actually needs
// to know is "am I a bright studio or a dark void".
// ---------------------------------------------------------------------------
export const DEFAULT_TOKENS = {
  bg:            '#14140f',
  accent:        '#3b6fd4',
  success:       '#3b6fd4',
  tracked:       '#00e5ff',
  whale:         '#ffffff',
  textPrimary:   '#e2e2da',
  textSecondary: '#8c8c85'
};

/** Perceptual luminance, 0..1. Used to decide bright studio vs dark void. */
function luminance(color) {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

// ---------------------------------------------------------------------------
// Circadian sky dome
// ---------------------------------------------------------------------------
const skyVert = /* glsl */`
  varying vec3 vWorld;
  void main() {
    vWorld = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = /* glsl */`
  precision highp float;
  uniform vec3  uTop;
  uniform vec3  uHorizon;
  uniform float uTime;
  uniform float uPressure;
  varying vec3  vWorld;

  // Cheap value noise — enough for haze banding, not worth a texture fetch.
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vWorld);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    vec3 col = mix(uHorizon, uTop, pow(h, 0.8));

    // A band of haze sits on the horizon and thickens with gas pressure, so a
    // congested network literally closes in around you.
    float haze = exp(-abs(dir.y) * (7.0 - uPressure * 4.0));
    col = mix(col, uHorizon * 1.5, haze * (0.35 + uPressure * 0.4));

    // Faint drifting grain keeps the dome from banding on an OLED panel.
    float g = hash(floor(dir * 320.0) + floor(uTime * 0.6));
    col += (g - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Reactive floor — an infinite grid that pulses outward on every new block
// ---------------------------------------------------------------------------
const floorVert = /* glsl */`
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const floorFrag = /* glsl */`
  precision highp float;
  uniform vec3  uColor;
  uniform float uTime;
  uniform float uPressure;
  uniform vec4  uPulses[6];  // xy: origin, z: start time, w: strength
  varying vec2  vPos;

  float gridLine(vec2 p, float spacing, float thickness) {
    vec2 g = abs(fract(p / spacing - 0.5) - 0.5) * spacing;
    float d = min(g.x, g.y);
    return 1.0 - smoothstep(0.0, thickness, d);
  }

  void main() {
    float dist = length(vPos);

    // Two grid densities so the floor still reads at distance.
    float fine   = gridLine(vPos, 0.5, 0.008 + dist * 0.0022);
    float coarse = gridLine(vPos, 2.5, 0.020 + dist * 0.0035);
    float grid = max(fine * 0.35, coarse * 0.8);

    // Expanding rings, one per recent block.
    float pulse = 0.0;
    for (int i = 0; i < 6; i++) {
      float age = uTime - uPulses[i].z;
      if (uPulses[i].w <= 0.0 || age < 0.0 || age > 3.0) continue;
      float radius = age * 7.0;
      float d = abs(distance(vPos, uPulses[i].xy) - radius);
      pulse += uPulses[i].w * exp(-d * 2.6) * (1.0 - age / 3.0);
    }

    vec3 col = uColor * (grid * (0.55 + uPressure * 0.6) + pulse * 1.6);

    // Fade to nothing at the far edge so there is no visible boundary.
    float fade = 1.0 - smoothstep(12.0, 30.0, dist);
    gl_FragColor = vec4(col, clamp((grid * 0.85 + pulse) * fade, 0.0, 1.0));
  }
`;

export class World {
  constructor(scene, tokens) {
    this.scene = scene;
    this.clock = 0;

    // Resolved theme colours. Everything below reads from here, never from a
    // literal, so applyPalette() is the single place a theme change lands.
    this.tokens = {};
    this.themeLight = false;
    this._resolveTokens(tokens || DEFAULT_TOKENS);

    const sky = getCircadianSky(getCircadianState());

    // --- Fog: the volumetric depth that makes the room feel like a space ---
    this.fog = new THREE.FogExp2(sky.fog, 0.035);
    scene.fog = this.fog;
    scene.background = new THREE.Color(sky.fog);

    // --- Sky dome ---------------------------------------------------------
    this.skyUniforms = {
      uTop:      { value: new THREE.Color(sky.top) },
      uHorizon:  { value: new THREE.Color(sky.horizon) },
      uTime:     { value: 0 },
      uPressure: { value: 0 }
    };
    const skyGeo = new THREE.SphereGeometry(60, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.renderOrder = -100;
    scene.add(this.sky);

    // --- Reactive floor ---------------------------------------------------
    this.pulses = [];
    for (let i = 0; i < 6; i++) this.pulses.push(new THREE.Vector4(0, 0, -100, 0));
    this.pulseCursor = 0;

    this.floorUniforms = {
      uColor:    { value: this.tokens.floor.clone() },
      uTime:     { value: 0 },
      uPressure: { value: 0 },
      uPulses:   { value: this.pulses }
    };
    const floorGeo = new THREE.PlaneGeometry(64, 64, 1, 1);
    const floorMat = new THREE.ShaderMaterial({
      uniforms: this.floorUniforms,
      vertexShader: floorVert,
      fragmentShader: floorFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.renderOrder = -5;
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    scene.add(this.floor);

    this._initRain();
    this._initShards();
    this._initShockwaves();

    // Now that every object exists, push the resolved tokens through it.
    this.applyPalette(this.tokens.source);
  }

  // -------------------------------------------------------------------------
  // Theming
  // -------------------------------------------------------------------------

  /**
   * Turns a set of raw CSS values into the Colors the room needs. Kept separate
   * from applyPalette() so the constructor can resolve tokens *before* the
   * meshes that consume them exist.
   */
  _resolveTokens(src) {
    const c = (v, fallback) => {
      const col = new THREE.Color();
      try { col.set(v); } catch (e) { col.set(fallback); }
      return col;
    };
    const bg          = c(src.bg,            DEFAULT_TOKENS.bg);
    const accent      = c(src.accent,        DEFAULT_TOKENS.accent);
    const success     = c(src.success,       DEFAULT_TOKENS.success);
    const tracked     = c(src.tracked,       DEFAULT_TOKENS.tracked);
    const whale       = c(src.whale,         DEFAULT_TOKENS.whale);
    const textPrimary = c(src.textPrimary,   DEFAULT_TOKENS.textPrimary);

    const light = luminance(bg) > 0.45;

    // On a bright background an additive grid disappears, and a saturated one
    // turns the studio into a neon box. So the floor takes the accent on dark
    // and a desaturated ink on light, where it reads as a drafting grid.
    const floor = light
      ? textPrimary.clone().lerp(bg, 0.45)
      : accent.clone().lerp(success, 0.5);

    this.tokens = {
      source: { ...DEFAULT_TOKENS, ...src },
      bg, accent, success, tracked, whale, textPrimary, floor, light
    };
    this.themeLight = light;
    return this.tokens;
  }

  /**
   * The live theme change. Called whenever the site's CSS custom properties
   * change — every particle, the grid, the haze, the sky and the arrival
   * effects are repainted from the same values the page is using.
   */
  applyPalette(src) {
    const t = this._resolveTokens(src || this.tokens.source);
    const light = t.light;

    this.floorUniforms.uColor.value.copy(t.floor);

    // Additive particles over a pale background wash out; they need far less
    // opacity to read there than they do against the void.
    this.rainBaseOpacity = light ? 0.30 : 0.55;
    this.rain.material.opacity = this.rainBaseOpacity * (1 - (this.focus || 0));
    this.rain.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.rain.material.needsUpdate = true;
    this._paintRain();

    // The void is the page background itself, so the wall and the room share
    // one continuous colour with no seam at the frame.
    this.baseFogColor = t.bg.clone();
    this.fog.color.copy(this.baseFogColor);
    if (this.scene.background && this.scene.background.copy) {
      this.scene.background.copy(this.baseFogColor);
    }
    // The dome is the background lifted slightly at the zenith and pulled
    // towards the accent at the horizon, which is what gives the space depth.
    this.skyUniforms.uTop.value.copy(t.bg).lerp(light ? t.whale : new THREE.Color(0x000000), 0.18);
    this.skyUniforms.uHorizon.value.copy(t.bg).lerp(t.accent, light ? 0.10 : 0.22);

    // Arrival shards and whale rings follow too.
    this.shardPool.forEach((s) => s.mesh.material.color.copy(t.accent));
    this.wavePool.forEach((w) => w.mesh.material.color.copy(t.whale));

    return t;
  }

  /**
   * Repaints the rain buffer from the current tokens.
   *
   * Each drop keeps a fixed random roll from birth, so a theme change recolours
   * the *same* drops rather than reshuffling which ones are sparks — the field
   * shifts hue in place instead of visibly scrambling.
   */
  _paintRain() {
    const t = this.tokens;
    const col = this.rain.geometry.attributes.color.array;
    const body   = t.success.clone().lerp(t.accent, 0.35);
    const spark  = t.tracked.clone();
    const rare   = t.light ? t.textPrimary.clone() : t.whale.clone();

    // On light themes the drops are ink on paper, not light in a void: a
    // glowing particle on #c8c6c0 is invisible, so each drop is pulled towards
    // the theme's text colour to darken it while keeping its hue.
    //
    // This is a lerp *towards* ink, never an extrapolation away from the
    // background — extrapolating drove components negative, which is outside
    // the gamut and is not something a colour buffer should ever carry.
    const tint = (c) => (t.light ? c.clone().lerp(t.textPrimary, 0.45) : c);
    const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

    const b = tint(body), sp = tint(spark), r = tint(rare);
    for (let i = 0; i < this.rainCount; i++) {
      const roll = this.rainRoll[i];
      const pick = roll < 0.03 ? r : roll < 0.15 ? sp : b;
      // A little per-drop variance so the field has depth rather than reading
      // as one flat colour.
      const v = 0.82 + this.rainVary[i] * 0.28;
      col[i * 3]     = clamp01(pick.r * v);
      col[i * 3 + 1] = clamp01(pick.g * v);
      col[i * 3 + 2] = clamp01(pick.b * v);
    }
    this.rain.geometry.attributes.color.needsUpdate = true;
  }

  /** The accent in use, for callers that tint their own objects to match. */
  get accentColor() { return this.tokens.accent; }

  // -------------------------------------------------------------------------
  // Data rain — transactions falling as light streaks. Density tracks the
  // real transaction count of the wall.
  // -------------------------------------------------------------------------
  _initRain() {
    this.rainCount = 4200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.rainCount * 3);
    const col = new Float32Array(this.rainCount * 3);
    const spd = new Float32Array(this.rainCount);

    // Fixed per-drop rolls: which drops are sparks, and how bright each one
    // is. Held for the life of the field so a theme change recolours the same
    // drops rather than redealing them (see _paintRain).
    this.rainRoll = new Float32Array(this.rainCount);
    this.rainVary = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      const radius = 2.5 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3]     = Math.cos(theta) * radius;
      pos[i * 3 + 1] = Math.random() * 16 - 2;
      pos[i * 3 + 2] = Math.sin(theta) * radius;

      this.rainRoll[i] = Math.random();
      this.rainVary[i] = Math.random();

      // Placeholder white; _paintRain() writes the real theme colour as soon
      // as the geometry exists.
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1;

      spd[i] = 0.6 + Math.random() * 2.4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.rainSpeeds = spd;

    this.rainBaseOpacity = this.tokens.light ? 0.30 : 0.55;
    const mat = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      transparent: true,
      opacity: this.rainBaseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.rain = new THREE.Points(geo, mat);
    this.rain.renderOrder = -4;
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  // -------------------------------------------------------------------------
  // Arrival shards — every new block rides one in and slots into the wall.
  // -------------------------------------------------------------------------
  _initShards() {
    this.shardPool = [];
    const geo = new THREE.OctahedronGeometry(0.075, 0);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: this.tokens.accent.clone(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = -3;
      mesh.visible = false;
      this.scene.add(mesh);
      this.shardPool.push({ mesh, active: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() });
    }
  }

  spawnShard(targetPos, whale) {
    const shard = this.shardPool.find((s) => !s.active);
    if (!shard) return;
    shard.active = true;
    shard.t = 0;
    shard.to.copy(targetPos);
    // Drops in from high above and slightly behind the wall.
    shard.from.set(targetPos.x * 1.5, targetPos.y + 5.5, targetPos.z * 1.5);
    shard.mesh.material.color.copy(whale ? this.tokens.whale : this.tokens.accent);
    shard.mesh.scale.setScalar(whale ? 2.2 : 1.0);
    shard.mesh.visible = true;
  }

  // -------------------------------------------------------------------------
  // Whale shockwaves — a ring that actually passes through you.
  // -------------------------------------------------------------------------
  _initShockwaves() {
    this.wavePool = [];
    const geo = new THREE.RingGeometry(0.9, 1.0, 96);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = -3;
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.wavePool.push({ mesh, active: false, t: 0 });
    }
  }

  spawnShockwave(origin) {
    const wave = this.wavePool.find((w) => !w.active);
    if (!wave) return;
    wave.active = true;
    wave.t = 0;
    wave.mesh.position.set(origin.x, 0.05, origin.z);
    wave.mesh.visible = true;
  }

  /** Called on every new block: pulse the floor beneath where it landed. */
  pulseFloor(worldPos, strength = 1) {
    const p = this.pulses[this.pulseCursor];
    // The floor plane is rotated, so its local xy maps to world x,z.
    p.set(worldPos.x, -worldPos.z, this.clock, strength);
    this.pulseCursor = (this.pulseCursor + 1) % this.pulses.length;
  }

  /**
   * Theme by name, for the native build which knows the site's theme keys but
   * has no document to read custom properties from. It is a thin wrapper: the
   * values below are the same ones style.css declares for :root and
   * body.charcoal-theme, so both builds end up in applyPalette() with the same
   * numbers.
   */
  setTheme(themeName) {
    const NAMED = {
      warmGray: {
        bg: '#c8c6c0', accent: '#3b6fd4', success: '#3b6fd4',
        tracked: '#00b0ff', whale: '#ffffff',
        textPrimary: '#1e1e1a', textSecondary: '#5e5e5a'
      },
      charcoal: {
        bg: '#14140f', accent: '#3b6fd4', success: '#3b6fd4',
        tracked: '#00e5ff', whale: '#ffffff',
        textPrimary: '#e2e2da', textSecondary: '#8c8c85'
      }
    };
    this.applyPalette(NAMED[themeName] || NAMED.charcoal);
  }

  /** Focus Mode: the room dissolves, only the tapestry remains. */
  setFocus(amount) {
    this.focus = amount;
    const keep = 1 - amount;
    this.floor.material.opacity = keep;
    this.rain.material.opacity = (this.rainBaseOpacity ?? 0.55) * keep;
    this.sky.visible = amount < 0.98;
    this.skyUniforms.uTop.value.multiplyScalar(1);
    this.fog.density = 0.035 + amount * 0.09;
  }

  update(dt, elapsed, pressure) {
    this.clock = elapsed;

    // Circadian drift — the sky and fog follow the clock, recomputed cheaply
    // once a second rather than every frame.
    if (this.themeLight) {
      // Warm Gray is a deliberate flat studio; the circadian sky would fight it.
      this.skyUniforms.uTime.value = elapsed;
      this.floorUniforms.uTime.value = elapsed;
      this._updateRain(dt, pressure);
      this._updateShards(dt);
      this._updateShockwaves(dt);
      return;
    }

    if (!this._lastSkyCheck || elapsed - this._lastSkyCheck > 1) {
      this._lastSkyCheck = elapsed;
      const sky = getCircadianSky(getCircadianState());
      // The circadian cycle *tints* the theme rather than replacing it. Before
      // this, the hour of day overwrote the sky outright and the theme's own
      // background was gone a second after a toggle — the room drifted off the
      // page. Now the theme is the anchor and the clock shifts it.
      const t = this.tokens;
      const tone = (base, c, amount) =>
        base.clone().lerp(new THREE.Color(c), amount);

      this.skyUniforms.uTop.value.lerp(
        tone(t.bg.clone().lerp(new THREE.Color(0x000000), 0.18), sky.top, 0.5), 0.08);
      this.skyUniforms.uHorizon.value.lerp(
        tone(t.bg.clone().lerp(t.accent, 0.22), sky.horizon, 0.5), 0.08);
      this.fog.color.lerp(tone(t.bg, sky.fog, 0.45), 0.08);
      if (this.scene.background && this.scene.background.lerp) {
        this.scene.background.lerp(tone(t.bg, sky.fog, 0.45), 0.08);
      }
      this.circadianColor = new THREE.Color(sky.horizon);
      this.circadianIntensity = sky.intensity;
    }

    this.skyUniforms.uTime.value = elapsed;
    this.skyUniforms.uPressure.value = pressure;
    this.floorUniforms.uTime.value = elapsed;
    this.floorUniforms.uPressure.value = pressure;

    // Gas pressure thickens the air (atmosphere item 7).
    const targetDensity = 0.028 + pressure * 0.055 + (this.focus || 0) * 0.09;
    this.fog.density += (targetDensity - this.fog.density) * 0.02;

    this._updateRain(dt, pressure);
    this._updateShards(dt);
    this._updateShockwaves(dt);
  }

  _updateRain(dt, pressure) {
    const pos = this.rain.geometry.attributes.position.array;
    // Visible fraction of the field maps to how busy the wall actually is.
    const activity = Math.min(1, (state.stats.sessionTotalTx % 4000) / 4000 + pressure * 0.5);
    const visible = Math.floor(this.rainCount * (0.25 + activity * 0.75));
    this.rain.geometry.setDrawRange(0, visible);

    const fallScale = dt * (0.9 + pressure * 2.6);
    for (let i = 0; i < visible; i++) {
      pos[i * 3 + 1] -= this.rainSpeeds[i] * fallScale;
      if (pos[i * 3 + 1] < -2) pos[i * 3 + 1] = 14;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;

    // Slow orbit so the field never looks like a static particle dump.
    this.rain.rotation.y += dt * (0.01 + pressure * 0.05);
  }

  _updateShards(dt) {
    this.shardPool.forEach((s) => {
      if (!s.active) return;
      s.t += dt / 1.1;
      if (s.t >= 1) {
        s.active = false;
        s.mesh.visible = false;
        s.mesh.material.opacity = 0;
        return;
      }
      const e = 1 - Math.pow(1 - s.t, 3);
      s.mesh.position.lerpVectors(s.from, s.to, e);
      s.mesh.rotation.x += dt * 5;
      s.mesh.rotation.y += dt * 3;
      s.mesh.material.opacity = Math.sin(s.t * Math.PI) * 0.9;
    });
  }

  _updateShockwaves(dt) {
    this.wavePool.forEach((w) => {
      if (!w.active) return;
      w.t += dt / 2.4;
      if (w.t >= 1) {
        w.active = false;
        w.mesh.visible = false;
        return;
      }
      const r = 0.3 + w.t * 16;
      w.mesh.scale.setScalar(r);
      w.mesh.material.opacity = (1 - w.t) * 0.55;
    });
  }
}
