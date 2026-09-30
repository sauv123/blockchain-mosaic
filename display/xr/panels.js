// ============================================================================
// /trace XR — THE PANELS
//
// One class per surface from the website. Each paints itself with 2D canvas
// commands (so the typography and hierarchy survive intact) and registers hit
// regions the controller laser or a pinched finger can land on.
// ============================================================================

import * as THREE from 'three';
import { Panel, UI, roundRect, wrapText, shortHash, Grabbable, billboardY, hexToRgba } from './ui3d.js';
import { css, palette, applyFont, S, FONT_SANS, FONT_MONO } from './theme.js';

/** Z of the wall behind the viewer — the mosaic occupies the forward arc. */
export const WALL_BEHIND = 1.95;
import {
  state, PALETTES, TX_TYPES, HUMAN_LABELS, getBlockTransactions, getBlockMood,
  getBlockUsd, packBlockPattern, getCategoryLabel, getCategoryForDay, playbackClock
} from './core.js';

const fmtUsd = (v, dp = 0) =>
  '$' + v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const fmtCompactUsd = (v) =>
  v > 1000000 ? '$' + (v / 1000000).toFixed(2) + 'M' : fmtUsd(v);

// ============================================================================
// 1. STATS HUD — the header banner and the cinematic weather line
// ============================================================================
export class StatsHud extends Panel {
  constructor() {
    super({ width: 1.80, height: 0.60, name: 'stats-hud', curved: true, dpm: 1000 });
    this.relayStatus = 'connecting';
    this.tickerCount = 0;
    this.tickerUsd = 0;
  }

  setRelay(status) { this.relayStatus = status; this.dirty = true; }

  /**
   * True only while the ticker is still rolling or something marked the panel
   * dirty. Repainting this surface means redrawing ~800k pixels and uploading
   * a 3 MB texture, so it is not something to do every frame out of habit.
   */
  needsRepaint() {
    const s = state.stats;
    return this.dirty
      || this.tickerCount !== s.sessionDirectCount
      || this.tickerUsd !== s.sessionTotalUsd;
  }

