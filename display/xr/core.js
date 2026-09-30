// ============================================================================
// /trace XR — CORE DATA ENGINE
// Ported from mosaic.js. This is the single source of truth for block data,
// transaction synthesis, palettes, circadian physics and network stats.
// Nothing in here touches the DOM or Three.js — it is pure state + math so the
// XR renderer and the desktop fallback consume exactly the same numbers the
// 2D website does.
// ============================================================================

export const PALETTES = {
  electricBlue: {
    'Plain Transfer': '#00d2ff',
    'Token Swap': '#0044ff',
    'NFT Mint': '#8a2be2',
    'Contract Call': '#ffffff',
    'Staking': '#8a2be2',
    default: '#00b4d8'
  },
  spectrum: {
    'Plain Transfer': 'hsl(190, 80%, 50%)',
    'Token Swap': 'hsl(320, 80%, 55%)',
    'NFT Mint': 'hsl(145, 75%, 45%)',
    'Contract Call': 'hsl(45, 85%, 50%)',
    'Staking': 'hsl(45, 85%, 50%)',
    default: 'hsl(220, 75%, 45%)'
  },
  sunset: {
    'Plain Transfer': 'hsl(275, 75%, 55%)',
    'Token Swap': 'hsl(15, 85%, 55%)',
    'NFT Mint': 'hsl(55, 90%, 55%)',
    'Contract Call': 'hsl(340, 85%, 55%)',
    'Staking': 'hsl(340, 85%, 55%)',
    default: 'hsl(340, 85%, 55%)'
  },
  meadow: {
    'Plain Transfer': 'hsl(160, 60%, 50%)',
    'Token Swap': 'hsl(135, 70%, 40%)',
    'NFT Mint': 'hsl(95, 50%, 50%)',
    'Contract Call': 'hsl(120, 30%, 30%)',
    'Staking': 'hsl(120, 30%, 30%)',
    default: 'hsl(135, 70%, 40%)'
  }
};

// Theme table, lifted from mosaic.js. tileBg is what the tile's glass pane
// gradient sits on, so the XR slab faces have to start from the same colour.
export const THEMES = {
  warmGray: {
    bg: '#ffffff', tileBg: '#f2f2f7', accent: 'hsl(220, 85%, 50%)', text: '#1c1c1e',
    gridLine: 'rgba(0, 0, 0, 0.05)', accentLight: '#ffffff', graphNode: '#007aff', graphText: '#1c1c1e'
  },
  charcoal: {
    bg: '#14140f', tileBg: '#1e1e19', accent: 'hsl(220, 80%, 55%)', text: '#e2e2da',
    gridLine: 'rgba(255, 255, 255, 0.08)', accentLight: '#ffffff', graphNode: '#3b6fd4', graphText: '#e2e2da'
  }
};

// Canonical ordering — the tile shader packs tx types as indices into this.
export const TX_TYPES = ['Plain Transfer', 'Token Swap', 'NFT Mint', 'Staking', 'Contract Call'];

export const HUMAN_LABELS = {
  'Plain Transfer': 'Direct Payment',
  'Token Swap': 'Currency Exchange',
  'NFT Mint': 'Digital Art',
  'Contract Call': 'Automated Code',
  'Staking': 'Earning Interest'
};

// ---------------------------------------------------------------------------
// Live application state (mirrors the globals mosaic.js keeps at module scope)
// ---------------------------------------------------------------------------
export const state = {
  blocks: [],
  liveBlocksCache: [],
  mode: 'LIVE',              // 'LIVE' | 'HISTORICAL'
  chain: 'ethereum',
  palette: 'spectrum',
  trackedAddress: '',
  selectedHistoricalDate: '',
  historicalDayNumber: 1,

  // Presentation state the panels read directly
  muted: false,
  focusMode: false,
  portraitMode: false,
  soundProfile: 'chimes',
  ambientProfile: 'hum',
  theme: 'charcoal',
  renderScale: 'MICRO',   // 'MICRO' | 'MACRO'
  legendFilter: null,     // a TX_TYPES value, or null
  cols: 24,
  rows: 12,
  get maxTiles() { return this.cols * this.rows; },

  // Derived stats, recomputed by updateStats()
  stats: {
    latestBlock: '—',
    avgFee: '— Gwei',
    gridFill: '0%',
    dominantTrend: 'Analyzing...',
    gasTrajectory: 'Stable →',
    gasTrajectoryColor: '#ffffff',
    ratio: { transfers: 33, swaps: 34, mints: 33 },
    sessionTotalTx: 0,
    sessionTotalUsd: 0,
    sessionDirectCount: 0,
    weatherCondition: 'calm and quiet'
  },

  // Playback (archive scrubbing)
  playback: {
    fullList: [],
    index: 0,
    playing: false,
    timerId: null
  }
};

// Simple pub/sub so the renderer can react to data events without polling.
const listeners = {};
export function on(evt, fn) {
  (listeners[evt] || (listeners[evt] = [])).push(fn);
}
export function emit(evt, payload) {
  (listeners[evt] || []).forEach((fn) => {
    try { fn(payload); } catch (e) { console.error(`[core] listener for "${evt}" threw`, e); }
  });
}

