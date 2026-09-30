// ============================================================================
// /trace XR — THE TAPESTRY
//
// The 2D build painted each block with drawTile(): a glass pane holding an 8x8
// sub-pixel field where every lit cell is one transaction, coloured by type.
// Here the same block is a real slab on a curved wall, and the 8x8 field is
// evaluated on the GPU from a pattern texture — one texel per sub-pixel, so
// the pattern is bit-identical to what packBlockPattern() computed on the CPU.
//
// Everything is one InstancedMesh plus one additive glow shell, which is what
// keeps a 288-block wall inside the Quest's draw-call budget at 90Hz.
// ============================================================================

import * as THREE from 'three';
import {
  state, PALETTES, THEMES, TX_TYPES, getSubpixelLayout, getBlockTransactions,
  getNetworkFactor, getPhasePhysics, getTimeOfDayDrift, getCircadianState,
  getTemporalSortedBlocks, getDailyMaskAlignment, getCategoryForDay
} from './core.js';

export const WALL = {
  radius: 3.6,          // metres from the viewer to the wall
  tile: 0.20,           // tile edge length in metres
  baseY: 0.38,          // world Y of the bottom row
  depth: 0.06,          // max slab thickness
  // Horizontal sweep is derived from the tile pitch, never fixed: a wall with
  // a hard-coded arc either gaps open or overlaps as the column count changes.
  get arcDeg() {
    return THREE.MathUtils.radToDeg((state.cols * this.tile) / this.radius);
  }
};

const PATTERN_W = 64;   // one texel per sub-pixel cell

