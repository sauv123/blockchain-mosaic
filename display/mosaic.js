// Mosaic App Code
let blocks = [];
let liveBlocksCache = [];
let currentMode = 'LIVE'; // 'LIVE' or 'HISTORICAL'
let selectedHistoricalDate = '';
let historicalDayNumber = 1;
let incomingBlockNum = null;
let incomingBlockStartTime = 0;
const PAINT_DURATION = 1200;

const canvas = document.getElementById('mosaic-canvas');
const ctx = canvas.getContext('2d');

// State
let tileSize = 64;
const gutter = 3;
let cols = 0;
let rows = 0;
let maxTiles = 0;
let hoveredBlock = null;
let activePopoverBlock = null;
let lastInteractionTime = Date.now();
const DISMISS_TIMEOUT = 25000;
let trackedAddress = '';

// Artsy Canvas focus floating & radial wave simulation state
let focusFloatProgress = { value: 0 };
let rippleOriginCol = -1;
let rippleOriginRow = -1;
let rippleProgress = { value: 0 };


// Multi-Chain State
let currentChain = 'ethereum';
let chainIntervalId = null;

// Generative Art Palettes config
let currentPalette = 'spectrum';
const PALETTES = {
  spectrum: {
    'Plain Transfer': 'hsl(190, 80%, 50%)', // Electric Cyan
    'Token Swap': 'hsl(320, 80%, 55%)',     // Magenta
    'NFT Mint': 'hsl(145, 75%, 45%)',       // Emerald Green
    'Contract Call': 'hsl(45, 85%, 50%)',   // Yellow/Gold
    'Staking': 'hsl(45, 85%, 50%)',
    'default': 'hsl(220, 75%, 45%)'
  },
  sunset: {
    'Plain Transfer': 'hsl(275, 75%, 55%)', // Purple
    'Token Swap': 'hsl(15, 85%, 55%)',      // Hot Orange
    'NFT Mint': 'hsl(55, 90%, 55%)',        // Yellow
    'Contract Call': 'hsl(340, 85%, 55%)',  // Neon Pink
    'Staking': 'hsl(340, 85%, 55%)',
    'default': 'hsl(340, 85%, 55%)'
  },
  meadow: {
    'Plain Transfer': 'hsl(160, 60%, 50%)', // Mint Green
    'Token Swap': 'hsl(135, 70%, 40%)',     // Emerald
    'NFT Mint': 'hsl(95, 50%, 50%)',        // Sage
    'Contract Call': 'hsl(120, 30%, 30%)',  // Forest Green
    'Staking': 'hsl(120, 30%, 30%)',
    'default': 'hsl(135, 70%, 40%)'
  },
  monochrome: {
    'Plain Transfer': 'hsl(220, 75%, 45%)', // Classic Electric Blue
    'Token Swap': 'hsl(220, 75%, 45%)',
    'NFT Mint': 'hsl(220, 75%, 45%)',
    'Contract Call': 'hsl(220, 75%, 45%)',
    'Staking': 'hsl(220, 75%, 45%)',
    'default': 'hsl(220, 75%, 45%)'
  }
};

// Themes
const THEMES = {
  warmGray: {
    bg: '#c8c6c0',
    tileBg: '#bdbcba',
    accent: 'hsl(220, 75%, 45%)',
    text: '#222220',
    gridLine: 'rgba(34, 34, 32, 0.12)',
    accentLight: '#ffffff',
    graphNode: '#3b6fd4',
    graphText: '#222220'
  },
  charcoal: {
    bg: '#14140f',
    tileBg: '#1e1e19',
    accent: 'hsl(220, 80%, 55%)',
    text: '#e2e2da',
    gridLine: 'rgba(255, 255, 255, 0.08)',
    accentLight: '#ffffff',
    graphNode: '#3b6fd4',
    graphText: '#e2e2da'
  }
};
let currentTheme = 'warmGray';

// Audio Sonification Engine (Native Web Audio API)
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.profile = 'chimes'; // 'chimes', 'guitar', 'drums', 'pad'
    this.ambientProfile = 'hum'; // 'none', 'hum', 'crackle'
    // Pentatonic scale to guarantee nice harmony: C4, D4, E4, G4, A4, C5
    this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    
    // Ambient sound source references
    this.ambientSource = null;
    this.ambientGain = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime); // Volume at 0.35 for full presence
    this.masterGain.connect(this.ctx.destination);
    this.updateAmbient();
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.muted = !this.muted;
    this.updateAmbient();
    return this.muted;
  }

  updateAmbientProfile(profile) {
    this.ambientProfile = profile;
    this.init();
    this.updateAmbient();
  }

  updateAmbient() {
    if (!this.ctx) return;
    this.stopAmbient();

    if (this.muted || this.ambientProfile === 'none') return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    if (this.ambientProfile === 'hum') {
      // 55Hz Low Hum (A1) oscillator
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, this.ctx.currentTime); // Sub octave overtone

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(120, this.ctx.currentTime);

      osc.connect(lp);
      osc2.connect(lp);
      lp.connect(this.ambientGain);

      osc.start();
      osc2.start();

      this.ambientSource = [osc, osc2];
      this.ambientGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 1.5);
    } else if (this.ambientProfile === 'crackle') {
      // Procedural White Noise Vinyl Crackle Simulation
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds loop
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        // High frequency static hiss
        let hiss = (Math.random() * 2 - 1) * 0.003;
        // Pop impulses
        let pop = 0;
        if (Math.random() < 0.00015) {
          pop = (Math.random() * 2 - 1) * 0.35;
        }
        data[i] = hiss + pop;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;
      noiseNode.loop = true;

      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1000, this.ctx.currentTime);

      noiseNode.connect(hp);
      hp.connect(this.ambientGain);
      noiseNode.start();

      this.ambientSource = noiseNode;
      this.ambientGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.0);
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      if (Array.isArray(this.ambientSource)) {
        this.ambientSource.forEach(src => {
          try { src.stop(); } catch(e) {}
        });
      } else {
        try { this.ambientSource.stop(); } catch(e) {}
      }
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      try { this.ambientGain.disconnect(); } catch(e) {}
      this.ambientGain = null;
    }
  }

  playBlockTones(block) {
    if (this.muted || !this.ctx) return;

    const hashVal = parseInt(block.hash.substring(8, 12), 16);
    const noteFreq = this.scale[hashVal % this.scale.length];
    const now = this.ctx.currentTime;

    if (this.profile === 'guitar') {
      // 1. Karplus-Strong style plucked string: noise burst fed through a delay + lowpass loop
      // We approximate this with a short noise burst shaped through a resonant filter
      const sampleRate = this.ctx.sampleRate;
      const period = Math.round(sampleRate / noteFreq);
      const bufLen = sampleRate * 2; // 2 second buffer
      const ksBuf = this.ctx.createBuffer(1, bufLen, sampleRate);
      const ksData = ksBuf.getChannelData(0);

      // Seed: random noise for one period (the pluck excitation)
      for (let i = 0; i < period; i++) {
        ksData[i] = Math.random() * 2 - 1;
      }
      // Karplus-Strong: average of consecutive samples (simple lowpass feedback)
      for (let i = period; i < bufLen; i++) {
        ksData[i] = 0.5 * (ksData[i - period] + ksData[i - period + 1]) * 0.996;
      }

      const ksSource = this.ctx.createBufferSource();
      ksSource.buffer = ksBuf;

      // Warm body resonance: slight highpass to remove DC drift
      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = 'highpass';
      bodyFilter.frequency.setValueAtTime(80, now);

      // Brightness filter to control attack click
      const brillFilter = this.ctx.createBiquadFilter();
      brillFilter.type = 'lowpass';
      brillFilter.frequency.setValueAtTime(3200, now);
      brillFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.06);

      const ksGain = this.ctx.createGain();
      ksGain.gain.setValueAtTime(0.65, now);
      ksGain.gain.setValueAtTime(0.65, now + 0.8);
      ksGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      ksSource.connect(bodyFilter);
      bodyFilter.connect(brillFilter);
      brillFilter.connect(ksGain);
      ksGain.connect(this.masterGain);
      ksSource.start(now);
      ksSource.stop(now + 1.9);

    } else if (this.profile === 'drums') {
      // 2. Electronic 808-style drum machine: deep kick + snare + hi-hat
      // --- Deep 808 Kick ---
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(180, now);
      kickOsc.frequency.exponentialRampToValueAtTime(48, now + 0.06);
      kickGain.gain.setValueAtTime(0.9, now);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.5);

      // --- Snare (half-beat offset) ---
      const snareTime = now + (block.whale_flag === 1 ? 0.0 : 0.25);
      const snareNoiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.18, this.ctx.sampleRate);
      const snareData = snareNoiseBuf.getChannelData(0);
      for (let i = 0; i < snareData.length; i++) snareData[i] = Math.random() * 2 - 1;
      const snareNoise = this.ctx.createBufferSource();
      snareNoise.buffer = snareNoiseBuf;
      const snareFilter = this.ctx.createBiquadFilter();
      snareFilter.type = 'bandpass';
      snareFilter.frequency.setValueAtTime(2200, snareTime);
      snareFilter.Q.setValueAtTime(0.8, snareTime);
      const snareGain = this.ctx.createGain();
      snareGain.gain.setValueAtTime(0.55, snareTime);
      snareGain.gain.exponentialRampToValueAtTime(0.0001, snareTime + 0.18);
      // Snare tonal component
      const snareToneOsc = this.ctx.createOscillator();
      const snareToneGain = this.ctx.createGain();
      snareToneOsc.type = 'triangle';
      snareToneOsc.frequency.setValueAtTime(220, snareTime);
      snareToneGain.gain.setValueAtTime(0.3, snareTime);
      snareToneGain.gain.exponentialRampToValueAtTime(0.0001, snareTime + 0.1);
      snareNoise.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(this.masterGain);
      snareToneOsc.connect(snareToneGain);
      snareToneGain.connect(this.masterGain);
      snareNoise.start(snareTime);
      snareNoise.stop(snareTime + 0.2);
      snareToneOsc.start(snareTime);
      snareToneOsc.stop(snareTime + 0.15);

      // --- Hi-Hat (tight crisp click) ---
      const hatTime = now + 0.12;
      const hatBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
      const hatData = hatBuf.getChannelData(0);
      for (let i = 0; i < hatData.length; i++) hatData[i] = Math.random() * 2 - 1;
      const hat = this.ctx.createBufferSource();
      hat.buffer = hatBuf;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(7000, hatTime);
      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.3, hatTime);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, hatTime + 0.04);
      hat.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.masterGain);
      hat.start(hatTime);
      hat.stop(hatTime + 0.05);

    } else if (this.profile === 'pad') {
      // 3. Ambient Synth Pad — lush detuned chords with slow attack
      const noteFreqs = [noteFreq * 0.5, noteFreq, noteFreq * 1.25, noteFreq * 1.5]; // Bass + Root, Maj3rd, 5th
      noteFreqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const detOsc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        const padFilter = this.ctx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        detOsc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        detOsc.frequency.setValueAtTime(freq * 1.006, now); // slight detune for chorus effect
        
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(600, now);
        padFilter.frequency.linearRampToValueAtTime(1800, now + 0.3);
        padFilter.frequency.exponentialRampToValueAtTime(500, now + 1.6);
        padFilter.Q.setValueAtTime(1.5, now);
        
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(idx === 0 ? 0.08 : 0.11, now + 0.25); // Slow lush attack
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8); // Long airy release
        
        osc.connect(padFilter);
        detOsc.connect(padFilter);
        padFilter.connect(oscGain);
        oscGain.connect(this.masterGain);
        
        osc.start(now);
        detOsc.start(now);
        osc.stop(now + 2.0);
        detOsc.stop(now + 2.0);
      });

    } else {
      // Default: 4. Crystal Chimes — pure tones with echoing overtone
      const playChime = (freq, delay, gainAmt, dur) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2000, now + delay);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + delay);
        g.gain.setValueAtTime(0, now + delay);
        g.gain.linearRampToValueAtTime(gainAmt, now + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        o.connect(lp);
        lp.connect(g);
        g.connect(this.masterGain);
        o.start(now + delay);
        o.stop(now + delay + dur + 0.05);
      };

      // Fundamental + octave + fifth — bell-like triad
      playChime(noteFreq, 0, 0.35, 0.8);
      playChime(noteFreq * 2, 0.01, 0.18, 0.6);
      playChime(noteFreq * 1.5, 0.02, 0.10, 0.5);
      // Soft echo repeat
      playChime(noteFreq, 0.18, 0.12, 0.5);

      if (block.whale_flag === 1) {
        // Deep resonant sub-bass gong hit for whale transactions
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(65.41, now);
        subOsc.frequency.linearRampToValueAtTime(55, now + 0.4);
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.75, now + 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(now);
        subOsc.stop(now + 2.4);
      }
    }
  }
}
const audio = new AudioEngine();