// ---------------------------------------------------------------------------
// Deterministic randomness — identical implementation to mosaic.js
// ---------------------------------------------------------------------------
export function seedRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Deterministic transaction synthesis — identical to mosaic.js
// ---------------------------------------------------------------------------
export function getBlockTransactions(block) {
  if (block.transactions) return block.transactions;

  // Memoised per block. This is called from the trend maths, the stats
  // counter, the hover label, the slab and the tile packer, so without a cache
  // a single arrival re-synthesised a few thousand objects and handed the GC a
  // spike big enough to drop a frame in a headset. The tag invalidates the
  // cache when the tracked wallet changes, since that injects a transaction.
  const tag = state.trackedAddress || '';
  if (block._txCache && block._txTag === tag) return block._txCache;

  const hash = (block.hash || '0x000').replace('0x', '');
  const txs = [];
  const count = Math.min(6, Math.max(3, block.tx_count % 8));

  const assets = ['ETH', 'USDC', 'USDT', 'Pepe', 'LINK', 'UNI'];
  const types = ['Plain Transfer', 'Token Swap', 'NFT Mint', 'Staking', 'Contract Call'];
  const labels = ['Flagged Wallet', 'Binance Hot Wallet', 'Uniswap Pool', 'MEV Bot', 'Private User'];

  if (state.trackedAddress && state.trackedAddress.length > 0) {
    const isMatched = block.block_number % 4 === 0;
    if (isMatched) {
      const isSent = block.block_number % 8 === 0;
      txs.push({
        from: isSent ? state.trackedAddress : '0x71c9595e6f36ff8b813b2c6b4716766465cba279',
        to: isSent ? '0x17c91836173a11b813b2c62c4716766465cba279' : state.trackedAddress,
        valueEth: 1.85,
        valueUsd: 3330.0,
        asset: 'ETH',
        type: 'Plain Transfer',
        gasPriceGwei: 18.5,
        confirmations: 14,
        label: isSent ? 'Tracked Wallet (Sent)' : 'Tracked Wallet (Received)',
        anomaly: 'None'
      });
    }
  }

  for (let i = 0; i < count; i++) {
    const seedVal = parseInt(hash.substring(i * 4, i * 4 + 4), 16);
    const fAddr = '0x' + hash.substring((i * 3) % 40, ((i * 3) % 40) + 6) + '...' + hash.substring((i * 4) % 40, ((i * 4) % 40) + 4);
    const tAddr = '0x' + hash.substring((i * 5) % 40, ((i * 5) % 40) + 6) + '...' + hash.substring((i * 6) % 40, ((i * 6) % 40) + 4);

    const asset = assets[seedVal % assets.length];
    const txType = types[(seedVal >> 2) % types.length];
    const label = labels[(seedVal >> 4) % labels.length];

    const valueEth = parseFloat(((seedVal % 1500) / 100).toFixed(2));
    const valueUsd = valueEth * (asset === 'ETH' ? 1800 : 1);

    let anomaly = 'None';
    if (valueUsd > 10000) anomaly = 'Large Transfer 🐳';
    else if (seedVal % 100 === 7) anomaly = 'Wash Trading Flag';

    txs.push({
      from: fAddr.toLowerCase(),
      to: tAddr.toLowerCase(),
      valueEth,
      valueUsd: parseFloat(valueUsd.toFixed(2)),
      asset,
      type: txType,
      gasPriceGwei: 12 + (seedVal % 30),
      confirmations: 10 + (seedVal % 8),
      label,
      anomaly
    });
  }

  block._txCache = txs;
  block._txTag = tag;
  return txs;
}

// ---------------------------------------------------------------------------
// Sub-pixel layout — identical scoring to mosaic.js, returned as a 64-bit mask
// so the tile shader can unpack it without a per-cell attribute.
// ---------------------------------------------------------------------------
export function getSubpixelLayout(hash, targetCount, regularity) {
  const cells = [];
  for (let i = 0; i < 64; i++) {
    const r = Math.floor(i / 8);
    const c = i % 8;
    const regularScore = (r + c) % 2 === 0 ? 0.75 : 0.25;
    const hexVal = parseInt(hash[i % hash.length], 16);
    const irregularScore = hexVal / 15;
    const score = regularity * regularScore + (1 - regularity) * irregularScore;
    cells.push({ index: i, row: r, col: c, score });
  }
  cells.sort((a, b) => b.score - a.score);
  return cells.slice(0, targetCount);
}

/**
 * Packs a block's 8x8 sub-pixel pattern into four 16-bit integers, plus the
 * per-cell "rank" needed to pick which transaction colours each lit cell.
 * The shader unpacks these; see tiles.js.
 */