  paint() {
    const ctx = this.begin();
    const s = state.stats;
    const W = this.w, H = this.h;

    this.drawChrome(null, { pad: 6, radius: 26 });

    // ---- brand row -------------------------------------------------------
    const dotColor = this.relayStatus === 'live' ? UI.accent
      : this.relayStatus === 'simulated' ? '#ffaa00' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(52, 54, 9, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.shadowColor = dotColor;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = `300 42px ${UI.sans}`;
    ctx.fillStyle = UI.text;
    ctx.textBaseline = 'middle';
    ctx.fillText('/trace', 76, 56);

    ctx.font = `300 20px ${UI.sans}`;
    ctx.fillStyle = UI.textDim;
    ctx.fillText(
      state.mode === 'LIVE' ? 'A Living Portrait of the Blockchain'
        : `Archive — ${state.selectedHistoricalDate}  ·  ${getCategoryLabel(getCategoryForDay(state.historicalDayNumber))}`,
      210, 58
    );

    ctx.textAlign = 'right';
    ctx.font = `500 18px ${UI.mono}`;
    ctx.fillStyle = this.relayStatus === 'live' ? UI.accent : UI.textFaint;
    ctx.fillText(
      this.relayStatus === 'live' ? 'RELAY LIVE'
        : this.relayStatus === 'simulated' ? 'SIMULATED FEED' : 'CONNECTING…',
      W - 46, 56
    );
    ctx.textAlign = 'left';

    // ---- the cinematic weather line -------------------------------------
    // Eased towards the real totals so the numbers roll rather than jump,
    // which is what the GSAP ticker did on the website.
    this.tickerCount += (s.sessionDirectCount - this.tickerCount) * 0.18;
    this.tickerUsd += (s.sessionTotalUsd - this.tickerUsd) * 0.18;
    // Settle exactly, so the ticker stops asking for repaints.
    if (Math.abs(s.sessionDirectCount - this.tickerCount) < 0.5) this.tickerCount = s.sessionDirectCount;
    if (Math.abs(s.sessionTotalUsd - this.tickerUsd) < 1) this.tickerUsd = s.sessionTotalUsd;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const midX = W / 2;

    ctx.font = `200 46px ${UI.sans}`;
    const countStr = Math.floor(this.tickerCount).toLocaleString();
    const usdStr = fmtCompactUsd(this.tickerUsd);

    // Measure the mixed-weight line so it stays optically centred.
    ctx.font = `200 46px ${UI.sans}`;
    const wA = ctx.measureText('Today, ').width;
    const wC = ctx.measureText(' human payments moved ').width;
    ctx.font = `700 46px ${UI.mono}`;
    const wB = ctx.measureText(countStr).width;
    const wD = ctx.measureText(usdStr).width;

    let x = midX - (wA + wB + wC + wD) / 2;
    ctx.textAlign = 'left';
    const baseY = 152;

    ctx.font = `200 46px ${UI.sans}`;
    ctx.fillStyle = UI.text;
    ctx.fillText('Today, ', x, baseY); x += wA;

    ctx.font = `700 46px ${UI.mono}`;
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 26;
    ctx.fillText(countStr, x, baseY); x += wB;
    ctx.shadowBlur = 0;

    ctx.font = `200 46px ${UI.sans}`;
    ctx.fillText(' human payments moved ', x, baseY); x += wC;

    ctx.font = `700 46px ${UI.mono}`;
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 26;
    ctx.fillText(usdStr, x, baseY);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.font = `italic 300 26px ${UI.sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`The network weather is ${s.weatherCondition}.`, midX, baseY + 44);
    ctx.textAlign = 'left';

    // ---- stat strip ------------------------------------------------------
    const stats = [
      [state.mode === 'LIVE' ? 'LATEST BLOCK' : 'ARCHIVE DATE', s.latestBlock, UI.text],
      ['AVG FEE', s.avgFee, UI.text],
      [state.mode === 'LIVE' ? 'GRID FILL' : 'BLOCKS', s.gridFill, UI.text],
      ['DOMINANT TREND', s.dominantTrend, UI.text],
      ['GAS TRAJECTORY', s.gasTrajectory, s.gasTrajectoryColor]
    ];

    const stripY = 268;
    const colW = (W - 120) / (stats.length + 1);
    stats.forEach(([label, value, color], i) => {
      const cx = 60 + colW * i;
      ctx.font = `500 15px ${UI.mono}`;
      ctx.fillStyle = UI.textFaint;
      ctx.letterSpacing = '1.6px';
      ctx.fillText(label, cx, stripY);
      ctx.letterSpacing = '0px';
      ctx.font = `600 26px ${UI.sans}`;
      ctx.fillStyle = color;
      ctx.fillText(value, cx, stripY + 36);
    });

    // ---- tx activity split bar ------------------------------------------
    const barX = 60 + colW * stats.length;
    const barW = colW - 30;
    ctx.font = `500 15px ${UI.mono}`;
    ctx.fillStyle = UI.textFaint;
    ctx.letterSpacing = '1.6px';
    ctx.fillText('TX ACTIVITY SPLIT', barX, stripY);
    ctx.letterSpacing = '0px';

    const pal = PALETTES[state.palette] || PALETTES.spectrum;
    const segs = [
      [s.ratio.transfers, pal['Plain Transfer']],
      [s.ratio.swaps, pal['Token Swap']],
      [s.ratio.mints, pal['NFT Mint']]
    ];
    let bx = barX;
    const barY = stripY + 18;
    segs.forEach(([pct, color]) => {
      const segW = (pct / 100) * barW;
      ctx.fillStyle = color;
      ctx.fillRect(bx, barY, Math.max(1, segW), 14);
      bx += segW;
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, 14);

    ctx.font = `500 15px ${UI.mono}`;
    ctx.fillStyle = UI.textFaint;
    ctx.fillText(
      `${Math.round(s.ratio.transfers)}/${Math.round(s.ratio.swaps)}/${Math.round(s.ratio.mints)}`,
      barX, barY + 34
    );

    // ---- control row -----------------------------------------------------
    // Sized for a laser pointer, not a mouse: 84 px on this 1000 dpm surface
    // is 8.4 cm, roughly 2.8 degrees at 1.7 m, which is the smallest target
    // that stays comfortable to hit with head and hand jitter.
    const btnY = H - 118;
    const btnH = 84;
    const gap = 14;
    let cx = 46;
    const mk = (id, label, w, opts) => {
      this.button(id, label, cx, btnY, w, btnH, { size: 26, ...opts });
      cx += w + gap;
    };

    mk('menu', '\u2630  Settings & Archives', 390, { onClick: this.onMenu });
    mk('guide', '?  Guide', 200, { onClick: this.onGuide });
    mk('audio', state.muted ? '\u{1F507}  Muted' : '\u{1F50A}  Sound', 220, { onClick: this.onAudio });
    mk('track', state.trackedAddress ? `\u25CE ${shortHash(state.trackedAddress, 6, 4)}` : '\u25CE  Track Wallet',
      330, { onClick: this.onTrack, active: !!state.trackedAddress });
    mk('focus', '\u26F6  Focus', 200, { onClick: this.onFocus, active: state.focusMode });
    mk('scale', state.renderScale === 'MACRO' ? 'Macro' : 'Micro', 170,
      { onClick: this.onScale, active: state.renderScale === 'MACRO' });

    // Input diagnostics, so a dead pointer is readable from inside the headset.
    if (this.diagText) {
      applyFont(ctx, { size: 20, weight: 500, mono: true });
      ctx.fillStyle = css().textSecondary;
      ctx.textAlign = 'center';
      ctx.fillText(this.diagText, W / 2, H - 26);
      ctx.textAlign = 'left';
    }
    if (state.mode === 'HISTORICAL') {
      mk('live', '\u25CF Live Grid', 220, { onClick: this.onLive });
    }

    this.end();
  }
}

// ============================================================================
// 2. HOVER LABEL — the tooltip, snapped beside the controller
// ============================================================================
export class HoverLabel extends Panel {
  constructor() {
    super({ width: 0.44, height: 0.27, name: 'hover-label', dpm: 1100 });
    this.mesh.renderOrder = 999;   // the tooltip always reads on top
    this.block = null;
    this.setVisible(false);
  }

  show(block) {
    if (this.block === block && this.visible) return;
    this.block = block;
    this.setVisible(true);
    this.paint();
  }

  hide() {
    this.block = null;
    this.setVisible(false);
  }

  paint() {
    if (!this.block) return;
    const b = this.block;
    const ctx = this.begin();
    this.drawChrome(null, { pad: 4, radius: 18, bg: 'rgba(3,5,8,0.96)', border: 'rgba(0,255,136,0.45)' });

    const usd = getBlockUsd(b);
    const pad = 34;
    let y = 40;

    ctx.textBaseline = 'top';
    ctx.font = `700 22px ${UI.mono}`;
    ctx.fillStyle = UI.accent;
    ctx.fillText(`BLOCK #${b.block_number}`, pad, y);

    ctx.textAlign = 'right';
    ctx.font = `600 20px ${UI.sans}`;
    ctx.fillStyle = UI.textDim;
    ctx.fillText(getBlockMood(b), this.w - pad, y);
    ctx.textAlign = 'left';
    y += 42;

    ctx.font = `300 23px ${UI.sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    y = wrapText(
      ctx,
      `Mostly ${b.contract_ratio > 0.6 ? 'Trading Coins' : 'Direct Payments'}. Traffic was ${b.base_fee_gwei > 50 ? 'congested and expensive' : 'quiet and cheap'}, around ${b.base_fee_gwei.toFixed(0)} Gwei.`,
      pad, y, this.w - pad * 2, 32
    );

    y += 14;
    ctx.font = `600 24px ${UI.mono}`;
    ctx.fillStyle = UI.accent;
    ctx.fillText(`${b.tx_count} actions`, pad, y);
    ctx.fillStyle = UI.textDim;
    const wActions = ctx.measureText(`${b.tx_count} actions`).width;
    ctx.fillText(`  ·  ${fmtUsd(usd)} moved`, pad + wActions, y);

    y += 44;
    ctx.font = `400 18px ${UI.sans}`;
    ctx.fillStyle = UI.textFaint;
    ctx.fillText('Trigger to open receipts', pad, y);

    this.end();
  }
}

// ============================================================================
// 3. BLOCK SLAB — the details sidebar, detached into your hand
// ============================================================================
export class BlockSlab extends Panel {
  constructor(scene) {
    // 0.52 x 0.78 m subtends a comfortable 26 x 38 degrees at reading
    // distance; the high dpm keeps the type crisp at that physical size.
    super({ width: 0.52, height: 0.78, name: 'block-slab', dpm: 1500 });
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    scene.add(this.group);

    this.grabbable = new Grabbable(this.group);
    this.block = null;
    this.tab = 'overview';           // 'overview' | 'analyst' | 'tx'
    this.inspectTx = null;
    this.pinned = false;
    this.setVisible(false);
    this.group.visible = false;

    this._buildFlowGraph(scene);
  }

  // The Flow Graph tab is a real constellation floating off the slab's face,
  // not a flat canvas drawing — you can walk around it.
  _buildFlowGraph(scene) {
    this.flow = new THREE.Group();
    this.flow.visible = false;
    this.group.add(this.flow);
    // Aligned with the dark window _paintAnalyst leaves for it: the window's
    // centre sits at canvas y 356 of 1170, which is +0.153 m up the surface.
    this.flow.position.set(0, 0.153, 0.16);
    this.flow.scale.setScalar(0.5);

    this.flowNodes = [];
    const nodeGeo = new THREE.SphereGeometry(0.016, 12, 10);
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x3b6fd4, transparent: true, opacity: 0.9 });
      const m = new THREE.Mesh(nodeGeo, mat);
      m.visible = false;
      this.flow.add(m);
      this.flowNodes.push(m);
    }

    this.flowLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
      })
    );
    this.flow.add(this.flowLines);
  }

  open(block) {
    this.block = block;
    this.tab = 'overview';
    this.inspectTx = null;
    this.setVisible(true);
    this.group.visible = true;
    this.paint();
  }

  close() {
    this.block = null;
    this.pinned = false;
    this.setVisible(false);
    this.group.visible = false;
    this.flow.visible = false;
  }

  /** Place the slab at a comfortable reading distance in front of the viewer. */
  presentTo(camera, offset = new THREE.Vector3(0.30, -0.04, 0)) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    this.group.position.copy(camera.position)
      .addScaledVector(dir, 1.15)
      .addScaledVector(right, offset.x);
    this.group.position.y = camera.position.y + offset.y;
    billboardY(this.group, camera.position);
  }

  _updateFlowGraph() {
    if (!this.block) return;
    const txs = getBlockTransactions(this.block);
    const pal = PALETTES[state.palette] || PALETTES.spectrum;

    const positions = [];
    const colors = [];
    const hub = new THREE.Vector3(0, 0, 0);

    this.flowNodes.forEach((n) => { n.visible = false; });

    // Centre hub = the block itself; spokes = its largest routes.
    this.flowNodes[0].visible = true;
    this.flowNodes[0].position.copy(hub);
    this.flowNodes[0].scale.setScalar(1.8);
    this.flowNodes[0].material.color.set(0xffffff);

    const count = Math.min(txs.length, 6);
    for (let i = 0; i < count; i++) {
      const tx = txs[i];
      const ang = (i / count) * Math.PI * 2;
      const radius = 0.10 + Math.min(0.10, (tx.valueUsd / 20000) * 0.10);

      const from = this.flowNodes[1 + i * 2];
      const to = this.flowNodes[2 + i * 2];
      if (!from || !to) break;

      from.visible = true;
      to.visible = true;
      from.position.set(Math.cos(ang) * radius, Math.sin(ang) * radius, -0.04);
      to.position.set(Math.cos(ang) * radius * 1.7, Math.sin(ang) * radius * 1.7, 0.04);

      const c = new THREE.Color(pal[tx.type] || pal.default);
      from.material.color.copy(c);
      to.material.color.copy(c);
      const weight = Math.min(2.4, 0.8 + tx.valueUsd / 8000);
      from.scale.setScalar(weight);
      to.scale.setScalar(weight * 0.7);

      positions.push(from.position.x, from.position.y, from.position.z, hub.x, hub.y, hub.z);
      positions.push(hub.x, hub.y, hub.z, to.position.x, to.position.y, to.position.z);
      for (let k = 0; k < 4; k++) colors.push(c.r, c.g, c.b);
    }

    const geo = this.flowLines.geometry;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeBoundingSphere();
  }

  update(dt) {
    this.grabbable.update();
    if (this.flow.visible) this.flow.rotation.y += dt * 0.35;
  }

  paint() {
    if (!this.block) return;
    const b = this.block;
    const ctx = this.begin();
    const W = this.w, H = this.h;
    const pad = 40;

    this.drawChrome(null, { pad: 6, radius: 26 });

    // ---- header ----------------------------------------------------------
    ctx.textBaseline = 'top';
    ctx.font = `700 26px ${UI.mono}`;
    ctx.fillStyle = UI.accent;
    ctx.letterSpacing = '2px';
    ctx.fillText(`BLOCK #${b.block_number}`, pad, 42);
    ctx.letterSpacing = '0px';

    const mood = getBlockMood(b);
    ctx.font = `600 20px ${UI.sans}`;
    const moodW = ctx.measureText(mood).width + 28;
    roundRect(ctx, W - pad - moodW - 78, 38, moodW, 34, 17);
    ctx.fillStyle = 'rgba(0,255,136,0.14)';
    ctx.fill();
    ctx.fillStyle = UI.accent;
    ctx.textAlign = 'center';
    ctx.fillText(mood, W - pad - moodW / 2 - 78, 45);
    ctx.textAlign = 'left';

    this.button('pin', this.pinned ? '📌' : '📍', W - pad - 64, 36, 64, 40,
      { onClick: this.onPin, size: 20, active: this.pinned });
    this.button('close', '✕', W - pad - 64, 88, 64, 40, { onClick: this.onClose, size: 20 });

    // ---- the transaction inspector takes over the whole slab -------------
    if (this.tab === 'tx' && this.inspectTx) {
      this._paintTxInspector(ctx, pad);
      this.end();
      return;
    }

    // ---- tabs ------------------------------------------------------------
    const tabY = 100;
    this.button('tab-overview', 'Overview', pad, tabY, 190, 52,
      { onClick: () => this.setTab('overview'), active: this.tab === 'overview', size: 20 });
    this.button('tab-analyst', 'Flow Graph', pad + 202, tabY, 190, 52,
      { onClick: () => this.setTab('analyst'), active: this.tab === 'analyst', size: 20 });

    if (this.tab === 'analyst') {
      this._paintAnalyst(ctx, pad, tabY + 76);
    } else {
      this._paintOverview(ctx, pad, tabY + 76);
    }

    // ---- hash footer -----------------------------------------------------
    const footY = H - 132;
    ctx.font = `500 15px ${UI.mono}`;
    ctx.fillStyle = UI.textFaint;
    ctx.letterSpacing = '1.5px';
    ctx.fillText('BLOCK HASH', pad, footY);
    ctx.letterSpacing = '0px';
    ctx.font = `400 19px ${UI.mono}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(shortHash(b.hash, 20, 12), pad, footY + 26);

    this.button('copy', this._copied ? 'Copied ✓' : 'Copy', W - pad - 150, footY + 4, 150, 44,
      { onClick: this.onCopy, size: 18 });
    this.button('explorer', 'Verify Receipts  ↗', pad, H - 76, W - pad * 2, 50,
      { onClick: this.onExplorer, size: 20 });

    this.end();
  }

  setTab(t) {
    this.tab = t;
    this.flow.visible = t === 'analyst';
    if (t === 'analyst') this._updateFlowGraph();
    this.paint();
  }

  _paintOverview(ctx, pad, y) {
    const b = this.block;
    const W = this.w;
    const txs = getBlockTransactions(b);
    const usd = getBlockUsd(b);

    // Headline figure
    ctx.font = `500 16px ${UI.mono}`;
    ctx.fillStyle = UI.textFaint;
    ctx.letterSpacing = '1.6px';
    ctx.fillText('AMOUNT MOVED (USD)', pad, y);
    ctx.letterSpacing = '0px';
    ctx.font = `300 52px ${UI.sans}`;
    ctx.fillStyle = UI.text;
    ctx.fillText(fmtUsd(usd, 2), pad, y + 26);
    y += 104;

    // ---- interactive sub-pixel map — the real 8x8, pokeable --------------
    ctx.font = `500 16px ${UI.mono}`;
    ctx.fillStyle = UI.textFaint;
    ctx.letterSpacing = '1.6px';
    ctx.fillText('TRANSACTIONS MAP — POINT TO INSPECT', pad, y);
    ctx.letterSpacing = '0px';
    y += 26;

    // Fixed size, centred: the map must never grow with the slab width or it
    // pushes the details and the hash footer off the bottom edge.
    const gridSize = 280;
    const gridX = (W - gridSize) / 2;
    const cellSize = gridSize / 8;
    const { mask, ranks } = packBlockPattern(b);
    const pal = PALETTES[state.palette] || PALETTES.spectrum;

    for (let cell = 0; cell < 64; cell++) {
      const cx = gridX + (cell % 8) * cellSize;
      const cy = y + Math.floor(cell / 8) * cellSize;
      const w = Math.floor(cell / 16);
      const bit = cell % 16;
      const lit = (mask[w] >> bit) & 1;

      const id = `sub-${cell}`;
      const hovered = this.hoveredId === id;

      roundRect(ctx, cx + 2, cy + 2, cellSize - 4, cellSize - 4, 4);
      if (lit) {
        const rank = (ranks[Math.floor(cell / 8)] >> ((cell % 8) * 3)) & 7;
        const tx = txs[rank % txs.length];
        ctx.fillStyle = pal[tx.type] || pal.default;
        ctx.fill();
        if (hovered) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }
        this.region(id, cx, cy, cellSize, cellSize, {
          onClick: () => { this.inspectTx = tx; this.tab = 'tx'; this.paint(); }
        });
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.fill();
      }
    }
    y += gridSize + 24;

    // ---- details grid ----------------------------------------------------
    const primary = txs[0] || {};
    const colW = (W - pad * 2 - 20) / 2;
    const rows = [
      ['Status', 'Confirmed', UI.good],
      ['Time Confirmed', `${Math.max(0, Math.floor((Date.now() - b.timestamp * 1000) / 1000))}s ago`],
      ['Total Fee Paid', `${b.base_fee_gwei.toFixed(2)} Gwei`],
      ['Direction', state.trackedAddress ? this._trackDirection(txs) : 'No tracked wallet'],
      ['Tx Count', String(b.tx_count)],
      ['Showcase Tx Type', HUMAN_LABELS[primary.type] || primary.type || '—'],
      ['Showcase Asset', primary.asset || 'ETH'],
      ['Gas Price', `${(primary.gasPriceGwei || 0).toFixed(2)} Gwei`]
    ];

    const rowH = 60;
    rows.forEach(([label, value, color], i) => {
      const cx = pad + (i % 2) * (colW + 20);
      const cy = y + Math.floor(i / 2) * rowH;
      this.cell(label, value, cx, cy, colW, { color: color || UI.text, size: 21, labelSize: 14 });
    });
    y += Math.ceil(rows.length / 2) * rowH;

    this.cell('Showcase Tx From (Largest)', primary.from || '0x…', pad, y, W - pad * 2, { mono: true, size: 18, labelSize: 14 });
    this.cell('Showcase Tx To (Largest)', primary.to || '0x…', pad, y + 56, W - pad * 2, { mono: true, size: 18, labelSize: 14 });
  }

  _trackDirection(txs) {
    const addr = state.trackedAddress.toLowerCase();
    const sent = txs.some((t) => t.from === addr);
    const recv = txs.some((t) => t.to === addr);
    if (sent && recv) return 'Sent & Received';
    if (sent) return 'Sent ↗';
    if (recv) return 'Received ↙';
    return 'Not in this block';
  }

  _paintAnalyst(ctx, pad, y) {
    const b = this.block;
    const W = this.w;
    const txs = getBlockTransactions(b);

    ctx.font = `500 15px ${UI.mono}`;
    ctx.fillStyle = UI.textFaint;
    ctx.letterSpacing = '1.5px';
    ctx.fillText('TRANSACTION FLOWS — THE GRAPH IS FLOATING IN FRONT OF THIS PANEL', pad, y);
    ctx.letterSpacing = '0px';
    y += 30;

    // Leave a window so the 3D constellation reads against emptiness.
    roundRect(ctx, pad, y, W - pad * 2, 300, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,255,136,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    y += 330;

    const seed = parseInt((b.hash || '0x0').slice(2, 6), 16);
    const colW = (W - pad * 2 - 24) / 2;
    const rows = [
      ['Wallet Cluster', `Cluster #${(seed % 900 + 100).toString(36).toUpperCase()}`],
      ['Address Label', txs[0] ? txs[0].label : 'Smart Contract'],
      ['Anomaly Flag', txs.find((t) => t.anomaly !== 'None')?.anomaly || 'None'],
      ['First Seen', `${seed % 300} days ago`]
    ];
    rows.forEach(([label, value], i) => {
      const cx = pad + (i % 2) * (colW + 24);
      const cy = y + Math.floor(i / 2) * 76;
      this.cell(label, value, cx, cy, colW, { size: 22 });
    });
  }