const vertexShader = /* glsl */`
  attribute float aIndex;
  attribute vec4 aParams;   // x: feeNorm  y: txNorm  z: whale  w: contractRatio
  attribute vec4 aState;    // x: alpha    y: age01   z: hovered w: tracked

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vIndex;
  varying vec4 vParams;
  varying vec4 vState;

  void main() {
    vUv = uv;
    vNormal = normal;
    vIndex = aIndex;
    vParams = aParams;
    vState = aState;

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;

  uniform sampler2D uPattern;
  uniform float     uPatternRows;
  uniform vec3      uPalette[5];
  uniform vec3      uTileBg;       // THEMES[currentTheme].tileBg
  uniform float     uTime;
  uniform float     uMacro;        // 0 = MICRO, 1 = MACRO
  uniform float     uFilterType;   // legend filter: -1 = none, else a TX_TYPES index
  uniform float     uGlowPass;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vIndex;
  varying vec4  vParams;   // x: onTemplate  y: dominantType  z: whale  w: hasFilterMatch
  varying vec4  vState;    // x: alpha  y: age01  z: hovered  w: tracked

  void main() {
    float alpha = vState.x;
    if (alpha <= 0.001) discard;

    float age        = vState.y;
    float hovered    = vState.z;
    float tracked    = vState.w;
    float onTemplate = vParams.x;
    float dominant   = vParams.y;
    float whale      = vParams.z;
    float filterHit  = vParams.w;

    // ---- Side and back faces: a dim structural edge -----------------------
    if (vNormal.z < 0.5) {
      vec3 edge = uTileBg * 0.85;
      float rim = pow(1.0 - abs(vNormal.z), 2.0);
      gl_FragColor = vec4(edge * (0.7 + rim * 0.5 + hovered * 0.8),
                          alpha * (uGlowPass > 0.5 ? 0.06 : 0.9));
      return;
    }

    // =======================================================================
    // Front face — mosaic.js drawTile(), port for port.
    // =======================================================================

    // --- "PREMIUM 3D GLASS PANE BACKGROUND" -------------------------------
    // roundRect fill with a vertical gradient:
    //   top    rgba(255,255,255, onTemplate ? 0.04 : 0.01)
    //   bottom rgba(0,0,0,0.2)
    // UV v runs bottom-up, so the canvas' y/size is (1.0 - vUv.y).
    float gy = 1.0 - vUv.y;
    float topA = mix(0.01, 0.04, onTemplate);
    vec3  paneCol = mix(vec3(1.0), vec3(0.0), gy);
    float paneA   = mix(topA, 0.2, gy);
    vec3 col = mix(uTileBg, paneCol, paneA);
    float a = 1.0;

    // Rounded corners: radius 8 on a 64px tile = 0.125 of the edge.
    vec2 q = abs(vUv - 0.5) - (0.5 - 0.125);
    float corner = length(max(q, 0.0)) - 0.125;
    if (corner > 0.0) discard;

    // "Subtle outer glass rim"
    float rimBand = smoothstep(-0.020, -0.004, corner);
    col = mix(col, vec3(1.0), rimBand * mix(0.02, 0.08, onTemplate));

    if (uMacro > 0.5) {
      // ---- MACRO: one solid square in the dominant transaction colour ----
      // "Absolutely NO background. Pure geometric shape."
      if (onTemplate < 0.5) discard;

      vec3 baseColor = uPalette[0];
      if (dominant > 3.5)      baseColor = uPalette[4];
      else if (dominant > 2.5) baseColor = uPalette[3];
      else if (dominant > 1.5) baseColor = uPalette[2];
      else if (dominant > 0.5) baseColor = uPalette[1];

      // roundRect(x+1, y+1, size-2, size-2, 6)
      vec2 mq = abs(vUv - 0.5) - (0.5 - 0.016 - 0.094);
      float mCorner = length(max(mq, 0.0)) - 0.094;
      if (mCorner > 0.0) discard;

      col = baseColor;
      // Legend filter dims every block that is not the clicked type.
      if (uFilterType >= 0.0 && abs(dominant - uFilterType) > 0.5) a *= 0.15;

      if (filterHit > 0.5 || hovered > 0.5) {
        float edge = smoothstep(-0.018, -0.004, mCorner);
        col = mix(col, vec3(1.0), edge * 0.85);
      }
    } else {
      // ---- MICRO: the 8x8 sub-pixel field ---------------------------------
      // globalAlpha = (isOnTemplate ? 1.0 : 0.05) * (isDimmed ? 0.1 : 1.0)
      float maskModifier = mix(0.05, 1.0, onTemplate);
      float dimmed = (uFilterType >= 0.0 && filterHit < 0.5) ? 0.1 : 1.0;
      float cellAlpha = maskModifier * dimmed;

      vec2 cell  = floor(vUv * 8.0);
      float row  = 7.0 - cell.y;              // UV is bottom-up, the grid is top-down
      float idx  = row * 8.0 + cell.x;

      vec4 pat = texture2D(uPattern, vec2((idx + 0.5) / 64.0, (vIndex + 0.5) / uPatternRows));

      if (pat.r > 0.5) {
        float typeIdx = floor(pat.g * 255.0 + 0.5);
        vec3 cellColor = uPalette[0];
        if (typeIdx > 3.5)      cellColor = uPalette[4];
        else if (typeIdx > 2.5) cellColor = uPalette[3];
        else if (typeIdx > 1.5) cellColor = uPalette[2];
        else if (typeIdx > 0.5) cellColor = uPalette[1];

        // fillRect(x + col*subSize + 0.5, ..., subSize - 1, subSize - 1)
        // On a 64px tile subSize is 8px, so the 0.5px inset is 1/16 of a cell.
        vec2 inCell = fract(vUv * 8.0);
        vec2 m = step(vec2(0.0625), inCell) * step(inCell, vec2(0.9375));
        float sq = m.x * m.y;

        col = mix(col, cellColor, sq * cellAlpha);
      }
    }

    // --- Tracked wallet: white 2px frame plus a 4px centre dot -------------
    if (tracked > 0.5) {
      float frame = step(0.94, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
      float dot = step(max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)), 0.031);
      col = mix(col, vec3(1.0), max(frame, dot));
    }

    // --- Whale flash: pulsing white outline (MICRO) / fill (MACRO) ---------
    if (whale > 0.5) {
      float pulse = (sin(uTime * 5.0) + 1.0) * 0.5;
      if (uMacro > 0.5) {
        col = mix(col, vec3(1.0), 0.4 + pulse * 0.6);
      } else {
        float outline = step(0.94, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
        col = mix(col, vec3(1.0), outline * (0.6 + pulse * 0.4));
      }
    }

    // --- Hover: white stroke over a 20% white wash, as the 2D build does ---
    if (hovered > 0.5) {
      col = mix(col, vec3(1.0), 0.2);
      float edge = step(0.96, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
      col = mix(col, vec3(1.0), edge);
    }

    // --- Arrival: PAINT_DURATION wipe, the one thing 2D does with progress -
    float paintLine = age * 1.25;
    float painted = 1.0 - smoothstep(paintLine - 0.22, paintLine, gy);
    a *= mix(0.0, 1.0, painted);
    if (a <= 0.001) discard;

    if (uGlowPass > 0.5) {
      float falloff = 1.0 - length(vUv - 0.5) * 1.6;
      gl_FragColor = vec4(col * 1.4, clamp(falloff, 0.0, 1.0) * 0.13 * alpha * a);
      return;
    }

    gl_FragColor = vec4(col, a * alpha);
  }
`;