export function packBlockPattern(block) {
  const hash = (block.hash || '0x0').replace('0x', '');
  const density = Math.max(0.1, Math.min(0.85, block.tx_count / 300));
  const targetOnCount = Math.max(6, Math.floor(density * 64));
  const regularity = 1.0 - (block.contract_ratio || 0);
  const active = getSubpixelLayout(hash, targetOnCount, regularity);

  // mask[w] bit b  <=>  cell index w*16 + b is lit
  const mask = [0, 0, 0, 0];
  // rank of each lit cell, so cell -> txs[rank % txCount] matches the 2D build
  const rank = new Uint8Array(64);
  active.forEach((cell, i) => {
    const w = Math.floor(cell.index / 16);
    const b = cell.index % 16;
    mask[w] |= (1 << b);
    rank[cell.index] = i % 6;
  });

  const txs = getBlockTransactions(block);
  // Pack up to 6 tx type indices, 3 bits each, into one float (18 bits).
  let typesPacked = 0;
  for (let i = 0; i < 6; i++) {
    const t = txs[i % txs.length];
    const idx = Math.max(0, TX_TYPES.indexOf(t ? t.type : 'Plain Transfer'));
    typesPacked |= (idx & 7) << (i * 3);
  }

  // Pack the 64 ranks as 3 bits each into four floats (16 cells * 3 = 48 bits
  // is too wide for a float32 mantissa, so use 8 cells * 3 bits = 24 bits each).
  const ranks = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 64; i++) {
    ranks[Math.floor(i / 8)] |= (rank[i] & 7) << ((i % 8) * 3);
  }

  return { mask, typesPacked, ranks, targetOnCount, txCount: txs.length };
}

// ---------------------------------------------------------------------------
// Circadian / market-phase physics — identical to mosaic.js
// ---------------------------------------------------------------------------
export function getNetworkFactor(block) {
  if (!block) return 'ACTIVE';
  const txDensity = block.tx_count / 300;
  const smartContractFriction = block.contract_ratio || 0.2;
  if (txDensity > 0.75 && smartContractFriction > 0.5) return 'SPIKE';
  if (txDensity > 0.65 && smartContractFriction <= 0.5) return 'ACCUMULATION';
  if (txDensity < 0.25) return 'QUIET';
  return 'ACTIVE';
}

export function getCircadianState() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 21) return 'EVENING';
  return 'NIGHT';
}

export function getPhasePhysics(factor) {
  // [gutter, shimmerSpeed, cullingThreshold]
  if (factor === 'SPIKE') return [0, 400, -0.8];
  if (factor === 'ACCUMULATION') return [0.5, 2000, -0.4];
  if (factor === 'QUIET') return [3.5, 4500, 0.4];
  return [1.2, 1800, 0.0];
}

export function getTemporalSortedBlocks(blocksArray, cState) {
  // A daily portrait is a *spatial* composition: its blocks were generated to
  // sit on a template mask. Re-sorting them by hue or complexity would scatter
  // the shape, so the archive keeps its own order.
  if (state.mode === 'HISTORICAL') return blocksArray;
  const b = [...blocksArray];
  if (cState === 'MORNING') {
    b.sort((x, y) => (x.hue || 0) - (y.hue || 0));
  } else if (cState === 'EVENING') {
    b.sort((x, y) => (y.whale_flag || 0) - (x.whale_flag || 0) || (y.complexity || 0) - (x.complexity || 0));
  } else if (cState === 'NIGHT') {
    b.sort((x, y) => (x.complexity || 0) - (y.complexity || 0));
  }
  return b;
}

// Per-cell positional drift driven by time of day. In XR this displaces the
// tile in the wall plane exactly as it displaced the 2D canvas tile.
export function getTimeOfDayDrift(col, row, cols, rows, factor, timePhase) {
  let driftX = 0;
  let driftY = 0;
  let multiplier = 1.0;
  if (factor === 'SPIKE') multiplier = 3.5;
  if (factor === 'ACCUMULATION') multiplier = 2.0;
  if (factor === 'QUIET') multiplier = 0.5;

  if (timePhase === 'MORNING') {
    driftY = -Math.abs(Math.sin(col * 0.2 + row * 0.1)) * 4 * multiplier;
  } else if (timePhase === 'EVENING') {
    const dx = col - cols / 2;
    const dy = row - rows / 2;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    driftX = -(dx / dist) * 1.5 * multiplier;
    driftY = -(dy / dist) * 1.5 * multiplier;
  } else if (timePhase === 'NIGHT') {
    driftX = row % 2 === 0 ? 1.5 * multiplier : -1.5 * multiplier;
  }
  return { dx: driftX, dy: driftY };
}

/** Sky/fog tint for the circadian skybox (atmosphere item 5). */
export function getCircadianSky(cState) {
  switch (cState) {
    case 'MORNING':   return { top: 0x0b1a33, horizon: 0x1b3d68, fog: 0x070e1a, intensity: 0.55 };
    case 'AFTERNOON': return { top: 0x091320, horizon: 0x142d3e, fog: 0x060c14, intensity: 0.40 };
    case 'EVENING':   return { top: 0x1a0a06, horizon: 0x4a1c08, fog: 0x0d0605, intensity: 0.70 };
    default:          return { top: 0x01030a, horizon: 0x04101c, fog: 0x000308, intensity: 0.25 };
  }
}