  _paintTxInspector(ctx, pad) {
    const tx = this.inspectTx;
    const W = this.w;
    let y = 130;

    ctx.font = `700 24px ${UI.mono}`;
    ctx.fillStyle = UI.accent;
    ctx.letterSpacing = '2px';
    ctx.fillText('TRANSACTION INSPECTOR', pad, y);
    ctx.letterSpacing = '0px';
    y += 56;

    ctx.font = `500 15px ${UI.mono}`;
    ctx.fillStyle = UI.textFaint;
    ctx.fillText('VALUE (USD)', pad, y);
    ctx.font = `300 60px ${UI.sans}`;
    ctx.fillStyle = UI.text;
    ctx.fillText(fmtUsd(tx.valueUsd, 2), pad, y + 26);
    y += 116;

    const colW = (W - pad * 2 - 24) / 2;
    const rows = [
      ['Asset Amount', `${tx.valueEth.toFixed(4)} ${state.chain === 'solana' ? 'SOL' : tx.asset}`],
      ['Action Type', HUMAN_LABELS[tx.type] || tx.type],
      ['Gas Fee Rate', state.chain === 'solana' ? `${tx.gasPriceGwei / 1e6} SOL` : `${tx.gasPriceGwei} Gwei`],
      ['Target Protocol', tx.label],
      ['Confirmations', String(tx.confirmations)],
      ['Anomaly', tx.anomaly]
    ];
    rows.forEach(([label, value], i) => {
      const cx = pad + (i % 2) * (colW + 24);
      const cy = y + Math.floor(i / 2) * 82;
      this.cell(label, value, cx, cy, colW, {
        size: 24,
        color: label === 'Anomaly' && value !== 'None' ? UI.danger : UI.text
      });
    });
    y += Math.ceil(rows.length / 2) * 82 + 10;

    this.cell('Sender Address', tx.from, pad, y, W - pad * 2, { mono: true, size: 19 });
    this.cell('Receiver Address', tx.to, pad, y + 70, W - pad * 2, { mono: true, size: 19 });

    this.button('back', '←  Back to Block', pad, this.h - 92, W - pad * 2, 54,
      { onClick: () => { this.tab = 'overview'; this.inspectTx = null; this.paint(); } });
  }
}