// DOM elements
const detailsSidebar = document.getElementById('details-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const canvasContainer = document.getElementById('canvas-container');

const popBlockNum = document.getElementById('pop-block-num');
const popMood = document.getElementById('pop-mood');
const popAmountUsd = document.getElementById('pop-amount-usd');
const popTime = document.getElementById('pop-time');
const popFeePaid = document.getElementById('pop-fee-paid');
const popDirection = document.getElementById('pop-direction');
const popTxCount = document.getElementById('pop-tx-count');
const popHash = document.getElementById('pop-hash');
const popCopyHashBtn = document.getElementById('pop-copy-hash');
const popExplorerLink = document.getElementById('pop-explorer-link');

const popStatus = document.getElementById('pop-status');
const popFrom = document.getElementById('pop-from');
const popTo = document.getElementById('pop-to');

const popTraderType = document.getElementById('pop-trader-type');
const popTraderAsset = document.getElementById('pop-trader-asset');
const popTraderGas = document.getElementById('pop-trader-gas');
const popTraderValueUsd = document.getElementById('pop-trader-value-usd');

const popAnalystCluster = document.getElementById('pop-analyst-cluster');
const popAnalystLabel = document.getElementById('pop-analyst-label');
const popAnalystAnomaly = document.getElementById('pop-analyst-anomaly');
const popAnalystFirstSeen = document.getElementById('pop-analyst-first-seen');

const latestBlockVal = document.getElementById('latest-block-val');
const avgFeeVal = document.getElementById('avg-fee-val');
const gridFillVal = document.getElementById('grid-fill-val');

const trackAddressInput = document.getElementById('track-address-input');
const clearTrackBtn = document.getElementById('clear-track-btn');

// Trend Analyzer Elements
const trendDominantVal = document.getElementById('trend-dominant-val');
const trendGasVal = document.getElementById('trend-gas-val');
const ratioBarTransfers = document.querySelector('#trend-ratio-bar .transfers');
const ratioBarSwaps = document.querySelector('#trend-ratio-bar .swaps');
const ratioBarMints = document.querySelector('#trend-ratio-bar .mints');

// Archive & Historical Banner elements
const archiveToggleBtn = document.getElementById('archive-toggle-btn');
const archiveDrawer = document.getElementById('archive-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const calendarDaysGrid = document.getElementById('calendar-days-grid');
const historicalBanner = document.getElementById('historical-banner');
const historicalDateLabel = document.getElementById('historical-date-label');
const returnLiveBtn = document.getElementById('return-live-btn');
const liveIndicator = document.getElementById('live-indicator');
const modeStatusText = document.getElementById('mode-status-text');
const statsBlockLabel = document.getElementById('stats-block-label');
const statsFillLabel = document.getElementById('stats-fill-label');
const hoverTooltip = document.getElementById('hover-tooltip');
const paletteSelect = document.getElementById('palette-select');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const legendContainer = document.getElementById('legend-container');
const soundProfileSelect = document.getElementById('sound-profile-select');
let themeToggleBtn = null;

// Art Focus Mode elements
const artModeBtn = document.getElementById('art-mode-btn');
const exitFocusBtn = document.getElementById('exit-focus-btn');

// Guide / How it Works overlay
const guideOverlay = document.getElementById('guide-overlay');
const guideOpenBtn = document.getElementById('guide-open-btn');
const guideCloseBtn = document.getElementById('guide-close-btn');

function openGuide() {
  if (!guideOverlay) return;
  // Close other panels first
  if (archiveDrawer) archiveDrawer.classList.remove('open');
  if (detailsSidebar) { detailsSidebar.classList.remove('open'); canvasContainer.classList.remove('sidebar-open'); }
  guideOverlay.classList.add('open');
  document.body.classList.add('guide-open');
}

function closeGuide() {
  if (!guideOverlay) return;
  guideOverlay.classList.remove('open');
  document.body.classList.remove('guide-open');
}

if (guideOpenBtn) guideOpenBtn.addEventListener('click', () => { lastInteractionTime = Date.now(); openGuide(); });
if (guideCloseBtn) guideCloseBtn.addEventListener('click', () => { lastInteractionTime = Date.now(); closeGuide(); });

// Close guide if clicking the backdrop
if (guideOverlay) {
  guideOverlay.addEventListener('click', (e) => {
    if (e.target === guideOverlay) closeGuide();
  });
}

// Multi-Chain & Export selectors
const chainSelect = document.getElementById('chain-select');
const exportSvgBtn = document.getElementById('export-svg-btn');

// Temporal Playback Elements
const playbackControls = document.getElementById('playback-controls');
const playbackPlayBtn = document.getElementById('playback-play-btn');
const playbackSlider = document.getElementById('playback-slider');
const playbackCounter = document.getElementById('playback-counter');

// Temporal Playback State
let playbackFullList = [];
let playbackIndex = 0;
let playbackIntervalId = null;
let isPlayingPlayback = false;

// Audio toggling
if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {
    const isMuted = audio.toggle();
    soundToggleBtn.innerHTML = isMuted
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>Sound: Off`
      : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>Sound: On`;
    soundToggleBtn.classList.toggle('active', !isMuted);
    lastInteractionTime = Date.now();
  });
}


// Audio profile listener
if (soundProfileSelect) {
  soundProfileSelect.addEventListener('change', (e) => {
    audio.profile = e.target.value;
    lastInteractionTime = Date.now();
  });
}

const ambientProfileSelect = document.getElementById('ambient-profile-select');
if (ambientProfileSelect) {
  ambientProfileSelect.addEventListener('change', (e) => {
    audio.updateAmbientProfile(e.target.value);
    lastInteractionTime = Date.now();
  });
}

// Close sidebar event listener
if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener('click', () => {
    detailsSidebar.classList.remove('open');
    canvasContainer.classList.remove('sidebar-open');
    activePopoverBlock = null;
    setTimeout(resizeCanvas, 420);
  });
}



if (artModeBtn) {
  artModeBtn.addEventListener('click', () => {
    lastInteractionTime = Date.now();
    enterFocusMode();
  });
}

if (exitFocusBtn) {
  exitFocusBtn.addEventListener('click', () => {
    lastInteractionTime = Date.now();
    exitFocusMode();
  });
}

window.addEventListener('keydown', (e) => {
  // Ignore if user is typing in an input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'Escape') {
    if (document.body.classList.contains('focus-mode')) exitFocusMode();
    if (guideOverlay && guideOverlay.classList.contains('open')) closeGuide();
  }
  if (e.key === 'f' || e.key === 'F') {
    lastInteractionTime = Date.now();
    if (document.body.classList.contains('focus-mode')) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }
  if (e.key === '?') {
    lastInteractionTime = Date.now();
    if (guideOverlay && guideOverlay.classList.contains('open')) {
      closeGuide();
    } else {
      openGuide();
    }
  }
});


// Dynamically align Trend Progress Bar colors with the active Art Palette
function updateRatioBarColors() {
  const theme = THEMES[currentTheme];
  const palette = PALETTES[currentPalette];
  
  if (currentPalette === 'monochrome') {
    if (ratioBarTransfers) ratioBarTransfers.style.backgroundColor = theme.accent;
    if (ratioBarSwaps) ratioBarSwaps.style.backgroundColor = theme.accent;
    if (ratioBarMints) ratioBarMints.style.backgroundColor = theme.accent.replace(')', ', 0.65)').replace('hsl', 'hsla');
  } else {
    if (ratioBarTransfers) ratioBarTransfers.style.backgroundColor = palette['Plain Transfer'];
    if (ratioBarSwaps) ratioBarSwaps.style.backgroundColor = palette['Token Swap'];
    if (ratioBarMints) ratioBarMints.style.backgroundColor = palette['NFT Mint'];
  }
  updateLegend();
}

// Dynamic Legend Color updates matching selected Art Palette
function updateLegend() {
  const theme = THEMES[currentTheme];
  const palette = PALETTES[currentPalette];
  
  if (!legendContainer) return;
  
  if (currentPalette === 'monochrome') {
    legendContainer.innerHTML = `
      <span class="legend-item"><span class="color-dot" style="background-color: ${theme.accent.replace(')', ', 0.25)').replace('hsl', 'hsla')}; border: 1px solid var(--border-color);"></span> Low Fees</span>
      <span class="legend-item"><span class="color-dot" style="background-color: ${theme.accent};"></span> High Fees</span>
      <span class="legend-item"><span class="color-dot" style="background-color: #ffffff; box-shadow: 0 0 6px #ffffff;"></span> Whale Transaction</span>
      <span class="legend-item"><span class="color-dot" style="background-color: transparent; border: 2px solid rgba(0, 229, 255, 0.85);"></span> Tracked Wallet</span>
    `;
  } else {
    legendContainer.innerHTML = `
      <span class="legend-item"><span class="color-dot" style="background-color: ${palette['Plain Transfer']};"></span> Direct Payments</span>
      <span class="legend-item"><span class="color-dot" style="background-color: ${palette['Token Swap']};"></span> Trading Coins</span>
      <span class="legend-item"><span class="color-dot" style="background-color: ${palette['NFT Mint']};"></span> Digital Art</span>
      <span class="legend-item"><span class="color-dot" style="background-color: #ffffff; box-shadow: 0 0 6px #ffffff;"></span> Whale Transaction</span>
      <span class="legend-item"><span class="color-dot" style="background-color: transparent; border: 2px solid rgba(0, 229, 255, 0.85);"></span> Tracked Wallet</span>
    `;
  }
}

// Palette Change listener
if (paletteSelect) {
  paletteSelect.addEventListener('change', (e) => {
    currentPalette = e.target.value;
    lastInteractionTime = Date.now();
    updateRatioBarColors();
  });
}

// Add theme toggle button
const header = document.querySelector('.app-header');
themeToggleBtn = document.createElement('button');
themeToggleBtn.id = 'theme-toggle-btn';
themeToggleBtn.textContent = 'Toggle Charcoal Theme';
header.appendChild(themeToggleBtn);

themeToggleBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'warmGray' ? 'charcoal' : 'warmGray';
  themeToggleBtn.textContent = currentTheme === 'warmGray' ? 'Toggle Charcoal Theme' : 'Toggle Warm Gray Theme';
  document.body.className = currentTheme + '-theme';
  applyThemeStyles();
  updateRatioBarColors();
  updateLegend();
});

function applyThemeStyles() {
  const theme = THEMES[currentTheme];
  document.body.style.backgroundColor = theme.bg;
  document.body.style.color = theme.text;
  
  document.querySelectorAll('.stat-item .value').forEach(el => {
    if (el.id !== 'trend-gas-val') {
      el.style.color = theme.text;
    }
  });
  document.querySelector('.brand h1').style.color = theme.text;
}

// Tab handlers (Overhauled for Overview & Flow Graph only)
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    lastInteractionTime = Date.now();
    const tabName = btn.getAttribute('data-tab');
    
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    const pane = document.getElementById(`pane-${tabName}`);
    if (pane) pane.classList.add('active');

    if (tabName === 'analyst' && activePopoverBlock) {
      setTimeout(() => renderNetworkGraph(activePopoverBlock), 50);
    }
  });
});

// Wallet Tracker handlers
trackAddressInput.addEventListener('input', (e) => {
  lastInteractionTime = Date.now();
  trackedAddress = e.target.value.trim().toLowerCase();
  
  if (trackedAddress.length > 0) {
    clearTrackBtn.style.display = 'inline-block';
  } else {
    clearTrackBtn.style.display = 'none';
  }
});

clearTrackBtn.addEventListener('click', () => {
  lastInteractionTime = Date.now();
  trackAddressInput.value = '';
  trackedAddress = '';
  clearTrackBtn.style.display = 'none';
});

// Deterministic Pseudo-Random Generator
function seedRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Deterministic Transaction Generator
function getBlockTransactions(block) {
  const hash = block.hash.replace('0x', '');
  const txs = [];
  const count = Math.min(6, Math.max(3, block.tx_count % 8));

  const assets = ['ETH', 'USDC', 'USDT', 'Pepe', 'LINK', 'UNI'];
  const types = ['Plain Transfer', 'Token Swap', 'NFT Mint', 'Staking', 'Contract Call'];
  const labels = ['Flagged Wallet', 'Binance Hot Wallet', 'Uniswap Pool', 'MEV Bot', 'Private User'];

  if (trackedAddress && trackedAddress.length > 0) {
    const isMatched = block.block_number % 4 === 0;
    if (isMatched) {
      const isSent = block.block_number % 8 === 0;
      txs.push({
        from: isSent ? trackedAddress : '0x71c9595e6f36ff8b813b2c6b4716766465cba279',
        to: isSent ? '0x17c91836173a11b813b2c62c4716766465cba279' : trackedAddress,
        valueEth: 1.85,
        valueUsd: 3330.00,
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
    const seedVal = parseInt(hash.substring(i * 4, (i * 4) + 4), 16);
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

  return txs;
}

// Planned Daily Portrait Categories Mappings
function getDailyMaskAlignment(col, row, category) {
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
    case 'wave':
      const targetRow = cy + Math.round(Math.sin((col / cols) * Math.PI * 2) * (rows * 0.25));
      return Math.abs(row - targetRow) < 2;
    case 'zen':
      const dist = Math.sqrt(dx * dx + dy * dy);
      return Math.round(dist) % 4 === 0 || Math.round(dist) % 4 === 1;
  }
  return false;
}

function getCategoryForDay(dayNum) {
  const categories = {
    1: 'zen',
    2: 'wave',
    3: 'shield',
    4: 'diamond',
    5: 'dragon',
    6: 'wave'
  };
  return categories[dayNum] || 'diamond';
}

function getCategoryLabel(category) {
  const labels = {
    zen: 'The Zen Garden (Calm)',
    wave: 'The Wave (DeFi Swaps)',
    shield: 'The Shield (Whale Movements)',
    diamond: 'The Ethereum Diamond (Harmony)',
    dragon: 'The Dragon (Gas Spike)'
  };
  return labels[category] || 'Historical Day';
}

// Generate deterministic historical blocks matching layout templates
function generateMockHistoryForDate(dateString) {
  const rand = seedRandom(dateString);
  const mockBlocks = [];
  let blockNum = 25000000 + (parseInt(dateString.replace(/-/g, '')) % 1000000);
  let timestamp = Math.floor(new Date(dateString).getTime() / 1000);

  const category = getCategoryForDay(historicalDayNumber);

  for (let index = 0; index < maxTiles; index++) {
    blockNum++;
    timestamp += 12;

    const col = index % cols;
    const row = Math.floor(index / cols);

    const isOnTemplate = getDailyMaskAlignment(col, row, category);

    const baseFee = isOnTemplate ? 35 + (rand() * 20) : 5 + (rand() * 8);
    const txCount = isOnTemplate ? 180 + Math.floor(rand() * 80) : 10 + Math.floor(rand() * 30);
    const contractRatio = isOnTemplate ? 0.4 + (rand() * 0.3) : 0.05 + (rand() * 0.1);
    const whaleFlag = isOnTemplate && rand() < 0.15 ? 1 : 0;
    const largestTxUsd = whaleFlag ? 65000 + (rand() * 150000) : 100 + (rand() * 4000);

    const minFee = 10, maxFee = 100;
    const minHue = 230, maxHue = 15;
    const hue = baseFee <= minFee ? minHue : (baseFee >= maxFee ? maxHue : Math.round(minHue + ((baseFee - minFee) / (maxFee - minFee)) * (maxHue - minHue)));

    const minTx = 0, maxTx = 300;
    const minSat = 40, maxSat = 100;
    const saturation = txCount <= minTx ? minSat : (txCount >= maxTx ? maxSat : Math.round(minSat + ((txCount - minTx) / (maxTx - minTx)) * (maxSat - minSat)));

    let hash = '0x';
    const hexChars = '0123456789abcdef';
    for (let h = 0; h < 64; h++) {
      hash += hexChars[Math.floor(rand() * 16)];
    }

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
      complexity: contractRatio
    });
  }

  return mockBlocks;
}

// Simulated chain block generator
function generateSimulatedBlock() {
  if (currentMode !== 'LIVE') return;
  
  let blockNum = blocks.length > 0 ? blocks[blocks.length - 1].block_number + 1 : 42000000;
  let timestamp = Math.floor(Date.now() / 1000);
  
  let baseFee = 0.01;
  let txCount = 50;
  let contractRatio = 0.2;
  
  if (currentChain === 'base') {
    baseFee = 0.001 + Math.random() * 0.005;
    txCount = 30 + Math.floor(Math.random() * 120);
    contractRatio = 0.3 + Math.random() * 0.3;
  } else if (currentChain === 'arbitrum') {
    baseFee = 0.05 + Math.random() * 0.1;
    txCount = 50 + Math.floor(Math.random() * 180);
    contractRatio = 0.4 + Math.random() * 0.4;
  } else if (currentChain === 'solana') {
    baseFee = 0.00005 + Math.random() * 0.0001;
    txCount = 1200 + Math.floor(Math.random() * 1000);
    contractRatio = 0.8 + Math.random() * 0.15;
  }
  
  const minFee = 0.0001, maxFee = 0.2;
  const minHue = 230, maxHue = 15;
  const hue = baseFee <= minFee ? minHue : (baseFee >= maxFee ? maxHue : Math.round(minHue + ((baseFee - minFee) / (maxFee - minFee)) * (maxHue - minHue)));

  const minTx = 0, maxTx = 2200;
  const minSat = 40, maxSat = 100;
  const saturation = txCount <= minTx ? minSat : (txCount >= maxTx ? maxSat : Math.round(minSat + ((txCount - minTx) / (maxTx - minTx)) * (maxSat - minSat)));
  
  const whaleFlag = Math.random() < (currentChain === 'solana' ? 0.02 : 0.08) ? 1 : 0;
  const largestTxUsd = whaleFlag ? 50000 + Math.random() * 200000 : 20 + Math.random() * 2000;
  
  let hash = '0x';
  const hexChars = '0123456789abcdef';
  for (let h = 0; h < 64; h++) {
    hash += hexChars[Math.floor(Math.random() * 16)];
  }
  
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
  
  incomingBlockNum = blockNum;
  incomingBlockStartTime = Date.now();
  blocks.push(newBlock); if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);
  
  let currentCapacity = cols * rows;
  if (blocks.length > currentCapacity) {
    if (tileSize === 64) {
      tileSize = 48;
      resizeCanvas();
    } else if (tileSize === 48) {
      tileSize = 32;
      resizeCanvas();
    } else if (tileSize === 32) {
      tileSize = 24;
      resizeCanvas();
    } else if (tileSize === 24) {
      tileSize = 16;
      resizeCanvas();
    } else {
      blocks.shift();
    }
  }
  
  audio.playBlockTones(newBlock);
  updateStats();

  // Trigger simulated block animation ripple wave
  if (blocks.length > 0 && typeof gsap !== 'undefined') {
    const lastIdx = blocks.length - 1;
    rippleOriginCol = lastIdx % cols;
    rippleOriginRow = Math.floor(lastIdx / cols);
    rippleProgress.value = 0;
    
    gsap.killTweensOf(rippleProgress);
    gsap.to(rippleProgress, {
      value: 1.0,
      duration: 1.4,
      ease: 'power1.out',
      onComplete: () => {
        rippleOriginCol = -1;
        rippleOriginRow = -1;
        rippleProgress.value = 0;
      }
    });
  }
}

// Chain Select dropdown handler
if (chainSelect) {
  chainSelect.addEventListener('change', (e) => {
    currentChain = e.target.value;
    lastInteractionTime = Date.now();
    
    if (chainIntervalId) {
      clearInterval(chainIntervalId);
      chainIntervalId = null;
    }
    
    blocks = [];
    tileSize = 64;
    resizeCanvas();
    
    if (currentChain === 'ethereum') {
      switchToLive();
    } else {
      let cadence = 2000;
      if (currentChain === 'arbitrum') cadence = 500;
      else if (currentChain === 'solana') cadence = 400;
      
      chainIntervalId = setInterval(generateSimulatedBlock, cadence);
      generateSimulatedBlock();
    }
  });
}