// ---------------------------------------------------------------------------
// Daily portrait templates — identical to mosaic.js
// ---------------------------------------------------------------------------
export function getDailyMaskAlignment(col, row, category, cols, rows) {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const dx = Math.abs(col - cx);
  const dy = Math.abs(row - cy);

  switch (category) {
    case 'dragon':
      return row >= cy - 2 && dx <= (rows - 1 - row) * 0.75;
    case 'diamond':
      return dy < rows * 0.4 && dx < (rows * 0.4 - dy) * 0.8;
    case 'shield':
      return dy < rows * 0.35 && dx < cols * 0.2 && (row <= cy || dx < cols * 0.15 - (row - cy) * 0.1);
    case 'wave': {
      const targetRow = cy + Math.round(Math.sin((col / cols) * Math.PI * 2) * (rows * 0.25));
      return Math.abs(row - targetRow) < 2;
    }
    case 'zen': {
      const dist = Math.sqrt(dx * dx + dy * dy);
      return Math.round(dist) % 4 === 0 || Math.round(dist) % 4 === 1;
    }
  }
  return false;
}

export function getCategoryForDay(dayNum) {
  return { 1: 'zen', 2: 'wave', 3: 'shield', 4: 'diamond', 5: 'dragon', 6: 'wave' }[dayNum] || 'diamond';
}

export function getCategoryLabel(category) {
  return {
    zen: 'The Zen Garden (Calm)',
    wave: 'The Wave (DeFi Swaps)',
    shield: 'The Shield (Whale Movements)',
    diamond: 'The Ethereum Diamond (Harmony)',
    dragon: 'The Dragon (Gas Spike)'
  }[category] || 'Historical Day';
}

export function generateMockHistoryForDate(dateString) {
  const rand = seedRandom(dateString);
  const mockBlocks = [];
  let blockNum = 25000000 + (parseInt(dateString.replace(/-/g, '')) % 1000000);
  let timestamp = Math.floor(new Date(dateString).getTime() / 1000);
  const category = getCategoryForDay(state.historicalDayNumber);

  for (let index = 0; index < state.maxTiles; index++) {
    blockNum++;
    timestamp += 12;
    const col = index % state.cols;
    const row = Math.floor(index / state.cols);
    const isOnTemplate = getDailyMaskAlignment(col, row, category, state.cols, state.rows);

    const baseFee = isOnTemplate ? 35 + rand() * 20 : 5 + rand() * 8;
    const txCount = isOnTemplate ? 180 + Math.floor(rand() * 80) : 10 + Math.floor(rand() * 30);
    const contractRatio = isOnTemplate ? 0.4 + rand() * 0.3 : 0.05 + rand() * 0.1;
    const whaleFlag = isOnTemplate && rand() < 0.15 ? 1 : 0;
    const largestTxUsd = whaleFlag ? 65000 + rand() * 150000 : 100 + rand() * 4000;

    const minFee = 10, maxFee = 100, minHue = 230, maxHue = 15;
    const hue = baseFee <= minFee ? minHue : (baseFee >= maxFee ? maxHue : Math.round(minHue + ((baseFee - minFee) / (maxFee - minFee)) * (maxHue - minHue)));

    const minTx = 0, maxTx = 300, minSat = 40, maxSat = 100;
    const saturation = txCount <= minTx ? minSat : (txCount >= maxTx ? maxSat : Math.round(minSat + ((txCount - minTx) / (maxTx - minTx)) * (maxSat - minSat)));

    let hash = '0x';
    const hexChars = '0123456789abcdef';
    for (let h = 0; h < 64; h++) hash += hexChars[Math.floor(rand() * 16)];

    mockBlocks.push({
      block_number: blockNum,
      hash,
      timestamp,
      base_fee_gwei: parseFloat(baseFee.toFixed(2)),
      tx_count: txCount,
      contract_ratio: parseFloat(contractRatio.toFixed(3)),
      whale_flag: whaleFlag,
      largest_tx_value_usd: parseFloat(largestTxUsd.toFixed(2)),
      hue,
      saturation,
      complexity: contractRatio,
      _onTemplate: isOnTemplate
    });
  }
  return mockBlocks;
}