// ============================================================================
// 4. WRIST PANEL — Settings & Archives, strapped to the left forearm
// ============================================================================
/**
 * The Settings & Archives drawer, mounted on the wall BEHIND the viewer.
 * The mosaic occupies the forward arc; turn around and the whole drawer is
 * there at full size, so it is read and operated like the website's drawer
 * rather than squinted at on a wrist.
 */
export class SettingsDrawer extends Panel {
  constructor(scene) {
    // Big enough to hold the entire drawer at once: no scrolling, no paging.
    super({ width: 1.30, height: 1.60, name: 'settings-drawer', dpm: 900, curved: true });
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    scene.add(this.group);

    // Directly opposite the tapestry, at a comfortable standing read.
    this.group.position.set(0, 1.42, WALL_BEHIND);
    this.group.rotation.y = Math.PI;

    this.grabbable = new Grabbable(this.group);
    this.setVisible(true);
    this.monthOffset = 0;
  }

  /** Always present; this just pulls the viewer's attention to it. */
  toggle() {
    this.setVisible(!this.visible);
    if (this.visible) this.paint();
    return this.visible;
  }

  paint() {
    const ctx = this.begin();
    const c = css();
    const W = this.w;
    const pad = 46;

    // .archive-drawer — glass slab, 1px rim, heavy shadow
    this.drawChrome(null, { pad: 6, radius: 20, bg: c.drawerBg, border: c.borderColor });

    ctx.textBaseline = 'top';

    // ---- .drawer-header -------------------------------------------------
    applyFont(ctx, S.drawerTitle);
    ctx.fillStyle = c.textPrimary;
    ctx.fillText('Settings & Archives', pad, 44);
    ctx.letterSpacing = '0px';

    let top = 44 + S.drawerTitle.size + 26;
    ctx.strokeStyle = c.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, top);
    ctx.lineTo(W - pad, top);
    ctx.stroke();
    top += 30;