// SVG Exporter
function exportSVG() {
  const theme = THEMES[currentTheme];
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}">\n`;
  svgContent += `  <rect width="100%" height="100%" fill="${theme.bg}"/>\n`;
  
  const category = currentMode === 'HISTORICAL' ? getCategoryForDay(historicalDayNumber) : null;
  
  blocks.forEach((block, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * tileSize;
    const y = row * tileSize;
    const size = tileSize - gutter;
    
    const isOnTemplate = currentMode === 'HISTORICAL' ? getDailyMaskAlignment(col, row, category) : true;
    const tileBg = isOnTemplate ? theme.tileBg : theme.bg;
    
    svgContent += `  <!-- Block #${block.block_number} -->\n`;
    svgContent += `  <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${tileBg}" rx="3"/>\n`;
    
    const density = Math.max(0.1, Math.min(0.85, block.tx_count / 300));
    const targetOnCount = Math.max(6, Math.floor(density * 64));
    const regularity = 1.0 - block.contract_ratio;
    const activeCells = getSubpixelLayout(block.hash, targetOnCount, regularity);
    
    const prevBlock = index > 0 ? blocks[index - 1] : null;
    const blockInterval = prevBlock ? Math.max(1, block.timestamp - prevBlock.timestamp) : 12;
    const edgeFadeFactor = Math.max(0, Math.min(0.75, (blockInterval - 8) / 16));
    const subSize = size / 8;
    
    const whaleIndex1 = parseInt(block.hash.replace('0x','').substring(0, 2), 16) % targetOnCount;
    const whaleIndex2 = parseInt(block.hash.replace('0x','').substring(2, 4), 16) % targetOnCount;
    
    const txs = getBlockTransactions(block);
    
    activeCells.forEach((cell, idx) => {
      const dx = cell.col - 3.5;
      const dy = cell.row - 3.5;
      const dist = Math.sqrt(dx * dx + dy * dy) / 4.95;
      
      const maskModifier = isOnTemplate ? 1.0 : 0.15;
      const finalOpacity = Math.max(0.05, 1 - dist * edgeFadeFactor) * maskModifier;
      
      const tx = txs[idx % txs.length] || { type: 'Plain Transfer' };
      let baseColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
      if (currentPalette === 'monochrome') {
        baseColor = theme.accent;
      }
      
      let color = baseColor;
      if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
        color = '#ffffff';
      }
      
      const finalColor = color.includes('hsl') && !color.includes('hsla') ? color.replace('hsl', 'hsla').replace(')', `, ${finalOpacity.toFixed(2)})`) : color;
      
      const px = x + cell.col * subSize + 0.5;
      const py = y + cell.row * subSize + 0.5;
      const pSize = subSize - 1;
      
      svgContent += `  <rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pSize.toFixed(1)}" height="${pSize.toFixed(1)}" fill="${finalColor}"/>\n`;
    });
  });
  
  svgContent += `</svg>`;
  
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const filename = currentMode === 'LIVE' ? `blockchain-live-${Date.now()}.svg` : `blockchain-portrait-${selectedHistoricalDate.replace(/ /g, '-')}.svg`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

if (exportSvgBtn) {
  exportSvgBtn.addEventListener('click', () => {
    lastInteractionTime = Date.now();
    exportSVG();
  });
}

// Animation Sizing
function resizeCanvas() {
  const container = canvas.parentElement;
  const width = container.clientWidth || window.innerWidth - 60;
  const height = container.clientHeight || window.innerHeight - 160;
  
  canvas.width = width;
  canvas.height = height;

  cols = Math.max(12, Math.floor(width / tileSize));
  rows = Math.max(8, Math.floor(height / tileSize));
  maxTiles = cols * rows;

  if (currentMode === 'HISTORICAL' && selectedHistoricalDate) {
    playbackFullList = generateMockHistoryForDate(selectedHistoricalDate);
    playbackSlider.max = playbackFullList.length;
    if (!isPlayingPlayback) {
      blocks = playbackFullList.slice(0, playbackIndex);
    }
  }

  updateStats();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
document.body.className = currentTheme + '-theme';
applyThemeStyles();

// Draw Loop
function draw(timestamp) {

  if (currentMode === 'ART_SYNTHESIS') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    
    const totalTransactions = blocks.reduce((sum, b) => sum + getBlockTransactions(b).length, 0);
    if (totalTransactions === 0) {
       requestAnimationFrame(draw);
       return;
    }
    
    const aspect = canvas.width / canvas.height;
    const rows = Math.ceil(Math.sqrt(totalTransactions / aspect));
    const cols = Math.ceil(totalTransactions / rows);
    
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    
    let i = 0;
    
    ctx.save();
    ctx.filter = 'saturate(200%) blur(4px) contrast(150%) brightness(0.9)';
    
    blocks.forEach(block => {
      const txs = getBlockTransactions(block);
      txs.forEach(tx => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        
        const x = c * cellW;
        const y = r * cellH;
        
        let baseColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(x - 4, y - 4, cellW + 8, cellH + 8); // generous overlap to bleed
        
        i++;
      });
    });
    
    ctx.restore();
    
    // Draw a luxurious overlay frame
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    requestAnimationFrame(draw);
    return; // Skip normal grid drawing
  }

  const theme = THEMES[currentTheme];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (blocks.length === 0 && currentMode === 'LIVE') {
    ctx.fillStyle = theme.tileBg;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        ctx.fillRect(c * tileSize, r * tileSize, tileSize - gutter, tileSize - gutter);
        ctx.fillStyle = theme.text === '#222220' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)';
        ctx.strokeStyle = theme.gridLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(c * tileSize, r * tileSize, tileSize - gutter, tileSize - gutter);
      }
    }

    ctx.fillStyle = theme.text;
    ctx.font = '500 13px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CONNECTING TO BLOCKCHAIN RELAY...', canvas.width / 2, canvas.height / 2);
    
    requestAnimationFrame(draw);
    return;
  }

  const category = currentMode === 'HISTORICAL' ? getCategoryForDay(historicalDayNumber) : null;

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * tileSize;
    const y = row * tileSize;

    const prevBlock = index > 0 ? blocks[index - 1] : null;
    const blockInterval = prevBlock ? Math.max(1, block.timestamp - prevBlock.timestamp) : 12;

    let progress = 1.0;
    if (currentMode === 'LIVE' && block.block_number === incomingBlockNum) {
      const elapsed = Date.now() - incomingBlockStartTime;
      progress = Math.min(elapsed / PAINT_DURATION, 1.0);
    }

    const phaseShift = (col + row) * 0.15;
    const tileShimmer = Math.sin(Date.now() / 1800 + phaseShift) * 0.03 + 0.97;

    let isTracked = false;
    let trackDirection = 'none';
    if (trackedAddress && trackedAddress.length > 0) {
      const txs = getBlockTransactions(block);
      const match = txs.find(tx => tx.from.includes(trackedAddress) || tx.to.includes(trackedAddress));
      if (match) {
        isTracked = true;
        trackDirection = match.from.includes(trackedAddress) ? 'sent' : 'received';
      }
    }

    const isOnTemplate = currentMode === 'HISTORICAL' ? getDailyMaskAlignment(col, row, category) : true;

    // 1. Organic Spatial Drift (Sine Wave based floating offset)
    let floatX = 0;
    let floatY = 0;
    if (focusFloatProgress.value > 0) {
      const timeFactor = Date.now() * 0.0012;
      floatX = Math.sin(timeFactor + col * 0.5 + row * 0.3) * 8 * focusFloatProgress.value;
      floatY = Math.cos(timeFactor + col * 0.3 + row * 0.5) * 8 * focusFloatProgress.value;
    }

    // 2. Click Radial Wave Ripple Effect calculation
    let rippleAlphaModifier = 1.0;
    if (rippleOriginCol !== -1 && rippleProgress.value > 0 && rippleProgress.value < 1.0) {
      const dist = Math.sqrt(Math.pow(col - rippleOriginCol, 2) + Math.pow(row - rippleOriginRow, 2));
      const targetRadius = rippleProgress.value * Math.max(cols, rows) * 1.5;
      
      // Ripple width span
      const width = 2.5;
      if (Math.abs(dist - targetRadius) < width) {
        const factor = 1.0 - (Math.abs(dist - targetRadius) / width);
        // Peak flash boost
        rippleAlphaModifier = 1.0 + factor * 1.5;
      }
    }

    drawTile(ctx, x + floatX, y + floatY, tileSize - gutter, block, blockInterval, progress * tileShimmer * rippleAlphaModifier, theme, isTracked, trackDirection, isOnTemplate);
  }

  if (hoveredBlock) {
    const idx = blocks.indexOf(hoveredBlock);
    if (idx !== -1) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * tileSize;
      const y = row * tileSize;
      const size = tileSize - gutter;
      
      ctx.save();
      // Crisp outer border only
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, size, size);
      ctx.restore();
    }
  }

  if (detailsSidebar && detailsSidebar.classList.contains('open') && Date.now() - lastInteractionTime > DISMISS_TIMEOUT) {
    detailsSidebar.classList.remove('open');
    canvasContainer.classList.remove('sidebar-open');
    activePopoverBlock = null;
    setTimeout(resizeCanvas, 420);
  }

  requestAnimationFrame(draw);
}

// Generate sub-pixel grid dots deterministically
function getSubpixelLayout(hash, targetCount, regularity) {
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

function drawTile(ctx, x, y, size, block, blockInterval, alpha, theme, isTracked, trackDirection, isOnTemplate) {
  const hash = block.hash.replace('0x', '');
  
  ctx.fillStyle = isOnTemplate ? theme.tileBg : theme.bg;
  ctx.fillRect(x, y, size, size);

  const density = Math.max(0.1, Math.min(0.85, block.tx_count / 300));
  const targetOnCount = Math.max(6, Math.floor(density * 64));
  const regularity = 1.0 - block.contract_ratio;
  const activeCells = getSubpixelLayout(hash, targetOnCount, regularity);

  const edgeFadeFactor = Math.max(0, Math.min(0.75, (blockInterval - 8) / 16));
  const subSize = size / 8;

  const whaleIndex1 = parseInt(hash.substring(0, 2), 16) % targetOnCount;
  const whaleIndex2 = parseInt(hash.substring(2, 4), 16) % targetOnCount;

  const txs = getBlockTransactions(block);

  activeCells.forEach((cell, idx) => {
    const dx = cell.col - 3.5;
    const dy = cell.row - 3.5;
    const dist = Math.sqrt(dx * dx + dy * dy) / 4.95;
    
    const maskModifier = isOnTemplate ? 1.0 : 0.15;
    const finalOpacity = Math.max(0.05, 1 - dist * edgeFadeFactor) * alpha * maskModifier;

    const tx = txs[idx % txs.length] || { type: 'Plain Transfer' };
    let baseColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
    if (currentPalette === 'monochrome') {
      baseColor = theme.accent;
    }

    let isDimmed = false;
    let isFilteredMatch = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      if (tx.type !== clickedLegendFilter) isDimmed = true;
      else isFilteredMatch = true;
    }
    const isBlockHovered = (typeof hoveredBlock !== 'undefined' && block === hoveredBlock);
    
    if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
    } else {
      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.shadowBlur = 0;
        ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
      } else {
        const parsedColor = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 0;
        ctx.fillRect(x + cell.col * subSize + 1.5, y + cell.row * subSize + 1.5, subSize - 1, subSize - 1);

        ctx.fillStyle = parsedColor;
        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 16;
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
        } else {
          ctx.shadowBlur = 2;
          ctx.shadowColor = baseColor;
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
        }
      }
    }
    ctx.shadowBlur = 0;
  });

  if (isTracked) {
    ctx.strokeStyle = trackDirection === 'sent' ? 'rgba(255, 120, 0, 0.85)' : 'rgba(0, 229, 255, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  }
}