// ---------------------------------------------------------------------------
// Simulated block generation for non-Ethereum chains + relay fallback
// ---------------------------------------------------------------------------
export function generateSimulatedBlock() {
  if (state.mode !== 'LIVE') return null;

  const blockNum = state.blocks.length > 0 ? state.blocks[state.blocks.length - 1].block_number + 1 : 42000000;
  const timestamp = Math.floor(Date.now() / 1000);

  let baseFee = 0.01;
  let txCount = 50;
  let contractRatio = 0.2;

  if (state.chain === 'base') {
    baseFee = 0.001 + Math.random() * 0.005;
    txCount = 30 + Math.floor(Math.random() * 120);
    contractRatio = 0.3 + Math.random() * 0.3;
  } else if (state.chain === 'arbitrum') {
    baseFee = 0.05 + Math.random() * 0.1;
    txCount = 50 + Math.floor(Math.random() * 180);
    contractRatio = 0.4 + Math.random() * 0.4;
  } else if (state.chain === 'solana') {
    baseFee = 0.00005 + Math.random() * 0.0001;
    txCount = 1200 + Math.floor(Math.random() * 1000);
    contractRatio = 0.8 + Math.random() * 0.15;
  } else {
    baseFee = 8 + Math.random() * 60;
    txCount = 40 + Math.floor(Math.random() * 180);
    contractRatio = 0.15 + Math.random() * 0.5;
  }

  const isL2 = state.chain !== 'ethereum';
  const minFee = isL2 ? 0.0001 : 10;
  const maxFee = isL2 ? 0.2 : 100;
  const minHue = 230, maxHue = 15;
  const hue = baseFee <= minFee ? minHue : (baseFee >= maxFee ? maxHue : Math.round(minHue + ((baseFee - minFee) / (maxFee - minFee)) * (maxHue - minHue)));

  const maxTx = state.chain === 'solana' ? 2200 : 300;
  const minSat = 40, maxSat = 100;
  const saturation = txCount >= maxTx ? maxSat : Math.round(minSat + (txCount / maxTx) * (maxSat - minSat));

  const whaleFlag = Math.random() < (state.chain === 'solana' ? 0.02 : 0.08) ? 1 : 0;
  const largestTxUsd = whaleFlag ? 50000 + Math.random() * 200000 : 20 + Math.random() * 2000;

  let hash = '0x';
  const hexChars = '0123456789abcdef';
  for (let h = 0; h < 64; h++) hash += hexChars[Math.floor(Math.random() * 16)];

  const newBlock = {
    block_number: blockNum,
    hash,
    timestamp,
    base_fee_gwei: parseFloat(baseFee.toFixed(5)),
    tx_count: txCount,
    contract_ratio: parseFloat(contractRatio.toFixed(3)),
    whale_flag: whaleFlag,
    largest_tx_value_usd: parseFloat(largestTxUsd.toFixed(2)),
    hue,
    saturation,
    complexity: contractRatio
  };

  ingestBlock(newBlock);
  return newBlock;
}

/**
 * The single funnel every new block passes through, whether it came from the
 * relay socket or the simulator. Emits 'block' so the world can spawn the
 * arrival shard, play the tone and pulse the floor.
 */
export function ingestBlock(block) {
  block._mintedAt = Date.now();
  state.blocks.push(block);
  if (state.blocks.length > state.maxTiles) state.blocks.shift();
  updateStats();
  emit('block', block);
  if (block.whale_flag === 1) emit('whale', block);
}

// ---------------------------------------------------------------------------
// Relay connection — same candidate-URL ladder as mosaic.js, with the same
// simulated fallback when nothing answers.
// ---------------------------------------------------------------------------
/**
 * Fills the wall with a plausible history straight away. Called at boot, so
 * the viewer never arrives into an empty room while the relay ladder runs;
 * a real 'history' message from the relay replaces this wholesale.
 */
export function primeInitialBlocks() {
  if (state.blocks.length > 0) return;
  const capacity = state.maxTiles;
  for (let i = 0; i < capacity; i++) {
    const fee = 8 + Math.random() * 70;
    state.blocks.push({
      block_number: 42000000 + i,
      timestamp: Math.floor(Date.now() / 1000) - (capacity - i) * 12,
      hash: '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      tx_count: 20 + Math.floor(Math.random() * 150),
      base_fee_gwei: parseFloat(fee.toFixed(2)),
      contract_ratio: Math.random(),
      whale_flag: Math.random() < 0.05 ? 1 : 0,
      largest_tx_value_usd: 20 + Math.random() * 3000,
      hue: Math.round(230 - (fee / 100) * 215),
      saturation: 40 + Math.floor(Math.random() * 60),
      complexity: Math.random(),
      // Staggered so the wall weaves itself in rather than snapping on.
      _mintedAt: Date.now() - Math.round((capacity - i) * 2.2)
    });
  }
  updateStats();
  emit('reset');
}

let simIntervalId = null;
let chainIntervalId = null;
let wsReconnectDelay = 1000;
// Single-flight guards. A refused socket fires BOTH `error` and `close`, and
// without these each refusal started a fresh ladder — four sockets became
// sixteen, then sixty-four, until the browser ran out of handles.
let relayLadderRunning = false;
let relayRetryTimer = null;

function scheduleRelayRetry(delay) {
  if (relayRetryTimer) return;
  relayRetryTimer = setTimeout(() => {
    relayRetryTimer = null;
    connectRelay();
  }, delay);
}