    // Two columns: the whole drawer has to be visible at once, because in a
    // headset there is nothing to scroll with.
    const gutter = 40;
    const leftW = Math.round((W - pad * 2 - gutter) * 0.56);
    const rightW = W - pad * 2 - gutter - leftW;
    const rightX = pad + leftW + gutter;

    // =================== LEFT: Tapestry Settings =========================
    let y = this._sectionTitle(ctx, 'Tapestry Settings', pad, top);

    y = this._setting(ctx, 'Data Stream', [
      { value: 'ethereum', label: 'Global Main Network' },
      { value: 'base', label: 'High-Speed (Base)' },
      { value: 'arbitrum', label: 'High-Speed (Arbitrum)' },
      { value: 'solana', label: 'Ultra-Fast (Solana)' }
    ], state.chain, (v) => this.onChain(v), pad, y, leftW);

    y = this._setting(ctx, 'Color Palette', [
      { value: 'electricBlue', label: 'Classic Electric Blue' },
      { value: 'meadow', label: 'Forest Meadow' },
      { value: 'sunset', label: 'Cyberpunk Sunset' },
      { value: 'spectrum', label: 'Multicolor Spectrum' }
    ], state.palette, (v) => this.onPalette(v), pad, y, leftW);

    y = this._setting(ctx, 'Sound Instrument Profile', [
      { value: 'chimes', label: 'Warm Chimes' },
      { value: 'guitar', label: 'Acoustic Guitar' },
      { value: 'drums', label: 'Electronic Drums' },
      { value: 'pad', label: 'Synth Pad' }
    ], state.soundProfile, (v) => this.onSound(v), pad, y, leftW);

    y = this._setting(ctx, 'Background Ambient Loop', [
      { value: 'hum', label: 'Low-Frequency Hum' },
      { value: 'crackle', label: 'Vinyl Crackle & Pop' },
      { value: 'none', label: 'None' }
    ], state.ambientProfile, (v) => this.onAmbient(v), pad, y, leftW);

    y = this._setting(ctx, 'Theme', [
      { value: 'charcoal', label: 'Charcoal (Dark)' },
      { value: 'warmGray', label: 'Warm Gray (Light)' }
    ], state.theme, (v) => this.onTheme(v), pad, y, leftW);

    y = this._setting(ctx, 'Detail Scale', [
      { value: 'MICRO', label: 'Micro — Sub-pixels' },
      { value: 'MACRO', label: 'Macro — Solid' }
    ], state.renderScale, (v) => this.onScale(v), pad, y, leftW);