export class Tapestry {
  constructor(scene, maxTiles) {
    this.scene = scene;
    this.max = maxTiles;
    this.blockForInstance = new Array(maxTiles).fill(null);
    // gridPosOf[slot] -> position on the wall, or -1 when the slot is unused.
    this.gridPosOf = new Int32Array(maxTiles).fill(-1);
    this.dominantOf = new Uint8Array(maxTiles);
    this.head = 0;
    this.patternDirty = false;
    this.renderScale = 'MICRO';
    this.filterType = -1;
    this.hoveredIndex = -1;

    // --- Pattern texture: 64 sub-pixels wide, one row per block ------------
    this.patternData = new Uint8Array(PATTERN_W * maxTiles * 4);
    this.patternTex = new THREE.DataTexture(this.patternData, PATTERN_W, maxTiles, THREE.RGBAFormat);
    this.patternTex.minFilter = THREE.NearestFilter;
    this.patternTex.magFilter = THREE.NearestFilter;
    this.patternTex.needsUpdate = true;

    this.uniforms = {
      uPattern:     { value: this.patternTex },
      uPatternRows: { value: maxTiles },
      uPalette:     { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] },
      uTileBg:      { value: new THREE.Color(THEMES.charcoal.tileBg) },
      uTime:        { value: 0 },
      uMacro:       { value: 0 },
      uFilterType:  { value: -1 },
      uGlowPass:    { value: 0 }
    };