// Websocket sync
function connectRelay() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  let candidateUrls = [];
  if (isLocalHost) {
    const candidatePorts = [8080, 8086, 8087, 8088];
    candidateUrls = candidatePorts.map((port) => `${wsProtocol}//${window.location.hostname}:${port}`);
  } else if (window.location.hostname.endsWith('.onrender.com')) {
    candidateUrls = [`wss://blockchain-mosaic-relay.onrender.com`];
  } else {
    candidateUrls = [`wss://blockchain-mosaic-production.up.railway.app`];
  }

  let currentIndex = 0;
  let socket = null;

  function attemptNextConnection() {
    if (currentIndex >= candidateUrls.length) {
      if (currentMode === 'LIVE') {
        if (!window.simIntervalId) {
          window.simIntervalId = setInterval(generateSimulatedBlock, 12000);
          const capacity = cols * rows;
          for (let i = 0; i < capacity; i++) {
            blocks.push({
              block_number: 42000000 + i,
              timestamp: Math.floor(Date.now() / 1000) - ((capacity - i) * 12),
              hash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
              tx_count: 20 + Math.floor(Math.random() * 150),
              base_fee_gwei: 10 + Math.random() * 80,
              contract_ratio: Math.random(),
              whale_flag: Math.random() < 0.05 ? 1 : 0
            });
          }
          generateSimulatedBlock(); 
        }
      }
      setTimeout(connectRelay, 15000);
      return;
    }

    const wsUrl = candidateUrls[currentIndex];
    currentIndex += 1;
    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'history') {
            const liveBlocks = msg.data.slice(-maxTiles);
            if (currentMode === 'LIVE' && currentChain === 'ethereum') {
              blocks = liveBlocks;
              updateStats();
            } else {
              liveBlocksCache = liveBlocks;
            }
          } else if (msg.type === 'block') {
            const newBlock = msg.data;
            if (currentMode === 'LIVE' && currentChain === 'ethereum') {
              incomingBlockNum = newBlock.block_number;
              incomingBlockStartTime = Date.now();
              blocks.push(newBlock); if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);

              let currentCapacity = cols * rows;
              if (blocks.length > currentCapacity) {
                if (tileSize === 64) {
                  tileSize = 48;
                  resizeCanvas();
                } else if (tileSize === 48) {
                  tileSize = 32;
                  resizeCanvas();
                } else if (tileSize === 32) {
                  tileSize = 24;
                  resizeCanvas();
                } else if (tileSize === 24) {
                  tileSize = 16;
                  resizeCanvas();
                } else {
                  blocks.shift();
                }
              }
              audio.playBlockTones(newBlock);
              updateStats();

              // Trigger radial ripple wave on incoming new live block
              if (blocks.length > 0 && typeof gsap !== 'undefined') {
                const lastIdx = blocks.length - 1;
                rippleOriginCol = lastIdx % cols;
                rippleOriginRow = Math.floor(lastIdx / cols);
                rippleProgress.value = 0;

                gsap.killTweensOf(rippleProgress);
                gsap.to(rippleProgress, {
                  value: 1.0,
                  duration: 1.5,
                  ease: 'power1.out',
                  onComplete: () => {
                    rippleOriginCol = -1;
                    rippleOriginRow = -1;
                    rippleProgress.value = 0;
                  }
                });
              }
            } else {
              liveBlocksCache.push(newBlock);
              if (liveBlocksCache.length > maxTiles) {
                liveBlocksCache.shift();
              }
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        setTimeout(connectRelay, 5000);
      };
    });

    socket.addEventListener('error', () => {
      if (socket.readyState !== WebSocket.OPEN) {
        attemptNextConnection();
      }
    });
  }

  attemptNextConnection();

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'history') {
        const liveBlocks = msg.data.slice(-maxTiles);
        if (currentMode === 'LIVE' && currentChain === 'ethereum') {
          blocks = liveBlocks;
          updateStats();
        } else {
          liveBlocksCache = liveBlocks;
        }
      } else if (msg.type === 'block') {
        const newBlock = msg.data;
        if (currentMode === 'LIVE' && currentChain === 'ethereum') {
          incomingBlockNum = newBlock.block_number;
          incomingBlockStartTime = Date.now();
          blocks.push(newBlock); if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);
          
          let currentCapacity = cols * rows;
          if (blocks.length > currentCapacity) {
            if (tileSize === 64) {
              tileSize = 48;
              resizeCanvas();
            } else if (tileSize === 48) {
              tileSize = 32;
              resizeCanvas();
            } else if (tileSize === 32) {
              tileSize = 24;
              resizeCanvas();
            } else if (tileSize === 24) {
              tileSize = 16;
              resizeCanvas();
            } else {
              blocks.shift();
            }
          }
          audio.playBlockTones(newBlock);
          updateStats();

          // Trigger radial ripple wave on incoming new live block
          if (blocks.length > 0 && typeof gsap !== 'undefined') {
            const lastIdx = blocks.length - 1;
            rippleOriginCol = lastIdx % cols;
            rippleOriginRow = Math.floor(lastIdx / cols);
            rippleProgress.value = 0;
            
            gsap.killTweensOf(rippleProgress);
            gsap.to(rippleProgress, {
              value: 1.0,
              duration: 1.5,
              ease: 'power1.out',
              onComplete: () => {
                rippleOriginCol = -1;
                rippleOriginRow = -1;
                rippleProgress.value = 0;
              }
            });
          }
        } else {
          liveBlocksCache.push(newBlock);
          if (liveBlocksCache.length > maxTiles) {
            liveBlocksCache.shift();
          }
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  };

}

// Perform daily trend analysis calculations and update widget UI
function calculateDailyTrends() {
  if (blocks.length === 0) return;
  
  let transfers = 0;
  let swaps = 0;
  let mints = 0;
  let staking = 0;
  
  blocks.forEach(b => {
    const txs = getBlockTransactions(b);
    txs.forEach(t => {
      if (t.type === 'Plain Transfer') transfers++;
      else if (t.type === 'Token Swap') swaps++;
      else if (t.type === 'NFT Mint') mints++;
      else staking++;
    });
  });

  const total = transfers + swaps + mints + staking || 1;
  const pTransfers = (transfers / total) * 100;
  const pSwaps = (swaps / total) * 100;
  const pMints = (mints / total) * 100;

  if (ratioBarTransfers) ratioBarTransfers.style.width = `${pTransfers}%`;
  if (ratioBarSwaps) ratioBarSwaps.style.width = `${pSwaps}%`;
  if (ratioBarMints) ratioBarMints.style.width = `${pMints}%`;

  if (ratioBarTransfers) ratioBarTransfers.title = `Transfers: ${Math.round(pTransfers)}%`;
  if (ratioBarSwaps) ratioBarSwaps.title = `Swaps: ${Math.round(pSwaps)}%`;
  if (ratioBarMints) ratioBarMints.title = `Mints: ${Math.round(pMints)}%`;

  let dominant = 'Transfers';
  let maxCount = transfers;
  
  if (swaps > maxCount) {
    dominant = 'DeFi Token Swaps 🔄';
    maxCount = swaps;
  }
  if (mints > maxCount) {
    dominant = 'NFT Minting 🎨';
    maxCount = mints;
  }
  if (staking > maxCount) {
    dominant = 'Contracts ⚙️';
  }
  if (maxCount === transfers) {
    dominant = 'Capital Transfers 💸';
  }

  if (trendDominantVal) trendDominantVal.textContent = dominant;

  // Compute gas fee trajectory (peaking vs. cooling)
  if (blocks.length > 5) {
    const recent = blocks.slice(-5);
    const older = blocks.slice(0, 5);
    const avgRecent = recent.reduce((sum, b) => sum + b.base_fee_gwei, 0) / 5;
    const avgOlder = older.reduce((sum, b) => sum + b.base_fee_gwei, 0) / 5;
    
    if (avgRecent > avgOlder + (currentChain === 'solana' ? 0.00002 : 3)) {
      if (trendGasVal) {
        trendGasVal.textContent = 'Upward Spike 🔥';
        trendGasVal.style.color = '#ff6b6b';
      }
    } else if (avgRecent < avgOlder - (currentChain === 'solana' ? 0.00002 : 3)) {
      if (trendGasVal) {
        trendGasVal.textContent = 'Cooling Down 📉';
        trendGasVal.style.color = '#51cf66';
      }
    } else {
      if (trendGasVal) {
        trendGasVal.textContent = 'Stable ➡️';
        trendGasVal.style.color = '';
      }
    }
  } else {
    if (trendGasVal) {
      trendGasVal.textContent = 'Stable ➡️';
      trendGasVal.style.color = '';
    }
  }
  
  updateRatioBarColors();
}

function updateStats() {
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    let totalTx = 0;
    let totalUsd = 0;
    let directCount = 0;
    
    blocks.forEach(b => {
      totalTx += b.tx_count;
      const txs = getBlockTransactions(b);
      txs.forEach(t => {
        totalUsd += t.valueUsd;
        if (t.type === 'Plain Transfer') directCount++;
      });
    });

    let weatherCondition = "calm and quiet";
    if (totalUsd > 5000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (totalTx > 500) weatherCondition = "highly congested and expensive";
    else if (directCount > totalTx * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    weatherLine.innerHTML = `<span style="color: #000; text-shadow: none; font-weight: 500; font-size: 24px; padding: 20px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: inline-block;">Today, <strong>${directCount.toLocaleString()}</strong> human payments moved <strong>${volStr}</strong>.<br>The network weather is ${weatherCondition}.</span>`;
  }

  if (blocks.length === 0) return;
  
  if (currentMode === 'LIVE') {
    const latest = blocks[blocks.length - 1];
    if (latestBlockVal) latestBlockVal.textContent = `#${latest.block_number}`;

    const sumFee = blocks.reduce((sum, b) => sum + b.base_fee_gwei, 0);
    const avgFee = sumFee / blocks.length;
    
    if (avgFeeVal) {
      if (currentChain === 'solana') {
        avgFeeVal.textContent = `${avgFee.toFixed(5)} SOL`;
      } else {
        avgFeeVal.textContent = `${avgFee.toFixed(1)} Gwei`;
      }
    }

    const fillPercent = Math.min((blocks.length / maxTiles) * 100, 100);
    if (gridFillVal) gridFillVal.textContent = `${Math.round(fillPercent)}%`;
  } else {
    if (latestBlockVal) latestBlockVal.textContent = selectedHistoricalDate;
    
    const sumFee = blocks.reduce((sum, b) => sum + b.base_fee_gwei, 0);
    const avgFee = sumFee / blocks.length;
    if (avgFeeVal) avgFeeVal.textContent = `${avgFee.toFixed(1)} Gwei`;
    
    if (gridFillVal) gridFillVal.textContent = `${blocks.length}`;
  }

  calculateDailyTrends();
}

function getBlockAtCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;

  const col = Math.floor(canvasX / tileSize);
  const row = Math.floor(canvasY / tileSize);

  if (col >= 0 && col < cols && row >= 0 && row < rows) {
    const index = row * cols + col;
    if (index >= 0 && index < blocks.length) {
      return blocks[index];
    }
  }
  return null;
}