    // ---- action row ------------------------------------------------------
    const bw = (leftW - 20) / 3;
    this._btn(ctx, 'focus-mode', state.focusMode ? 'Exit Focus' : 'Focus Mode', pad, y, bw,
      () => this.onFocus(), state.focusMode);
    this._btn(ctx, 'export-svg', 'Export SVG', pad + bw + 10, y, bw, () => this.onExport());
    this._btn(ctx, 'mute', state.muted ? 'Unmute' : 'Mute', pad + (bw + 10) * 2, y, bw,
      () => this.onMute(), state.muted);

    // =================== RIGHT: Archive + legend =========================
    let ry = this._calendar(ctx, rightX, top, rightW);

    ry = this._sectionTitle(ctx, 'Daily Mood Indicators', rightX, ry + 14);
    const pal = palette();
    const legend = [
      [c.successColor, 'Calm Sunday', null],
      [c.trackedColor, 'Active Trading', null],
      ['#ff6b6b', 'Gas Spike', null],
      [pal['Plain Transfer'], 'Direct Payments', 'Plain Transfer'],
      [pal['Token Swap'], 'Currency Exchange', 'Token Swap'],
      [pal['NFT Mint'], 'Digital Art', 'NFT Mint'],
      [pal['Contract Call'], 'Automated Code', 'Contract Call']
    ];
    legend.forEach(([color, label, type], i) => {
      const ly = ry + i * 34;
      const active = type && state.legendFilter === type;
      if (active) {
        roundRect(ctx, rightX - 6, ly - 5, rightW + 12, 30, 6);
        ctx.fillStyle = hexToRgba(color, 0.16);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(rightX + 8, ly + 11, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      applyFont(ctx, { size: S.detailValue.size, weight: 500 });
      ctx.fillStyle = active ? color : c.textSecondary;
      ctx.fillText(label, rightX + 26, ly);
      if (type) {
        this.region(`legend-${i}`, rightX - 6, ly - 5, rightW + 12, 30, {
          onClick: () => this.onLegend(state.legendFilter === type ? null : type)
        });
      }
    });

    this.end();
  }

  _sectionTitle(ctx, text, x, y) {
    const c = css();
    applyFont(ctx, S.sectionTitle);
    ctx.fillStyle = c.textSecondary;
    ctx.fillText(text.toUpperCase(), x, y);
    ctx.letterSpacing = '0px';
    return y + S.sectionTitle.size + 18;
  }

  /**
   * One .setting-item: a label plus its options as .chain-select chips, laid
   * out two per row so the whole drawer fits on one surface.
   */
  _setting(ctx, label, options, current, onPick, x, y, w) {
    const c = css();
    applyFont(ctx, S.settingLabel);
    ctx.fillStyle = c.textSecondary;
    ctx.fillText(label, x, y);
    let cy = y + S.settingLabel.size + 10;

    const perRow = 2;
    const gap = 10;
    const bw = (w - gap * (perRow - 1)) / perRow;
    const h = S.select.size + S.select.padV * 2 + 12;

    options.forEach((opt, i) => {
      const bx = x + (i % perRow) * (bw + gap);
      const by = cy + Math.floor(i / perRow) * (h + gap);
      const id = `${label}-${opt.value}`;
      const active = opt.value === current;
      const hovered = this.hoveredId === id;

      roundRect(ctx, bx, by, bw, h, S.select.radius);
      ctx.fillStyle = active ? hexToRgba(c.accentColor, 0.16)
        : hovered ? hexToRgba(c.textPrimary, 0.08) : c.cellBg;
      ctx.fill();
      ctx.lineWidth = active || hovered ? 2 : 1;
      ctx.strokeStyle = active ? c.accentColor : hovered ? c.textPrimary : c.borderColor;
      ctx.stroke();

      applyFont(ctx, { size: S.select.size, weight: S.select.weight });
      ctx.fillStyle = active ? c.accentColor : c.textPrimary;
      // Truncate rather than spill past the chip.
      let text = opt.label;
      const room = bw - S.select.padH * 2;
      if (ctx.measureText(text).width > room) {
        while (text.length > 3 && ctx.measureText(text + '…').width > room) text = text.slice(0, -1);
        text += '…';
      }
      ctx.fillText(text, bx + S.select.padH, by + S.select.padV + 5);

      this.region(id, bx, by, bw, h, { onClick: () => onPick(opt.value) });
    });

    return cy + Math.ceil(options.length / perRow) * (h + gap) + 14;
  }

  _btn(ctx, id, label, x, y, w, onClick, active) {
    const c = css();
    const h = 58;
    const hovered = this.hoveredId === id;
    roundRect(ctx, x, y, w, h, S.button.radius);
    // .playback-btn is a solid --text-primary pill with --bg-color text.
    ctx.fillStyle = active ? c.accentColor : hovered ? c.textPrimary : hexToRgba(c.textPrimary, 0.85);
    ctx.fill();
    applyFont(ctx, { size: S.button.size, weight: S.button.weight });
    ctx.fillStyle = active ? '#ffffff' : c.bgColor;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 - S.button.size / 2);
    ctx.textAlign = 'left';
    this.region(id, x, y, w, h, { onClick });
  }