    const geo = new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide
    });

    this.mesh = new THREE.InstancedMesh(geo, material, maxTiles);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'tapestry';
    // The world draws before the UI. These are transparent, and three sorts
    // transparent objects by their ORIGIN's distance — which for an
    // InstancedMesh at (0,0,0) is the viewer's own feet, so without an
    // explicit order the wall's glow shell painted over every panel.
    this.mesh.renderOrder = -2;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);

    // --- Additive glow shell (light bleed, atmosphere item 4) --------------
    const glowUniforms = THREE.UniformsUtils.clone(this.uniforms);
    // Share the live objects rather than the clones so one update drives both.
    glowUniforms.uPattern = this.uniforms.uPattern;
    glowUniforms.uPalette = this.uniforms.uPalette;
    glowUniforms.uTileBg = this.uniforms.uTileBg;
    glowUniforms.uGlowPass = { value: 1 };
    this.glowUniforms = glowUniforms;

    const glowMat = new THREE.ShaderMaterial({
      uniforms: glowUniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide
    });

    this.glow = new THREE.InstancedMesh(geo, glowMat, maxTiles);
    this.glow.frustumCulled = false;
    this.glow.renderOrder = -1;
    this.glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.glow);

    // --- Per-instance attributes -------------------------------------------
    this.aIndex  = new THREE.InstancedBufferAttribute(new Float32Array(maxTiles), 1);
    this.aParams = new THREE.InstancedBufferAttribute(new Float32Array(maxTiles * 4), 4);
    this.aState  = new THREE.InstancedBufferAttribute(new Float32Array(maxTiles * 4), 4);
    this.aIndex.setUsage(THREE.DynamicDrawUsage);
    this.aParams.setUsage(THREE.DynamicDrawUsage);
    this.aState.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < maxTiles; i++) this.aIndex.setX(i, i);

    [this.mesh, this.glow].forEach((m) => {
      m.geometry.setAttribute('aIndex', this.aIndex);
      m.geometry.setAttribute('aParams', this.aParams);
      m.geometry.setAttribute('aState', this.aState);
    });

    this._m = new THREE.Matrix4();
    this._pos = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._euler = new THREE.Euler();
    this._scale = new THREE.Vector3();

    this.setPalette(state.palette);
    this.rebuild();
  }

  setPalette(name) {
    const p = PALETTES[name] || PALETTES.spectrum;
    TX_TYPES.forEach((t, i) => {
      this.uniforms.uPalette.value[i].set(p[t] || p.default);
    });
  }

  /**
   * Writes one block's 8x8 field into the pattern texture row `slot`.
   *
   * This mirrors mosaic.js drawTile() exactly. The important detail is the
   * colour lookup: the website uses `txs[cell.index % txs.length]`, keyed on
   * the cell's position in the 8x8 grid — NOT on its rank in the sorted
   * activeCells list. Using the rank produced a different, wronger mosaic.
   */
  writePattern(slot, block) {
    const hash = (block.hash || '0x0').replace('0x', '');
    const density = Math.max(0.1, Math.min(0.85, block.tx_count / 300));
    const targetOnCount = Math.max(6, Math.floor(density * 64));
    const regularity = 1.0 - (block.contract_ratio || 0);
    const activeCells = getSubpixelLayout(hash, targetOnCount, regularity);
    const txs = getBlockTransactions(block);

    const base = slot * PATTERN_W * 4;
    // Clear first: only the cells in activeCells are lit.
    for (let cell = 0; cell < 64; cell++) {
      const o = base + cell * 4;
      this.patternData[o] = 0;
      this.patternData[o + 1] = 0;
      this.patternData[o + 2] = 0;
      this.patternData[o + 3] = 255;
    }

    activeCells.forEach((cell) => {
      const tx = txs[cell.index % txs.length] || { type: 'Plain Transfer' };
      const typeIdx = Math.max(0, TX_TYPES.indexOf(tx.type));
      const o = base + cell.index * 4;
      this.patternData[o] = 255;          // lit
      this.patternData[o + 1] = typeIdx;  // palette slot
    });

    // MACRO draws the whole tile in the block's dominant transaction colour.
    let dominantType = 'Plain Transfer';
    let maxCount = 0;
    const counts = {};
    txs.forEach((t) => {
      const type = t.type || 'Plain Transfer';
      counts[type] = (counts[type] || 0) + 1;
      if (counts[type] > maxCount) { maxCount = counts[type]; dominantType = type; }
    });
    this.dominantOf[slot] = Math.max(0, TX_TYPES.indexOf(dominantType));
  }

  /**
   * Gives a block a permanent texture row, packing its 8x8 field once.
   * The row is a ring slot: it outlives reordering, so a new block costs one
   * texel-row write instead of re-packing the whole wall.
   */
  assignSlot(block) {
    if (block._slot !== undefined && this.blockForInstance[block._slot] === block) {
      return block._slot;
    }
    const slot = this.head;
    this.head = (this.head + 1) % this.max;

    const evicted = this.blockForInstance[slot];
    if (evicted) evicted._slot = undefined;

    block._slot = slot;
    this.blockForInstance[slot] = block;
    this.writePattern(slot, block);
    this.patternDirty = true;
    return slot;
  }

  /**
   * Recomputes where each block sits on the wall. Packing is NOT redone here:
   * re-packing 442 blocks cost ~5 ms, which dropped a frame on every arrival.
   */
  rebuild() {
    const cState = getCircadianState();
    const ordered = getTemporalSortedBlocks(state.blocks, cState);
    this.ordered = ordered;

    this.gridPosOf.fill(-1);
    for (let pos = 0; pos < ordered.length && pos < this.max; pos++) {
      const slot = this.assignSlot(ordered[pos]);
      this.gridPosOf[slot] = pos;
    }

    // Any slot the current feed no longer occupies stops rendering.
    for (let slot = 0; slot < this.max; slot++) {
      if (this.gridPosOf[slot] === -1) this.blockForInstance[slot] = null;
    }

    if (this.patternDirty) {
      this.patternTex.needsUpdate = true;
      this.patternDirty = false;
    }
    this.updateInstances(0);
  }

  /**
   * Forces every pattern to be re-packed. Only needed when something changes
   * the *transactions* a block reports — tracking a wallet injects a tx, which
   * changes which colours light up.
   */
  repackAll() {
    for (let slot = 0; slot < this.max; slot++) {
      const b = this.blockForInstance[slot];
      if (b) this.writePattern(slot, b);
    }
    this.patternTex.needsUpdate = true;
  }

  /** Cheap path for a single new block arriving. */
  onBlockAdded() {
    this.rebuild();
  }

  /** Geometric centre of instance i, in world space — used to place audio. */
  worldPositionOf(i) {
    const v = new THREE.Vector3();
    this.mesh.getMatrixAt(i, this._m);
    v.setFromMatrixPosition(this._m);
    this.mesh.localToWorld(v);
    return v;
  }

  blockAt(instanceId) {
    return this.blockForInstance[instanceId] || null;
  }

  setHovered(instanceId) {
    this.hoveredIndex = instanceId;
  }

  /**
   * Recomputes every instance's transform and per-instance state. Called once
   * per frame: ~290 matrix composes, which is nothing next to the shading.
   */
  updateInstances(time) {
    const cols = state.cols;
    const rows = state.rows;
    const now = Date.now();

    const latest = state.blocks[state.blocks.length - 1];
    const factor = getNetworkFactor(latest);
    const [gutterUnits] = getPhasePhysics(factor);
    const timePhase = getCircadianState();

    // The phase gutter widens the tile pitch without changing the tile size,
    // so a quiet network literally has more air between its blocks.
    const pitch = WALL.tile * (1 + gutterUnits * 0.045);
    const vStep = pitch;
    // Angular step follows the pitch, so tiles always sit edge to edge.
    const angStep = pitch / WALL.radius;
    const arc = angStep * cols;

    for (let i = 0; i < this.max; i++) {
      const pos = this.gridPosOf[i];
      const block = pos >= 0 ? this.blockForInstance[i] : null;

      if (!block) {
        this.aState.setXYZW(i, 0, 0, 0, 0);
        this._m.makeScale(0.0001, 0.0001, 0.0001);
        this.mesh.setMatrixAt(i, this._m);
        this.glow.setMatrixAt(i, this._m);
        continue;
      }

      const col = pos % cols;
      const row = Math.floor(pos / cols);

      const drift = getTimeOfDayDrift(col, row, cols, rows, factor, timePhase);
      // Canvas drift was in pixels against a 64px tile; scale into metres.
      const driftX = (drift.dx / 64) * WALL.tile;
      const driftY = (drift.dy / 64) * WALL.tile;

      // Angular position on the wall, offset by the horizontal drift.
      const tAngle = (-arc / 2) + (col + 0.5) * angStep + (driftX / WALL.radius);
      const y = WALL.baseY + (rows - 1 - row) * vStep - driftY;

      // Depth: denser blocks stand further out of the wall.
      const txNorm = Math.min(1, block.tx_count / (state.chain === 'solana' ? 2200 : 300));
      const feeNorm = Math.min(1, block.base_fee_gwei / (state.chain === 'solana' ? 0.0002 : 100));
      const isHovered = i === this.hoveredIndex;

      // Arrival: paint in over 1200ms, matching PAINT_DURATION in the 2D build.
      const age = Math.min(1, (now - (block._mintedAt || 0)) / 1200);
      const eased = 1 - Math.pow(1 - age, 3);

      let depth = WALL.depth * (0.35 + txNorm * 0.65);
      if (isHovered) depth *= 1.9;
      // New blocks fly in from outside the wall and settle.
      const approach = (1 - eased) * 0.55;

      const r = WALL.radius + approach;
      this._pos.set(Math.sin(tAngle) * r, y, -Math.cos(tAngle) * r);
      // Negative: rotating by +tAngle would aim the slab's lit face at the
      // wall's outside. The face has to look back at the viewer in the middle.
      this._euler.set(0, -tAngle, (1 - eased) * 0.5);
      this._quat.setFromEuler(this._euler);

      const s = WALL.tile * (0.92 + eased * 0.08) * (isHovered ? 1.14 : 1.0);
      this._scale.set(s, s, depth);

      this._m.compose(this._pos, this._quat, this._scale);
      this.mesh.setMatrixAt(i, this._m);

      // Glow shell: same pose, inflated, so the bleed spills past the slab.
      this._scale.set(s * 1.55, s * 1.55, depth * 0.9);
      this._m.compose(this._pos, this._quat, this._scale);
      this.glow.setMatrixAt(i, this._m);

      // Portrait templates mask the archive; LIVE is always on-template, which
      // is exactly what mosaic.js draw() decides before calling drawTile.
      let onTemplate = 1;
      if (state.mode === 'HISTORICAL') {
        onTemplate = getDailyMaskAlignment(
          col, row, getCategoryForDay(state.historicalDayNumber), cols, rows
        ) ? 1 : 0;
      }

      // Legend filter: does this block contain the clicked transaction type?
      let filterHit = 0;
      if (this.filterType >= 0) {
        const wanted = TX_TYPES[this.filterType];
        filterHit = getBlockTransactions(block).some((t) => t.type === wanted) ? 1 : 0;
      }

      this.aParams.setXYZW(i, onTemplate, this.dominantOf[i], block.whale_flag ? 1 : 0, filterHit);

      // "Tracked" uses the website's substring test, not an exact match, so a
      // partial address typed on the virtual keyboard still highlights.
      let tracked = 0;
      if (state.trackedAddress) {
        const addr = state.trackedAddress.toLowerCase();
        tracked = getBlockTransactions(block).some(
          (t) => t.from.includes(addr) || t.to.includes(addr)
        ) ? 1 : 0;
      }

      this.aState.setXYZW(i, 1, age, isHovered ? 1 : 0, tracked);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
    this.aParams.needsUpdate = true;
    this.aState.needsUpdate = true;

    // InstancedMesh caches a bounding sphere the first time it is raycast.
    // Ours is written after construction and rewritten every frame, so that
    // cache would be a 0.0001-radius dot and every ray would miss the wall.
    // Keep an explicit sphere that always contains it.
    const halfH = (rows * vStep) / 2;
    if (!this.mesh.boundingSphere) {
      this.mesh.boundingSphere = new THREE.Sphere();
      this.glow.boundingSphere = new THREE.Sphere();
    }
    this.mesh.boundingSphere.center.set(0, WALL.baseY + halfH, 0);
    this.mesh.boundingSphere.radius = WALL.radius + halfH + 1.0;
    this.glow.boundingSphere.copy(this.mesh.boundingSphere);
  }

  /** MICRO shows the 8x8 sub-pixel field; MACRO shows solid dominant colour. */
  setRenderScale(scale) {
    this.renderScale = scale;
    this.uniforms.uMacro.value = scale === 'MACRO' ? 1 : 0;
    this.glowUniforms.uMacro.value = this.uniforms.uMacro.value;
  }

  /** Legend filter: a TX_TYPES index, or null to clear. */
  setFilter(typeIndex) {
    this.filterType = typeIndex === null || typeIndex === undefined ? -1 : typeIndex;
    this.uniforms.uFilterType.value = this.filterType;
    this.glowUniforms.uFilterType.value = this.filterType;
  }

  setTheme(themeName) {
    const theme = THEMES[themeName] || THEMES.charcoal;
    this.uniforms.uTileBg.value.set(theme.tileBg);
  }

  update(elapsed) {
    this.uniforms.uTime.value = elapsed;
    this.glowUniforms.uTime.value = elapsed;
    this.updateInstances(elapsed);
  }

  setScaleFactor(f) {
    this.mesh.scale.setScalar(f);
    this.glow.scale.setScalar(f);
  }
}