function updateTooltip(block, e) {
  if (!block || (detailsSidebar && detailsSidebar.classList.contains('open'))) {
    hoverTooltip.classList.remove('visible');
    return;
  }

  const txs = getBlockTransactions(block);
  const totalBlockUsd = txs.reduce((sum, t) => sum + t.valueUsd, 0);
  
  let mood = 'Calm';
  if (block.base_fee_gwei > (currentChain === 'solana' ? 0.00015 : 60)) mood = 'Congested 🔥';
  else if (block.tx_count > (currentChain === 'solana' ? 2000 : 200)) mood = 'Bustling ⚡';
  else if (block.tx_count > (currentChain === 'solana' ? 1500 : 100)) mood = 'Active';

  const feeUnit = currentChain === 'solana' ? 'SOL' : 'Gwei';

  hoverTooltip.innerHTML = `
    <div style="font-family: 'Outfit', sans-serif; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.9); padding: 4px;">
      This block was mostly filled with <strong>${block.contract_ratio > 0.6 ? 'Trading Coins' : 'Direct Payments'}</strong>. 
      <br><br>
      Network traffic was <strong>${block.base_fee_gwei > 50 ? 'Congested and Expensive' : 'Quiet and Cheap'}</strong>, costing people around <strong>${block.base_fee_gwei.toFixed(0)} Gwei</strong>.
      <br><br>
      <span style="color: #00ff88;">${block.tx_count} Total Actions</span> • <span style="color: rgba(255,255,255,0.5);">$${totalBlockUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} Moved</span>
    </div>
  `;

  hoverTooltip.style.left = `${e.pageX}px`;
  hoverTooltip.style.top = `${e.pageY}px`;
  hoverTooltip.classList.add('visible');
}

canvas.addEventListener('mousemove', (e) => {
  lastInteractionTime = Date.now();
  const block = getBlockAtCoords(e.clientX, e.clientY);
  if (block !== hoveredBlock) {
    hoveredBlock = block;
  }
  updateTooltip(block, e);
});

canvas.addEventListener('mouseleave', () => {
  hoveredBlock = null;
  hoverTooltip.classList.remove('visible');
});

canvas.addEventListener('click', (e) => {
  lastInteractionTime = Date.now();
  const block = getBlockAtCoords(e.clientX, e.clientY);
  if (block) {
    hoverTooltip.classList.remove('visible');
    activePopoverBlock = block;
    showBlockDetails(block);

    // Trigger Artsy Radial Ripple Wave GSAP Timeline
    const idx = blocks.indexOf(block);
    if (idx !== -1 && typeof gsap !== 'undefined') {
      rippleOriginCol = idx % cols;
      rippleOriginRow = Math.floor(idx / cols);
      rippleProgress.value = 0;

      gsap.killTweensOf(rippleProgress);
      gsap.to(rippleProgress, {
        value: 1.0,
        duration: 1.2,
        ease: 'power2.out',
        onComplete: () => {
          rippleOriginCol = -1;
          rippleOriginRow = -1;
          rippleProgress.value = 0;
        }
      });
    }
  }
});

// Render Analyst Network graph
function renderNetworkGraph(block) {
  const gCanvas = document.getElementById('network-canvas');
  if (!gCanvas) return;
  const gCtx = gCanvas.getContext('2d');
  const theme = THEMES[currentTheme];

  gCtx.clearRect(0, 0, gCanvas.width, gCanvas.height);
  
  const txs = getBlockTransactions(block);
  if (txs.length === 0) return;

  const width = gCanvas.width;
  const height = gCanvas.height;

  const nodes = [
    { id: 'Source', x: width * 0.15, y: height * 0.5, label: 'Source Wallet' },
    { id: 'Router', x: width * 0.5, y: height * 0.5, label: 'Contract/Router' },
    { id: 'Dest1', x: width * 0.85, y: height * 0.25, label: 'Exchange Wallet' },
    { id: 'Dest2', x: width * 0.85, y: height * 0.75, label: 'Cold Storage' }
  ];

  txs.forEach((tx, idx) => {
    let start = nodes[0];
    let end = nodes[1];
    if (idx % 3 === 1) {
      start = nodes[1];
      end = nodes[2];
    } else if (idx % 3 === 2) {
      start = nodes[1];
      end = nodes[3];
    }

    gCtx.strokeStyle = tx.label.includes('Tracked') ? 'rgba(0, 229, 255, 0.6)' : theme.accent.replace(')', ', 0.35)').replace('hsl', 'hsla');
    gCtx.lineWidth = Math.max(1, Math.min(4, tx.valueUsd / 2000));
    
    gCtx.beginPath();
    gCtx.moveTo(start.x, start.y);
    gCtx.lineTo(end.x, end.y);
    gCtx.stroke();

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    gCtx.fillStyle = gCtx.strokeStyle;
    gCtx.beginPath();
    gCtx.arc(midX, midY, 3, 0, Math.PI * 2);
    gCtx.fill();
  });

  nodes.forEach(node => {
    gCtx.fillStyle = theme.bg;
    gCtx.strokeStyle = theme.graphNode;
    gCtx.lineWidth = 2;
    
    gCtx.beginPath();
    gCtx.arc(node.x, node.y, 10, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.stroke();

    gCtx.fillStyle = theme.graphText;
    gCtx.font = '500 8px Outfit';
    gCtx.textAlign = 'center';
    gCtx.fillText(node.id, node.x, node.y + 3);

    gCtx.fillStyle = theme.graphText;
    gCtx.font = '500 7px Outfit';
    gCtx.fillText(node.label, node.x, node.y - 14);
  });
}

function showBlockDetails(block) {
  if (popBlockNum) popBlockNum.textContent = `#${block.block_number}`;
  
  const txs = getBlockTransactions(block);
  const primaryTx = txs[0] || {
    from: '0x0000000000000000000000000000000000000000',
    to: '0x0000000000000000000000000000000000000000',
    valueEth: 0,
    valueUsd: 0,
    asset: 'ETH',
    type: 'Plain Transfer',
    gasPriceGwei: 15,
    confirmations: 12,
    label: 'None',
    anomaly: 'None'
  };

  const totalBlockUsd = txs.reduce((sum, t) => sum + t.valueUsd, 0);
  if (popAmountUsd) popAmountUsd.textContent = `$${totalBlockUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (popTime) popTime.textContent = `${Math.floor((Date.now() - block.timestamp * 1000) / 1000)}s ago`;

  // Render Subpixel Interactive Bar
  const subpixelGrid = document.getElementById('subpixel-inspect-grid');
  if (subpixelGrid) {
    subpixelGrid.innerHTML = '';
    const density = Math.max(0.1, Math.min(0.85, block.tx_count / 300));
    const targetOnCount = Math.max(6, Math.floor(density * 64));
    
    for (let i = 0; i < targetOnCount; i++) {
      const tx = txs[i % txs.length] || primaryTx;
      const cell = document.createElement('div');
      cell.classList.add('subpixel-inspect-cell');
      
      let baseColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
      if (currentPalette === 'monochrome') {
        const theme = THEMES[currentTheme];
        baseColor = theme.accent;
      }
      cell.style.backgroundColor = baseColor;
      cell.title = `${tx.type} - $${tx.valueUsd.toLocaleString()}`;

      // Click to open detailed single Transaction Inspector Modal overlay
      cell.addEventListener('click', () => {
        const overlay = document.getElementById('tx-inspector-overlay');
        document.getElementById('tx-inspect-value-usd').textContent = `$${tx.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('tx-inspect-amount').textContent = `${tx.valueEth.toFixed(4)} ${currentChain === 'solana' ? 'SOL' : tx.asset}`;
        document.getElementById('tx-inspect-type').textContent = tx.type;
        document.getElementById('tx-inspect-gas').textContent = currentChain === 'solana' ? `${tx.gasPriceGwei / 1000000} SOL` : `${tx.gasPriceGwei} Gwei`;
        document.getElementById('tx-inspect-protocol').textContent = tx.label;
        document.getElementById('tx-inspect-from').textContent = tx.from;
        document.getElementById('tx-inspect-to').textContent = tx.to;
        overlay.classList.add('open');
      });
      subpixelGrid.appendChild(cell);
    }
  }
  
  if (popFeePaid) {
    if (currentChain === 'solana') {
      popFeePaid.textContent = `$${(block.base_fee_gwei * 150).toFixed(4)} (${block.base_fee_gwei} SOL)`;
    } else {
      popFeePaid.textContent = `$${(block.base_fee_gwei * 0.05).toFixed(2)} (${block.base_fee_gwei} Gwei)`;
    }
  }

  let direction = 'No tracked wallet';
  if (trackedAddress && trackedAddress.length > 0) {
    const match = txs.find(tx => tx.from.includes(trackedAddress) || tx.to.includes(trackedAddress));
    if (match) {
      direction = match.from.includes(trackedAddress) ? 'Sent ↗' : 'Received ↙';
    } else {
      direction = 'Not involved';
    }
  }
  if (popDirection) popDirection.textContent = direction;

  if (popFrom) popFrom.textContent = primaryTx.from;
  if (popTo) popTo.textContent = primaryTx.to;

  if (popTraderType) popTraderType.textContent = primaryTx.type;
  if (popTraderAsset) popTraderAsset.textContent = currentChain === 'solana' ? 'SOL' : primaryTx.asset;
  
  if (popTraderGas) {
    if (currentChain === 'solana') {
      popTraderGas.textContent = `${primaryTx.gasPriceGwei / 1000000} SOL`;
    } else {
      popTraderGas.textContent = `${primaryTx.gasPriceGwei} Gwei`;
    }
  }

  if (popTraderValueUsd) popTraderValueUsd.textContent = `$${primaryTx.valueUsd.toLocaleString()}`;

  const seed = parseInt(block.hash.substring(4, 6), 16);
  if (popAnalystCluster) popAnalystCluster.textContent = `Cluster #${seed.toString(16).toUpperCase()}`;
  if (popAnalystLabel) popAnalystLabel.textContent = primaryTx.label;
  
  const activeAnomaly = txs.find(t => t.anomaly !== 'None');
  if (popAnalystAnomaly) popAnalystAnomaly.textContent = activeAnomaly ? activeAnomaly.anomaly : 'None';
  if (popAnalystFirstSeen) popAnalystFirstSeen.textContent = `${(seed % 30) + 1} days ago`;

  let mood = 'Calm';
  if (block.base_fee_gwei > (currentChain === 'solana' ? 0.00015 : 60)) mood = 'Congested 🔥';
  else if (block.tx_count > (currentChain === 'solana' ? 2000 : 200)) mood = 'Bustling ⚡';
  else if (block.tx_count > (currentChain === 'solana' ? 1500 : 100)) mood = 'Active';
  if (popMood) popMood.textContent = mood;

  if (popTxCount) popTxCount.textContent = block.tx_count;
  if (popHash) popHash.textContent = block.hash;
  if (popExplorerLink) popExplorerLink.href = currentChain === 'solana' ? `https://solscan.io/block/${block.block_number}` : `https://etherscan.io/block/${block.block_number}`;
  if (popCopyHashBtn) popCopyHashBtn.textContent = 'Copy';

  tabBtns.forEach(b => b.classList.remove('active'));
  tabPanes.forEach(p => p.classList.remove('active'));
  if (tabBtns[0]) tabBtns[0].classList.add('active');
  if (tabPanes[0]) tabPanes[0].classList.add('active');

  // Mutual exclusion: Close Settings drawer if details sidebar opens
  if (archiveDrawer) {
    archiveDrawer.classList.remove('open');
  }

  // Open sidebar drawer and shift layout
  if (detailsSidebar) {
    detailsSidebar.classList.add('open');
  }
  if (canvasContainer) {
    canvasContainer.classList.add('sidebar-open');
  }
  
  // Staggered resize to recalculate columns/rows inside the squished layout
  setTimeout(resizeCanvas, 420);
}

// Drawer Toggling (Mutual exclusion: Close details sidebar if Settings drawer opens)
archiveToggleBtn.addEventListener('click', () => {
  lastInteractionTime = Date.now();
  archiveDrawer.classList.toggle('open');
  if (archiveDrawer.classList.contains('open') && detailsSidebar) {
    detailsSidebar.classList.remove('open');
    canvasContainer.classList.remove('sidebar-open');
    setTimeout(resizeCanvas, 420);
  }
});