  _calendar(ctx, x, y, w) {
    const c = css();
    const now = new Date();
    const view = new Date(now.getFullYear(), now.getMonth() + this.monthOffset, 1);

    y = this._sectionTitle(ctx, 'Daily Portraits', x, y);

    // Month header with prev / next, so the archive is not stuck on today.
    applyFont(ctx, { size: S.detailValue.size, weight: 700 });
    ctx.fillStyle = c.textPrimary;
    ctx.fillText(view.toLocaleString(undefined, { month: 'long', year: 'numeric' }), x, y + 8);

    this._navBtn(ctx, 'cal-prev', '\u2039', x + w - 96, y, () => { this.monthOffset--; this.paint(); });
    this._navBtn(ctx, 'cal-next', '\u203A', x + w - 44, y, () => { this.monthOffset++; this.paint(); });
    y += 48;

    const gap = S.calendarGap;
    const cell = (w - gap * 6) / 7;

    applyFont(ctx, S.statLabel);
    ctx.fillStyle = c.textSecondary;
    ctx.textAlign = 'center';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d, i) => {
      ctx.fillText(d, x + i * (cell + gap) + cell / 2, y);
    });
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
    y += S.statLabel.size + 14;

    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isThisMonth = this.monthOffset === 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const slot = firstDay + d - 1;
      const cx = x + (slot % 7) * (cell + gap);
      const cy = y + Math.floor(slot / 7) * (cell + gap);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = view > now || (isThisMonth && d > now.getDate());
      const selected = state.selectedHistoricalDate === dateStr;
      const id = `day-${month}-${d}`;
      const hovered = this.hoveredId === id;

      // .calendar-day — 1px --border-color, 6px radius, faint fill
      roundRect(ctx, cx, cy, cell, cell, S.calendarDay.radius);
      ctx.fillStyle = selected ? hexToRgba(c.accentColor, 0.2) : c.cellBg;
      ctx.fill();
      ctx.lineWidth = selected || hovered ? 2 : 1;
      // :hover { border-color: var(--text-primary) }
      ctx.strokeStyle = selected ? c.accentColor : hovered ? c.textPrimary : c.borderColor;
      ctx.stroke();

      applyFont(ctx, S.calendarDay);
      ctx.fillStyle = isFuture ? hexToRgba(c.textSecondary, 0.45)
        : selected ? c.accentColor : c.textPrimary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(d), cx + cell / 2, cy + cell / 2 - 4);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      if (!isFuture) {
        ctx.beginPath();
        ctx.arc(cx + cell / 2, cy + cell - 13, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = d % 7 === 0 ? c.successColor : d % 5 === 0 ? '#ff6b6b' : c.trackedColor;
        ctx.fill();
        this.region(id, cx, cy, cell, cell, {
          onClick: () => this.onPickDate(dateStr, ((d - 1) % 6) + 1)
        });
      }
    }

    y += Math.ceil((firstDay + daysInMonth) / 7) * (cell + gap) + 16;

    const bw = (w - 12) / 2;
    this._btn(ctx, 'live-grid', '\u25CF  Return to Live Grid', x, y, bw, () => this.onLive());
    this._btn(ctx, 'portrait', state.portraitMode ? 'Exit Portrait' : 'View Day Portrait',
      x + bw + 12, y, bw, () => this.onPortrait(), state.portraitMode);
    return y + 76;
  }

  _navBtn(ctx, id, glyph, x, y, onClick) {
    const c = css();
    const hovered = this.hoveredId === id;
    roundRect(ctx, x, y, 40, 40, 6);
    ctx.fillStyle = hovered ? hexToRgba(c.textPrimary, 0.12) : c.cellBg;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = hovered ? c.textPrimary : c.borderColor;
    ctx.stroke();
    applyFont(ctx, { size: 26, weight: 600 });
    ctx.fillStyle = c.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x + 20, y + 19);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    this.region(id, x, y, 40, 40, { onClick });
  }
}

// ============================================================================
// 5. GUIDE CARD — How it Works, pinnable anywhere in the room
// ============================================================================
export class GuideCard extends Panel {
  constructor(scene) {
    // Sized to the content: at 0.62 m tall the CONTROLS block fell off
    // the bottom edge with no indication it was there.
    super({ width: 0.50, height: 0.84, name: 'guide', dpm: 1200 });
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    scene.add(this.group);
    this.grabbable = new Grabbable(this.group);
    this.group.visible = false;
    this.setVisible(false);
  }

  toggle(camera) {
    const next = !this.group.visible;
    this.group.visible = next;
    this.setVisible(next);
    if (next) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0; dir.normalize();
      this.group.position.copy(camera.position).addScaledVector(dir, 0.8);
      this.group.position.y = camera.position.y - 0.05;
      billboardY(this.group, camera.position);
      this.paint();
    }
  }

  paint() {
    const ctx = this.begin();
    const W = this.w;
    const pad = 44;
    this.drawChrome(null, { pad: 6, radius: 26 });

    ctx.textBaseline = 'top';
    ctx.font = `500 18px ${UI.mono}`;
    ctx.fillStyle = UI.accent;
    ctx.letterSpacing = '2.5px';
    ctx.fillText('HOW TO READ THE PORTRAIT', pad, 44);
    ctx.letterSpacing = '0px';

    ctx.font = `300 38px ${UI.sans}`;
    ctx.fillStyle = UI.text;
    ctx.fillText('Understanding the Data', pad, 76);

    this.button('guide-close', '✕', W - pad - 56, 40, 56, 44, { onClick: this.onClose, size: 20 });

    let y = 140;
    ctx.font = `300 22px ${UI.sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    y = wrapText(ctx,
      'This portrait is a living map of the global economy. Every tiny square is a real action happening somewhere in the world, right now.',
      pad, y, W - pad * 2, 32);
    y += 24;

    const pal = PALETTES[state.palette] || PALETTES.spectrum;
    const terms = [
      [pal['Plain Transfer'], 'Direct Payments', 'People sending money to friends, family or businesses.'],
      [pal['Token Swap'], 'Currency Exchange', 'People trading one digital currency for another.'],
      [pal['NFT Mint'], 'Digital Art / Collectibles', 'Artists creating or selling digital artwork.'],
      [pal['Contract Call'], 'Automated Code', 'Smart contracts executing logic on their own.'],
      ['#ffffff', 'Massive Transactions', 'A transfer so large it sends shockwaves through the room.']
    ];

    terms.forEach(([color, label, def]) => {
      ctx.beginPath();
      ctx.arc(pad + 8, y + 11, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = `600 23px ${UI.sans}`;
      ctx.fillStyle = color;
      ctx.fillText(label, pad + 28, y);
      y += 30;

      ctx.font = `300 20px ${UI.sans}`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      y = wrapText(ctx, def, pad + 28, y, W - pad * 2 - 28, 27);
      y += 16;
    });

    y += 8;
    ctx.font = `500 18px ${UI.mono}`;
    ctx.fillStyle = UI.accent;
    ctx.letterSpacing = '2px';
    ctx.fillText('CONTROLS', pad, y);
    ctx.letterSpacing = '0px';
    y += 30;

    ctx.font = `300 19px ${UI.sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    [
      'Trigger / pinch — open a block',
      'Left grip or Y — turn to Settings',
      'A — toggle sound     B — guide',
      'Two-hand pinch — zoom the tapestry',
      'Grab a panel to leave it floating'
    ].forEach((line) => { ctx.fillText(line, pad, y); y += 26; });

    this.end();
  }
}

// ============================================================================
// 6. KEYBOARD — wallet tracking has to be typeable without a physical keyboard
// ============================================================================
const KEY_ROWS = [
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm'
];

export class Keyboard extends Panel {
  constructor(scene) {
    super({ width: 0.62, height: 0.34, name: 'keyboard', dpm: 1200 });
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    scene.add(this.group);
    this.group.visible = false;
    this.setVisible(false);
    this.buffer = '';
  }