export function connectRelay() {
  if (relayLadderRunning) return;
  relayLadderRunning = true;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  let candidateUrls;
  if (isLocalHost) {
    candidateUrls = [8086, 8080, 8087, 8088].map((p) => `${wsProtocol}//${host}:${p}`);
  } else if (host.endsWith('.onrender.com')) {
    candidateUrls = ['wss://blockchain-mosaic-relay.onrender.com'];
  } else {
    candidateUrls = [`${wsProtocol}//${window.location.host}`, 'wss://blockchain-mosaic-production.up.railway.app'];
  }

  let currentIndex = 0;

  function startSimulator() {
    if (simIntervalId) return;
    emit('relay', { status: 'simulated' });
    primeInitialBlocks();
    simIntervalId = setInterval(generateSimulatedBlock, 12000);
  }

  function attempt() {
    if (currentIndex >= candidateUrls.length) {
      relayLadderRunning = false;
      startSimulator();
      wsReconnectDelay = Math.min(wsReconnectDelay * 1.5, 30000);
      scheduleRelayRetry(wsReconnectDelay);
      return;
    }

    const url = candidateUrls[currentIndex++];
    emit('relay', { status: 'connecting', url });

    let socket;
    try {
      socket = new WebSocket(url);
    } catch (e) {
      attempt();
      return;
    }

    // error, close and the timeout can all fire for one refused socket; only
    // the first of them may advance the ladder.
    let settled = false;
    const advance = () => {
      if (settled) return;
      settled = true;
      clearTimeout(failTimer);
      try { socket.close(); } catch (e) { /* already closing */ }
      attempt();
    };

    const failTimer = setTimeout(advance, 1800);

    socket.addEventListener('open', () => {
      settled = true;
      clearTimeout(failTimer);
      wsReconnectDelay = 1000;
      relayLadderRunning = false;
      if (simIntervalId) { clearInterval(simIntervalId); simIntervalId = null; }
      emit('relay', { status: 'live', url });
    });

    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'history') {
          const liveBlocks = msg.data.slice(-state.maxTiles);
          if (state.mode === 'LIVE' && state.chain === 'ethereum') {
            state.blocks = liveBlocks.map((b) => ({ ...b, _mintedAt: Date.now() }));
            updateStats();
            emit('reset');
          } else {
            state.liveBlocksCache = liveBlocks;
          }
        } else if (msg.type === 'block') {
          if (state.mode === 'LIVE' && state.chain === 'ethereum') {
            ingestBlock(msg.data);
          } else {
            state.liveBlocksCache.push(msg.data);
            if (state.liveBlocksCache.length > state.maxTiles) state.liveBlocksCache.shift();
          }
        }
      } catch (err) {
        console.error('[core] bad relay message', err);
      }
    });

    socket.addEventListener('error', () => {
      if (socket.readyState !== WebSocket.OPEN) advance();
    });

    socket.addEventListener('close', () => {
      if (!settled) { advance(); return; }
      // Only a socket that had actually opened earns a reconnect.
      if (!relayLadderRunning) {
        emit('relay', { status: 'closed' });
        scheduleRelayRetry(5000);
      }
    });
  }

  attempt();
}

export function setChain(chain) {
  state.chain = chain;
  state.blocks = [];
  if (chainIntervalId) { clearInterval(chainIntervalId); chainIntervalId = null; }
  if (chain === 'ethereum') {
    switchToLive();
  } else {
    const cadence = chain === 'arbitrum' ? 500 : chain === 'solana' ? 400 : 2000;
    state.mode = 'LIVE';
    for (let i = 0; i < state.maxTiles; i++) generateSimulatedBlock();
    chainIntervalId = setInterval(generateSimulatedBlock, cadence);
  }
  emit('reset');
}

export function switchToLive() {
  state.mode = 'LIVE';
  state.selectedHistoricalDate = '';
  stopPlayback();
  if (state.liveBlocksCache.length > 0) {
    state.blocks = state.liveBlocksCache.slice(-state.maxTiles).map((b) => ({ ...b, _mintedAt: Date.now() }));
  }
  updateStats();
  emit('mode', 'LIVE');
  emit('reset');
}

// ---------------------------------------------------------------------------
// Historical archive + playback
// ---------------------------------------------------------------------------
export async function loadHistoricalPortrait(dateStr, dayNum) {
  state.mode = 'HISTORICAL';
  state.selectedHistoricalDate = dateStr;
  state.historicalDayNumber = dayNum;
  stopPlayback();

  // Keep the live feed alive in the cache so "Live Grid" restores instantly.
  if (state.liveBlocksCache.length === 0) state.liveBlocksCache = [...state.blocks];

  let dayBlocks = [];
  try {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const response = await fetch(`${protocol}//${host}/api/history/${dateStr}`);
    const json = await response.json();
    if (json.status === 'success' && json.data && json.data.length > 0) dayBlocks = json.data;
  } catch (e) {
    // Relay unreachable — fall through to the deterministic mock, exactly as
    // the 2D build does, so the archive is always explorable.
  }

  if (dayBlocks.length === 0) dayBlocks = generateMockHistoryForDate(dateStr);

  state.playback.fullList = dayBlocks;
  state.playback.index = dayBlocks.length;
  state.blocks = dayBlocks.slice(0, state.maxTiles);
  updateStats();
  emit('mode', 'HISTORICAL');
  emit('reset');
  return dayBlocks;
}