closeDrawerBtn.addEventListener('click', () => {
  lastInteractionTime = Date.now();
  archiveDrawer.classList.remove('open');
});

// Render Archive Calendar Days (Dynamic current month based on today's local date)
function renderCalendar() {
  calendarDaysGrid.innerHTML = '';
  
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 is Jan, 11 is Dec)
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Update header text to show current month and year
  const monthYearLabel = document.querySelector('.archive-header h3') || document.querySelector('.archive-header-title');
  if (monthYearLabel) {
    monthYearLabel.textContent = `${monthNames[month]} ${year}`;
  }

  // Get first day of the month and number of days
  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)
  const totalDays = new Date(year, month + 1, 0).getDate(); // Days in current month

  // Render blank days for offset
  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.classList.add('calendar-day', 'empty-day');
    calendarDaysGrid.appendChild(blank);
  }

  // Render dynamic days
  for (let day = 1; day <= totalDays; day++) {
    const dayEl = document.createElement('div');
    dayEl.classList.add('calendar-day');
    dayEl.textContent = day;

    const formattedDay = day < 10 ? `0${day}` : day;
    const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : (month + 1);
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    dayEl.setAttribute('data-date', dateStr);

    // If day is today or in the past, allow replaying historical data
    if (day <= today.getDate()) {
      const category = getCategoryForDay(day);
      const dot = document.createElement('span');
      dot.classList.add('day-dot');
      
      if (category === 'zen') {
        dot.classList.add('calm');
      } else if (category === 'dragon') {
        dot.classList.add('congested');
      } else {
        dot.classList.add('active');
      }
      dayEl.appendChild(dot);

      if (day === today.getDate()) {
        dayEl.classList.add('active-selected');
        dayEl.addEventListener('click', () => {
          switchToLive();
        });
      } else {
        dayEl.addEventListener('click', () => {
          loadHistoricalPortrait(dateStr, day);
        });
      }
    } else {
      dayEl.classList.add('empty-day');
    }

    calendarDaysGrid.appendChild(dayEl);
  }
}

// Playback ticker loop helper
function tickPlayback() {
  if (playbackIndex >= playbackFullList.length) {
    pausePlayback();
    return;
  }
  
  playbackIndex++;
  playbackSlider.value = playbackIndex;
  blocks = playbackFullList.slice(0, playbackIndex);
  updateStats();
  
  if (blocks.length > 0) {
    audio.playBlockTones(blocks[blocks.length - 1]);
  }
  
  playbackCounter.textContent = `${playbackIndex} / ${playbackFullList.length} Blocks`;
}

function startPlayback() {
  if (isPlayingPlayback) return;
  isPlayingPlayback = true;
  playbackPlayBtn.textContent = 'Pause';
  
  if (playbackIndex >= playbackFullList.length) {
    playbackIndex = 0;
    blocks = [];
    playbackSlider.value = 0;
  }
  
  playbackIntervalId = setInterval(tickPlayback, 125);
}

// Sound playback play listener triggers audio context
function pausePlayback() {
  if (!isPlayingPlayback) return;
  isPlayingPlayback = false;
  playbackPlayBtn.textContent = 'Play';
  clearInterval(playbackIntervalId);
}

// Slider scrub listener
playbackSlider.addEventListener('input', (e) => {

    // Parallax Time-Scrubbing Effect
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.style.transition = 'transform 0.1s ease-out, filter 0.1s ease-out';
      // Slight 3D scale and tilt backwards as you drag to simulate moving fast
      canvasContainer.style.transform = 'perspective(1000px) rotateX(2deg) scale(0.95) translateZ(-50px)';
      canvasContainer.style.filter = 'blur(1px)';
      
      // Reset after dragging stops
      clearTimeout(window.parallaxScrubTimer);
      window.parallaxScrubTimer = setTimeout(() => {
        canvasContainer.style.transform = 'perspective(1000px) rotateX(0deg) scale(1) translateZ(0)';
        canvasContainer.style.filter = 'blur(0)';
      }, 150);
    }

  pausePlayback();
  playbackIndex = parseInt(e.target.value);
  blocks = playbackFullList.slice(0, playbackIndex);
  updateStats();
  playbackCounter.textContent = `${playbackIndex} / ${playbackFullList.length} Blocks`;
  lastInteractionTime = Date.now();
});

// Playback button toggler
playbackPlayBtn.addEventListener('click', () => {
  lastInteractionTime = Date.now();
  if (isPlayingPlayback) {
    pausePlayback();
  } else {
    audio.init();
    startPlayback();
  }
});

// Transition Layouts
async function loadHistoricalPortrait(dateStr, dayNum) {
  // HIJACKED FOR ART SYNTHESIS
  triggerArtisticSynthesis(dayNum);
  return;

  lastInteractionTime = Date.now();
  archiveDrawer.classList.remove('open');
  pausePlayback();
  
  if (currentMode === 'LIVE') {
    liveBlocksCache = [...blocks];
  }
  
  const dateObj = new Date(dateStr + 'T00:00:00');
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthStr = monthNames[dateObj.getMonth()];
  const formattedFriendlyDate = `${monthStr} ${dayNum}, ${dateObj.getFullYear()}`;

  currentMode = 'HISTORICAL';
  selectedHistoricalDate = formattedFriendlyDate;
  historicalDayNumber = dayNum;
  
  const category = getCategoryForDay(dayNum);
  const categoryLabel = getCategoryLabel(category);
  
  liveIndicator.className = 'status-indicator historical-mode';
  modeStatusText.textContent = `Viewing Archives: ${categoryLabel}`;
  
  statsBlockLabel.textContent = 'PORTRAIT DATE';
  statsFillLabel.textContent = 'BLOCKS MINED';
  
  historicalDateLabel.textContent = `${formattedFriendlyDate} — ${categoryLabel}`;
  historicalBanner.classList.add('active');

  // Try to fetch real blocks from the backend
  let fetchedBlocks = [];
  try {
    // Resolve HTTP host address dynamically
    const protocol = window.location.protocol;
    const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `${window.location.hostname}:8080`
      : 'blockchain-mosaic-production.up.railway.app'; // Change to match your production API domain
    
    const response = await fetch(`${protocol}//${host}/api/history/${dateStr}`);
    if (response.ok) {
      const resData = await response.json();
      if (resData && resData.data && resData.data.length > 0) {
        fetchedBlocks = resData.data;
        console.log(`Successfully fetched ${fetchedBlocks.length} real historical blocks for ${dateStr}`);
      }
    }
  } catch (err) {
    console.warn(`Could not fetch live database blocks for ${dateStr}, using fallback generator:`, err.message);
  }

  // If no database blocks were returned, fall back to generative mock blocks
  playbackFullList = fetchedBlocks.length > 0 ? fetchedBlocks : generateMockHistoryForDate(dateStr);
  playbackIndex = 0;
  blocks = [];
  
  playbackSlider.max = playbackFullList.length;
  playbackSlider.value = 0;
  playbackCounter.textContent = `0 / ${playbackFullList.length} Blocks`;
  playbackPlayBtn.textContent = 'Play';
  playbackControls.classList.add('active');

  updateStats();
  
  document.querySelectorAll('.calendar-day').forEach(el => {
    el.classList.remove('active-selected');
  });
  const days = document.querySelectorAll('.calendar-day');
  // Find matching day element by data-date attribute
  const match = Array.from(days).find(el => el.getAttribute('data-date') === dateStr);
  if (match) {
    match.classList.add('active-selected');
  }
}

function switchToLive() {
  lastInteractionTime = Date.now();
  archiveDrawer.classList.remove('open');
  pausePlayback();
  playbackControls.classList.remove('active');
  
  if (currentMode === 'HISTORICAL') {
    currentMode = 'LIVE';
    
    tileSize = 64;
    resizeCanvas();
    
    blocks = [...liveBlocksCache];
    
    liveIndicator.className = 'status-indicator live';
    modeStatusText.textContent = 'A Living Portrait of the Blockchain';
    statsBlockLabel.textContent = 'LATEST BLOCK';
    statsFillLabel.textContent = 'GRID FILL';
    
    historicalBanner.classList.remove('active');
    updateStats();
  }

  document.querySelectorAll('.calendar-day').forEach(el => {
    el.classList.remove('active-selected');
  });
  const days = document.querySelectorAll('.calendar-day');
  if (days[10]) {
    days[10].classList.add('active-selected');
  }
}

returnLiveBtn.addEventListener('click', switchToLive);

popCopyHashBtn.addEventListener('click', () => {
  lastInteractionTime = Date.now();
  if (activePopoverBlock) {
    navigator.clipboard.writeText(activePopoverBlock.hash).then(() => {
      popCopyHashBtn.textContent = 'Copied!';
    });
  }
});

// Transaction Inspector Dialog Closes
const closeTxInspectorBtn = document.getElementById('close-tx-inspector');
const txInspectorOverlay = document.getElementById('tx-inspector-overlay');
if (closeTxInspectorBtn && txInspectorOverlay) {
  closeTxInspectorBtn.addEventListener('click', () => {
    txInspectorOverlay.classList.remove('open');
  });
  txInspectorOverlay.addEventListener('click', (e) => {
    if (e.target === txInspectorOverlay) {
      txInspectorOverlay.classList.remove('open');
    }
  });
}

// URL Parameters Router Logic
function parseUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  
  // 1. Palette Router
  const palette = params.get('palette');
  if (palette && PALETTES[palette]) {
    currentPalette = palette;
    if (paletteSelect) paletteSelect.value = palette;
  }
  
  // 2. Theme Router
  const theme = params.get('theme');
  if (theme && THEMES[theme]) {
    currentTheme = theme;
    document.body.className = theme + '-theme';
    if (themeToggleBtn) {
      themeToggleBtn.textContent = theme === 'warmGray' ? 'Toggle Charcoal Theme' : 'Toggle Warm Gray Theme';
    }
  }
  
  // 3. Chain Router
  const chain = params.get('chain');
  if (chain && ['ethereum', 'base', 'arbitrum', 'solana'].includes(chain)) {
    currentChain = chain;
    if (chainSelect) chainSelect.value = chain;
    
    // Trigger chain changes behavior
    if (chain === 'ethereum') {
      // Keep live WS connection
    } else {
      let cadence = 2000;
      if (chain === 'arbitrum') cadence = 500;
      else if (chain === 'solana') cadence = 400;
      chainIntervalId = setInterval(generateSimulatedBlock, cadence);
    }
  }
}

function updateUrlParameters() {
  const params = new URLSearchParams();
  params.set('palette', currentPalette);
  params.set('theme', currentTheme);
  params.set('chain', currentChain);
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

// Attach sync updates to select boxes
if (paletteSelect) {
  paletteSelect.addEventListener('change', () => {
    updateUrlParameters();
  });
}
if (chainSelect) {
  chainSelect.addEventListener('change', () => {
    updateUrlParameters();
  });
}
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    updateUrlParameters();
  });
}