  open(camera, initial = '') {
    this.buffer = initial;
    this.group.visible = true;
    this.setVisible(true);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    // Far enough out, and high enough, that the whole board stays inside the
    // field of view; tilted back like a desk keyboard rather than a wall.
    this.group.position.copy(camera.position).addScaledVector(dir, 0.92);
    this.group.position.y = camera.position.y - 0.24;
    billboardY(this.group, camera.position);
    this.group.rotateX(-0.34);
    this.paint();
  }

  close() {
    this.group.visible = false;
    this.setVisible(false);
  }

  paint() {
    const ctx = this.begin();
    const W = this.w;
    const pad = 26;
    this.drawChrome(null, { pad: 5, radius: 20 });

    // Input display
    roundRect(ctx, pad, 28, W - pad * 2, 56, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = UI.accentDim;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `400 26px ${UI.mono}`;
    ctx.fillStyle = this.buffer ? UI.text : UI.textFaint;
    ctx.textBaseline = 'middle';
    ctx.fillText(this.buffer || 'Track wallet (e.g. 0x71c…)', pad + 18, 57);
    ctx.textBaseline = 'top';

    // Key rows
    let y = 100;
    const keyH = 50;
    KEY_ROWS.forEach((row) => {
      const keyW = (W - pad * 2 - (row.length - 1) * 8) / row.length;
      const rowOffset = (W - (keyW * row.length + 8 * (row.length - 1))) / 2;
      [...row].forEach((ch, i) => {
        const x = rowOffset + i * (keyW + 8);
        this.button(`k-${ch}`, ch, x, y, keyW, keyH, {
          size: 24, font: UI.mono,
          onClick: () => { this.buffer += ch; this.paint(); }
        });
      });
      y += keyH + 8;
    });

    // Action row
    const aw = (W - pad * 2 - 24) / 4;
    this.button('k-x', 'x', pad, y, aw, keyH, { size: 24, font: UI.mono, onClick: () => { this.buffer += 'x'; this.paint(); } });
    this.button('k-del', '⌫', pad + aw + 8, y, aw, keyH, { size: 24, onClick: () => { this.buffer = this.buffer.slice(0, -1); this.paint(); } });
    this.button('k-clear', 'Clear', pad + (aw + 8) * 2, y, aw, keyH, { size: 20, onClick: () => { this.buffer = ''; this.paint(); } });
    this.button('k-ok', 'Track', pad + (aw + 8) * 3, y, aw, keyH, {
      size: 20, active: true, onClick: () => this.onSubmit(this.buffer)
    });

    this.end();
  }
}

// ============================================================================
// 7. PLAYBACK RAIL — the scrub slider, as a rail you physically grab
// ============================================================================
export class PlaybackRail {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.length = 1.25;

    // The rail itself
    const railGeo = new THREE.CylinderGeometry(0.009, 0.009, this.length, 12);
    railGeo.rotateZ(Math.PI / 2);
    this.rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({
      color: 0x1a2536, transparent: true, opacity: 0.85
    }));
    this.group.add(this.rail);

    // Lit portion showing progress
    this.fillGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 12);
    this.fillGeo.rotateZ(Math.PI / 2);
    this.fill = new THREE.Mesh(this.fillGeo, new THREE.MeshBasicMaterial({
      color: 0x3b6fd4, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
    }));
    this.group.add(this.fill);

    // The handle you grab
    this.handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x3b6fd4 })
    );
    this.handle.name = 'playback-handle';
    this.handle.userData.railHandle = this;
    this.group.add(this.handle);

    // Label + transport buttons
    this.panel = new Panel({ width: 0.72, height: 0.17, name: 'playback-panel', dpm: 1300 });
    this.panel.mesh.position.set(0, -0.17, 0);
    this.group.add(this.panel.mesh);

    this.fraction = 1;
    this.dragging = false;
  }

  setVisible(v) { this.group.visible = v; if (v) this.paint(); }

  /**
   * Anchors the rail below the line of sight, where the playback bar sat on
   * screen. Far enough out that the whole 1.25 m span stays inside a
   * comfortable field of view rather than sweeping past both ears.
   */
  place(cameraY) {
    this.group.position.set(0, Math.max(0.55, cameraY - 0.62), -1.75);
  }

  setFraction(f) {
    this.fraction = Math.max(0, Math.min(1, f));
    const x = -this.length / 2 + this.fraction * this.length;
    this.handle.position.set(x, 0, 0);
    const filled = Math.max(0.001, this.fraction * this.length);
    this.fill.scale.set(1, filled, 1);
    this.fill.position.x = -this.length / 2 + filled / 2;
  }

  /** Converts a world point on the rail into a 0..1 scrub fraction. */
  fractionFromWorld(point) {
    const local = this.group.worldToLocal(point.clone());
    return Math.max(0, Math.min(1, (local.x + this.length / 2) / this.length));
  }

  paint() {
    const p = this.panel;
    const ctx = p.begin();
    const W = p.w, H = p.h;
    p.drawChrome(null, { pad: 4, radius: 16, accentBar: false });

    ctx.textBaseline = 'middle';
    ctx.font = `700 28px ${UI.mono}`;
    ctx.fillStyle = UI.accent;
    ctx.fillText(playbackClock(), 30, H / 2);

    ctx.textAlign = 'right';
    ctx.font = `600 22px ${UI.mono}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`${state.playback.index} / ${state.playback.fullList.length} Blocks`, W - 30, H / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    p.button('play', state.playback.playing ? '❚❚  Pause' : '▶  Play', W / 2 - 200, H / 2 - 26, 180, 52,
      { onClick: this.onPlayToggle, size: 22 });
    p.button('portrait', 'Portrait (P)', W / 2 + 20, H / 2 - 26, 180, 52,
      { onClick: this.onPortrait, size: 22 });

    p.end();
  }
}

// ============================================================================
// 8. TOAST — brief confirmations (copied hash, palette changed, relay state)
// ============================================================================
export class Toast extends Panel {
  constructor() {
    super({ width: 0.42, height: 0.09, name: 'toast', dpm: 1200 });
    this.mesh.renderOrder = 1000;  // toasts sit above everything
    this.setVisible(false);
    this.until = 0;
  }

  show(message, ms = 2200) {
    this.message = message;
    this.until = performance.now() + ms;
    this.setVisible(true);
    const ctx = this.begin();
    this.drawChrome(null, { pad: 4, radius: 18, bg: 'rgba(0,20,12,0.95)', border: UI.accentDim, accentBar: false });
    ctx.font = `500 26px ${UI.sans}`;
    ctx.fillStyle = UI.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, this.w / 2, this.h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    this.end();
  }

  update() {
    if (this.visible && performance.now() > this.until) this.setVisible(false);
  }
}