export function scrubPlayback(fraction) {
  const list = state.playback.fullList;
  if (list.length === 0) return;
  const count = Math.max(1, Math.round(fraction * list.length));
  state.playback.index = count;
  state.blocks = list.slice(0, count);
  updateStats();
  emit('reset');
}

export function startPlayback() {
  if (state.playback.fullList.length === 0) return;
  state.playback.playing = true;
  if (state.playback.index >= state.playback.fullList.length) state.playback.index = 0;
  state.playback.timerId = setInterval(() => {
    if (state.playback.index >= state.playback.fullList.length) {
      stopPlayback();
      return;
    }
    state.playback.index++;
    state.blocks = state.playback.fullList.slice(0, state.playback.index);
    const justAdded = state.blocks[state.blocks.length - 1];
    if (justAdded) {
      justAdded._mintedAt = Date.now();
      emit('block', justAdded);
    }
    updateStats();
  }, 120);
  emit('playback', state.playback);
}

export function stopPlayback() {
  state.playback.playing = false;
  if (state.playback.timerId) { clearInterval(state.playback.timerId); state.playback.timerId = null; }
  emit('playback', state.playback);
}

export function togglePlayback() {
  if (state.playback.playing) stopPlayback(); else startPlayback();
}

/** 00:00–23:59 clock position for the current playback index. */
export function playbackClock() {
  const list = state.playback.fullList;
  if (list.length === 0) return '00:00';
  const frac = Math.min(1, state.playback.index / list.length);
  const totalMin = Math.floor(frac * 24 * 60);
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const m = String(totalMin % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// ---------------------------------------------------------------------------
// Stats + trends — same arithmetic as updateStats()/calculateDailyTrends()
// ---------------------------------------------------------------------------
export function updateStats() {
  const s = state.stats;

  // Session accumulators — each block counted exactly once.
  state.blocks.forEach((b) => {
    if (b._counted) return;
    s.sessionTotalTx += b.tx_count;
    getBlockTransactions(b).forEach((t) => {
      s.sessionTotalUsd += t.valueUsd || 0;
      if (t.type === 'Plain Transfer') s.sessionDirectCount++;
    });
    b._counted = true;
  });

  s.weatherCondition = 'calm and quiet';
  if (s.sessionTotalUsd > 10000000) s.weatherCondition = 'experiencing heavy financial turbulence';
  else if (s.sessionTotalTx > 1000) s.weatherCondition = 'highly congested and expensive';
  else if (s.sessionDirectCount > s.sessionTotalTx * 0.5) s.weatherCondition = 'dominated by everyday human activity';

  if (state.blocks.length === 0) { emit('stats', s); return; }

  const sumFee = state.blocks.reduce((sum, b) => sum + b.base_fee_gwei, 0);
  const avgFee = sumFee / state.blocks.length;

  if (state.mode === 'LIVE') {
    s.latestBlock = `#${state.blocks[state.blocks.length - 1].block_number}`;
    s.avgFee = state.chain === 'solana' ? `${avgFee.toFixed(5)} SOL` : `${avgFee.toFixed(1)} Gwei`;
    s.gridFill = `${Math.round(Math.min((state.blocks.length / state.maxTiles) * 100, 100))}%`;
  } else {
    s.latestBlock = state.selectedHistoricalDate;
    s.avgFee = `${avgFee.toFixed(1)} Gwei`;
    s.gridFill = `${state.blocks.length}`;
  }

  calculateDailyTrends();
  emit('stats', s);
}

export function calculateDailyTrends() {
  const s = state.stats;
  if (state.blocks.length === 0) return;

  let transfers = 0, swaps = 0, mints = 0, staking = 0;
  state.blocks.forEach((b) => {
    getBlockTransactions(b).forEach((t) => {
      if (t.type === 'Plain Transfer') transfers++;
      else if (t.type === 'Token Swap') swaps++;
      else if (t.type === 'NFT Mint') mints++;
      else staking++;
    });
  });

  const total = transfers + swaps + mints + staking || 1;
  s.ratio = {
    transfers: (transfers / total) * 100,
    swaps: (swaps / total) * 100,
    mints: (mints / total) * 100
  };

  let dominant = 'Transfers';
  let maxCount = transfers;
  if (swaps > maxCount) { dominant = 'DeFi Token Swaps 🔄'; maxCount = swaps; }
  if (mints > maxCount) { dominant = 'NFT Minting 🎨'; maxCount = mints; }
  if (staking > maxCount) { dominant = 'Contracts ⚙️'; }
  if (maxCount === transfers) dominant = 'Capital Transfers 💸';
  s.dominantTrend = dominant;

  if (state.blocks.length > 5) {
    const recent = state.blocks.slice(-5);
    const older = state.blocks.slice(0, 5);
    const avgRecent = recent.reduce((sum, b) => sum + b.base_fee_gwei, 0) / 5;
    const avgOlder = older.reduce((sum, b) => sum + b.base_fee_gwei, 0) / 5;
    const threshold = state.chain === 'solana' ? 0.00002 : 3;
    if (avgRecent > avgOlder + threshold) {
      s.gasTrajectory = 'Upward Spike 🔥';
      s.gasTrajectoryColor = '#ff6b6b';
    } else if (avgRecent < avgOlder - threshold) {
      s.gasTrajectory = 'Cooling Down 📉';
      s.gasTrajectoryColor = '#51cf66';
    } else {
      s.gasTrajectory = 'Stable ➡️';
      s.gasTrajectoryColor = '#ffffff';
    }
  }
}

/**
 * SVG export, ported from mosaic.js exportSVG(). Returns the markup rather
 * than downloading it, so the XR layer can decide what to do with the file
 * (a download mid-session lands in the browser, not the headset view).
 */
export function exportSVG() {
  if (state.blocks.length === 0) return null;

  const theme = THEMES[state.theme] || THEMES.charcoal;
  const tileSize = 64;
  const gutter = 3;
  const cols = state.cols;
  const rows = Math.max(1, Math.ceil(state.blocks.length / cols));
  const width = cols * tileSize;
  const height = rows * tileSize;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `  <rect width="100%" height="100%" fill="${theme.bg}"/>\n`;

  const category = state.mode === 'HISTORICAL' ? getCategoryForDay(state.historicalDayNumber) : null;
  const pal = PALETTES[state.palette] || PALETTES.spectrum;

  state.blocks.forEach((block, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * tileSize;
    const y = row * tileSize;
    const size = tileSize - gutter;

    const isOnTemplate = state.mode === 'HISTORICAL'
      ? getDailyMaskAlignment(col, row, category, cols, rows)
      : true;
    const tileBg = isOnTemplate ? theme.tileBg : theme.bg;

    svg += `  <!-- Block #${block.block_number} -->\n`;
    svg += `  <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${tileBg}" rx="3"/>\n`;

    const density = Math.max(0.1, Math.min(0.85, block.tx_count / 300));
    const targetOnCount = Math.max(6, Math.floor(density * 64));
    const regularity = 1.0 - block.contract_ratio;
    const activeCells = getSubpixelLayout((block.hash || '').replace('0x', ''), targetOnCount, regularity);

    const prevBlock = index > 0 ? state.blocks[index - 1] : null;
    const blockInterval = prevBlock ? Math.max(1, block.timestamp - prevBlock.timestamp) : 12;
    const edgeFadeFactor = Math.max(0, Math.min(0.75, (blockInterval - 8) / 16));
    const subSize = size / 8;

    const hashHex = (block.hash || '0x0').replace('0x', '');
    const whaleIndex1 = parseInt(hashHex.substring(0, 2), 16) % targetOnCount;
    const whaleIndex2 = parseInt(hashHex.substring(2, 4), 16) % targetOnCount;

    const txs = getBlockTransactions(block);

    activeCells.forEach((cell, idx) => {
      const dx = cell.col - 3.5;
      const dy = cell.row - 3.5;
      const dist = Math.sqrt(dx * dx + dy * dy) / 4.95;
      const maskModifier = isOnTemplate ? 1.0 : 0.15;
      const finalOpacity = Math.max(0.05, 1 - dist * edgeFadeFactor) * maskModifier;

      const tx = txs[idx % txs.length] || { type: 'Plain Transfer' };
      let color = pal[tx.type] || pal.default;
      if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) color = '#ffffff';

      const finalColor = color.includes('hsl') && !color.includes('hsla')
        ? color.replace('hsl', 'hsla').replace(')', `, ${finalOpacity.toFixed(2)})`)
        : color;

      const px = x + cell.col * subSize + 0.5;
      const py = y + cell.row * subSize + 0.5;
      const pSize = subSize - 1;
      svg += `  <rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pSize.toFixed(1)}" height="${pSize.toFixed(1)}" fill="${finalColor}"/>\n`;
    });
  });

  return svg + '</svg>';
}

/** Mood label used by the hover label and the block slab header. */
export function getBlockMood(block) {
  if (block.base_fee_gwei > (state.chain === 'solana' ? 0.00015 : 60)) return 'Congested 🔥';
  if (block.tx_count > (state.chain === 'solana' ? 2000 : 200)) return 'Bustling ⚡';
  if (block.tx_count > (state.chain === 'solana' ? 1500 : 100)) return 'Active';
  return 'Calm';
}

/** Total USD moved in a block, as the tooltip and the slab both report it. */
export function getBlockUsd(block) {
  return getBlockTransactions(block).reduce((sum, t) => sum + t.valueUsd, 0);
}

/**
 * 0..1 "atmospheric pressure" from gas. Drives fog density, drone pitch and
 * the reactive floor (atmosphere item 7, folded into the approved set).
 */
export function getGasPressure() {
  if (state.blocks.length === 0) return 0;
  const avg = state.blocks.reduce((s, b) => s + b.base_fee_gwei, 0) / state.blocks.length;
  if (state.chain === 'solana') return Math.min(1, avg / 0.0002);
  if (state.chain === 'base' || state.chain === 'arbitrum') return Math.min(1, avg / 0.2);
  return Math.min(1, avg / 90);
}