// GSAP Interface Entrance & Focus Animations
function triggerGsapEntrances() {
  if (typeof gsap === 'undefined') return;

  // Staggered load for header controls
  gsap.from('.brand-group', {
    duration: 1.2,
    y: -30,
    opacity: 0,
    ease: 'power4.out'
  });

  gsap.from('.tracker-bar, #archive-toggle-btn, #guide-open-btn', {
    duration: 1.0,
    y: -20,
    opacity: 0,
    stagger: 0.15,
    ease: 'power3.out',
    delay: 0.2
  });

  // Stagger stats block cards
  gsap.from('.stats-banner .stat-item', {
    duration: 0.8,
    opacity: 0,
    scale: 0.9,
    stagger: 0.08,
    ease: 'back.out(1.5)',
    delay: 0.4
  });

  // Slide up footer legend
  gsap.from('.app-footer', {
    duration: 1.0,
    y: 40,
    opacity: 0,
    ease: 'power3.out',
    delay: 0.6
  });
}

// Override enter/exit focus mode using GSAP timelines for smooth aesthetic transition
function enterFocusMode() {
  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(resizeCanvas, 100);
      }
    });

    // Close drawers first
    if (archiveDrawer) archiveDrawer.classList.remove('open');
    if (detailsSidebar) detailsSidebar.classList.remove('open');
    if (canvasContainer) canvasContainer.classList.remove('sidebar-open');

    // Fade and slide out UI controls
    tl.to('.app-header, .app-footer, #historical-banner', {
      duration: 0.4,
      y: -20,
      opacity: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
      ease: 'power2.inOut'
    });

    // Expand canvas container to full view
    tl.to('.canvas-container', {
      duration: 0.6,
      padding: 0,
      margin: 0,
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10,
      backgroundColor: THEMES[currentTheme].bg,
      ease: 'power3.inOut'
    }, '-=0.2');

    // Smoothly morph into floating, organic drift layout
    tl.to(focusFloatProgress, {
      value: 1.0,
      duration: 1.5,
      ease: 'power2.out'
    }, '-=0.4');

    document.body.classList.add('focus-mode');
  } else {
    document.body.classList.add('focus-mode');
    if (archiveDrawer) archiveDrawer.classList.remove('open');
    if (detailsSidebar) detailsSidebar.classList.remove('open');
    if (canvasContainer) canvasContainer.classList.remove('sidebar-open');
    setTimeout(resizeCanvas, 550);
  }
}

function exitFocusMode() {
  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline({
      onComplete: () => {
        // Remove GSAP-applied inline style overrides so it snaps back to standard CSS layout
        const container = document.querySelector('.canvas-container');
        if (container) {
          container.style.position = '';
          container.style.width = '';
          container.style.height = '';
          container.style.top = '';
          container.style.left = '';
          container.style.padding = '';
          container.style.margin = '';
          container.style.zIndex = '';
          container.style.backgroundColor = '';
        }
        setTimeout(resizeCanvas, 100);
      }
    });

    document.body.classList.remove('focus-mode');

    // Smoothly settle back into rigid grid coordinates
    tl.to(focusFloatProgress, {
      value: 0.0,
      duration: 0.8,
      ease: 'power2.inOut'
    });

    // Restore canvas container layouts
    tl.to('.canvas-container', {
      duration: 0.5,
      position: 'relative',
      width: '100%',
      height: '100%',
      zIndex: '',
      ease: 'power3.inOut'
    }, '-=0.4');

    // Fade and slide back UI elements
    tl.to('.app-header, .app-footer', {
      duration: 0.5,
      y: 0,
      opacity: 1,
      pointerEvents: 'all',
      visibility: 'visible',
      ease: 'power3.out'
    }, '-=0.2');
  } else {
    document.body.classList.remove('focus-mode');
    setTimeout(resizeCanvas, 550);
  }
}

// Resume Web Audio on first user interaction (browser security policy)
window.addEventListener('click', () => {
  if (audio) {
    audio.init();
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume();
    }
  }
}, { once: true });

// Run
parseUrlParameters();
renderCalendar();
connectRelay();
requestAnimationFrame(draw);
updateStats();
applyThemeStyles();
updateRatioBarColors();
updateLegend();
triggerGsapEntrances();


let clickedLegendFilter = null;
let filterCountTooltip = document.getElementById('filter-count-tooltip');
if (!filterCountTooltip) {
  filterCountTooltip = document.createElement('div');
  filterCountTooltip.id = 'filter-count-tooltip';
  filterCountTooltip.style.position = 'absolute';
  filterCountTooltip.style.bottom = '50px';
  filterCountTooltip.style.left = '32px';
  filterCountTooltip.style.fontFamily = "'Space Mono', monospace";
  filterCountTooltip.style.fontSize = '12px';
  filterCountTooltip.style.color = '#fff';
  filterCountTooltip.style.background = 'rgba(8,9,12,0.95)';
  filterCountTooltip.style.padding = '12px 18px';
  filterCountTooltip.style.borderRadius = '8px';
  filterCountTooltip.style.border = '1px solid rgba(255,255,255,0.15)';
  filterCountTooltip.style.pointerEvents = 'none';
  filterCountTooltip.style.opacity = '0';
  document.body.appendChild(filterCountTooltip);
}

const legendEl = document.getElementById('legend-container');
if (legendEl) {
  legendEl.addEventListener('click', (e) => {
    const item = e.target.closest('.legend-item');
    if (!item) return;
    const text = item.textContent.trim();
    
    let typeKey = null;
    if (text.includes('Plain Transfer') || text.includes('Direct Payments')) typeKey = 'Plain Transfer';
    else if (text.includes('Token Swap') || text.includes('Trading Coins')) typeKey = 'Token Swap';
    else if (text.includes('NFT Mint') || text.includes('Digital Art')) typeKey = 'NFT Mint';
    if (!typeKey) return;

    if (clickedLegendFilter === typeKey) {
      clickedLegendFilter = null;
      document.querySelectorAll('.legend-item').forEach(el => el.style.opacity = '1');
      if (typeof gsap !== 'undefined') gsap.to(filterCountTooltip, { opacity: 0, y: 10, duration: 0.3 });
    } else {
      clickedLegendFilter = typeKey;
      document.querySelectorAll('.legend-item').forEach(el => el.style.opacity = '0.3');
      item.style.opacity = '1';
      
      let count = 0;
      let totalUsd = 0;
      let explanation = "";
      let titleName = "";
      
      if (typeKey === 'Plain Transfer') {
        titleName = "Direct Payments";
        explanation = "Simple wallet-to-wallet transfers. These represent the everyday economy of people sending money to one another.";
      } else if (typeKey === 'Token Swap') {
        titleName = "Trading Coins";
        explanation = "People actively swapping different cryptocurrencies on decentralized exchanges. High activity here usually means the market is volatile.";
      } else if (typeKey === 'NFT Mint') {
        titleName = "Digital Art & NFTs";
        explanation = "The creation and trading of unique digital assets, collectibles, and artwork permanently recorded on the network.";
      }

      blocks.slice(-maxTiles).forEach(b => {
        getBlockTransactions(b).forEach(t => {
          if (t.type === typeKey) {
            count++;
            totalUsd += t.valueUsd || 0;
          }
        });
      });
      
      const usdString = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 });

      filterCountTooltip.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; font-size: 13px; max-width: 260px; text-align: left; line-height: 1.5; padding: 4px;">
          <div style="font-size: 13px; font-weight: bold; color: ${PALETTES.classic[typeKey]}; margin-bottom: 8px; font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${PALETTES.classic[typeKey]}; box-shadow: 0 0 8px ${PALETTES.classic[typeKey]};"></span>
            ${titleName}
          </div>
          <div style="color: rgba(255,255,255,0.85); margin-bottom: 12px; font-weight: 300;">
            ${explanation}
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; font-family: 'Space Mono', monospace; font-size: 11px;">
            <span style="color: #00ff88;">${count.toLocaleString()} LIVE ACTIONS</span>
            <span style="color: rgba(255,255,255,0.5);">${usdString} MOVED</span>
          </div>
        </div>
      `;
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(filterCountTooltip);
        gsap.fromTo(filterCountTooltip, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      }
    }
  });
}


function triggerArtisticSynthesis(day, dayBlocks) {
  currentMode = 'ART_SYNTHESIS';
  pausePlayback();
  
  if (!dayBlocks || dayBlocks.length === 0) dayBlocks = generateMockHistoryForDate(`2026-07-${day < 10 ? '0'+day:day}`).slice(0, 1000);
  
  // ALGORITHM: Analyze the day's patterns to generate a beautiful, sorted picture
  let allTxs = [];
  let counts = { 'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Smart Contract': 0 };
  
  dayBlocks.forEach(b => {
    getBlockTransactions(b).forEach(t => {
      allTxs.push(t);
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
  });
  
  // Find dominant pattern
  let dominantType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  
  // Sort the transactions to create gradients/bands instead of noise
  allTxs.sort((a, b) => {
    // Primary sort by type to group colors
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    // Secondary sort by value to create intensity gradients within the color bands
    return (a.valueUsd || 0) - (b.valueUsd || 0);
  });
  
  // Re-pack into a single massive mock block so the draw loop renders them sequentially in the grid
  blocks = [{
    block_number: 'SYNTHESIS',
    transactions: allTxs
  }];
  
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) weatherLine.style.display = 'none';
  document.getElementById('archive-drawer').classList.remove('open');
  document.querySelector('.canvas-container').classList.remove('sidebar-open');
  
  // Generate the story text
  let storyText = "A calm, balanced day on the network.";
  if (dominantType === 'Token Swap') {
    storyText = "The fiery orange and pink bands dominate the canvas, visualizing a day of extreme market volatility and heavy coin trading.";
  } else if (dominantType === 'Plain Transfer') {
    storyText = "Cool, sweeping gradients reflect a quiet day dominated by simple, peer-to-peer human payments.";
  } else if (dominantType === 'NFT Mint') {
    storyText = "Vivid, geometric clusters burst across the canvas, capturing a frenzy of digital art creation.";
  }
  
  let artOverlay = document.getElementById('art-synthesis-overlay');
  if (!artOverlay) {
    artOverlay = document.createElement('div');
    artOverlay.id = 'art-synthesis-overlay';
    artOverlay.style.position = 'absolute';
    artOverlay.style.bottom = '80px';
    artOverlay.style.left = '50%';
    artOverlay.style.transform = 'translateX(-50%)';
    artOverlay.style.zIndex = '9000';
    artOverlay.style.textAlign = 'center';
    artOverlay.style.color = '#fff';
    artOverlay.style.pointerEvents = 'none';
    
    artOverlay.innerHTML = `
      <div style="font-family: 'Space Mono', monospace; font-size: 14px; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">Synthesis Complete</div>
      <div id="art-portrait-title" style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">PORTRAIT OF JULY ${day}, 2026</div>
      <div id="art-portrait-story" style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 300; color: rgba(255,255,255,0.8); max-width: 600px; margin: 0 auto 24px auto; line-height: 1.5; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">${storyText}</div>
      <button style="pointer-events: auto; padding: 12px 30px; background: #fff; color: #000; border: none; border-radius: 30px; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; cursor: pointer; letter-spacing: 0.1em; transition: transform 0.2s; box-shadow: 0 8px 24px rgba(0,0,0,0.4);" onclick="location.reload()">Return to Live Grid</button>
    `;
    document.body.appendChild(artOverlay);
  } else {
    artOverlay.style.display = 'block';
    document.getElementById('art-portrait-title').textContent = `PORTRAIT OF JULY ${day}, 2026`;
    document.getElementById('art-portrait-story').textContent = storyText;
  }
}
