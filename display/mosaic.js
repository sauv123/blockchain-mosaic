// Mosaic App Code
let blocks = [];
let shockwaves = [];
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
// Mouse tracking for parallax
let mouseX = 0;
let mouseY = 0;
let targetTiltX = 0;
let targetTiltY = 0;
let currentTiltX = 0;
let currentTiltY = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  if (document.body.classList.contains('focus-mode')) {
    // Max tilt of 7 degrees for focus mode
    targetTiltY = ((mouseX - centerX) / centerX) * 7;
    targetTiltX = -((mouseY - centerY) / centerY) * 7;
  } else {
    // Very subtle 1.5 degree cinematic tilt for standard dashboard
    targetTiltY = ((mouseX - centerX) / centerX) * 1.5;
    targetTiltX = -((mouseY - centerY) / centerY) * 1.5;
  }
});

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
let currentTheme = 'charcoal';

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
  const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.addEventListener('click', () => {
      // Pass ALL the blocks loaded for this day (complete picture)
      // Always synthesize the COMPLETE day, not just what's been scrubbed
      const fullDayData = playbackFullList && playbackFullList.length > 0 ? playbackFullList : blocks;
      // Temporarily show all blocks so portrait matches full day
      blocks = [...fullDayData];
      triggerArtisticSynthesis(historicalDayNumber, fullDayData);
    });
  }
const playbackSlider = document.getElementById('playback-slider');
const playbackCounter = document.getElementById('playback-counter');

// Temporal Playback State
let playbackFullList = [];
let playbackIndex = 0;
let playbackIntervalId = null;
let isPlayingPlayback = false;

// Audio toggling
// Also wire the header audio icon button
const audioIconBtn = document.getElementById('audio-toggle-btn');
if (audioIconBtn) {
  audioIconBtn.addEventListener('click', () => {
    audio.init();
    const isMuted = audio.toggle();
    audioIconBtn.style.opacity = isMuted ? '0.35' : '1';
    audioIconBtn.title = isMuted ? 'Enable Audio' : 'Mute Audio';
  });
}

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

// Inject a Theme (Light/Dark) selector into the settings drawer
(function() {
  const paletteItem = document.querySelector('#palette-select')?.closest('.setting-item');
  if (paletteItem && !document.getElementById('theme-select')) {
    const themeItem = document.createElement('div');
    themeItem.className = 'setting-item';
    themeItem.innerHTML = `
      <label for="theme-select" style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; font-family:'Space Mono',monospace; opacity:0.6;">Theme</label>
      <select id="theme-select">
        <option value="warmGray">Warm Gray (Light)</option>
        <option value="charcoal">Charcoal (Dark)</option>
      </select>
    `;
    paletteItem.insertAdjacentElement('afterend', themeItem);

    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = currentTheme;
    themeSelect.addEventListener('change', (e) => {
      currentTheme = e.target.value;
      lastInteractionTime = Date.now();
      applyAllSettings();
    });
  }
})();

// Single source of truth: applyAllSettings()
function applyAllSettings() {
  // 1. Body class drives all CSS variable theming
  document.body.className = currentTheme + '-theme';
  applyThemeStyles();

  // 2. Palette: reset any portrait filter so colors render fresh
  const canvas = document.getElementById('mosaic-canvas');
  if (canvas && currentMode !== 'ART_SYNTHESIS') {
    canvas.style.filter = '';
  }

  // 3. Legend and ratio bar
  updateRatioBarColors();

  // 4. Update URL so sharing works
  updateUrlParameters();
}

// Palette Change listener
if (paletteSelect) {
  paletteSelect.addEventListener('change', (e) => {
    currentPalette = e.target.value;
    lastInteractionTime = Date.now();
    // If portrait filter is active, remove it so new palette colors show correctly
    if (currentMode === 'ART_SYNTHESIS') {
      if (typeof exitPortrait === 'function') exitPortrait();
    }
    applyAllSettings();
  });
}

// Theme toggle is in settings drawer — no floating button needed
themeToggleBtn = null;

function applyThemeStyles() {
  // CSS custom properties do all the work — just set the class.
  // Clear any lingering inline styles that may have overridden CSS vars.
  document.body.style.removeProperty('background-color');
  document.body.style.removeProperty('color');
  document.querySelectorAll('.stat-item .value, .brand h1, .brand .sub-brand').forEach(el => {
    el.style.removeProperty('color');
  });
  // Body class is set by caller — this function just cleans up inline overrides.
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
  if (block.transactions) return block.transactions;
  const hash = (block.hash || "0x000").replace('0x', '');
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
    
    const processNewBlock = (bNum, txC, bFee, hsh, ts, wFlag, vUsd) => {
        const newBlock = {
            block_number: bNum, timestamp: ts, hash: hsh, tx_count: txC,
            base_fee_gwei: bFee, contract_ratio: 0.5, whale_flag: wFlag,
            largest_tx_value_usd: vUsd, dominant_type: 'Token Transfer',
            hue: 200, saturation: 80, complexity: 0.5
        };
        
        incomingBlockNum = bNum;
        incomingBlockStartTime = Date.now();
        newBlock._liveMintedTime = Date.now();
        blocks.push(newBlock);
        
        if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);
        
        let currentCapacity = cols * rows;
        if (blocks.length > currentCapacity) {
            if (tileSize === 64) { tileSize = 48; resizeCanvas(); }
            else if (tileSize === 48) { tileSize = 32; resizeCanvas(); }
            else if (tileSize === 32) { tileSize = 24; resizeCanvas(); }
            else if (tileSize === 24) { tileSize = 16; resizeCanvas(); }
            else { blocks.shift(); }
        }
        
        updateStats();
        
        // Trigger simulated block animation ripple wave
        if (blocks.length > 0 && typeof gsap !== 'undefined') {
            const lastIdx = blocks.length - 1;
            rippleOriginCol = lastIdx % cols;
            rippleOriginRow = Math.floor(lastIdx / cols);
            rippleProgress.value = 0;
            
            gsap.killTweensOf(rippleProgress);
            gsap.to(rippleProgress, {
                value: 1.0, duration: 1.4, ease: 'power1.out',
                onComplete: () => { rippleOriginCol = -1; rippleOriginRow = -1; rippleProgress.value = 0; }
            });
        }
    };

    fetch("https://ethereum-rpc.publicnode.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBlockByNumber", params: ["latest", true], id: 1 })
    }).then(res => res.json()).then(data => {
        if (!data || !data.result) throw new Error("Invalid RPC payload");
        const b = data.result;
        const bNum = parseInt(b.number, 16);
        if (window.lastSeenBlockHex === b.number) return; // Prevent duplicates
        window.lastSeenBlockHex = b.number;
        
        const txC = b.transactions.length;
        const bFee = parseInt(b.baseFeePerGas || '0', 16) / 1e9;
        const vUsd = txC * 4500;
        const wFlag = txC > 250 ? 1 : 0;
        
        processNewBlock(bNum, txC, bFee, b.hash, parseInt(b.timestamp, 16), wFlag, vUsd);
    }).catch(err => {
        console.error('ETH RPC Error, falling back to local simulation:', err);
        const bNum = blocks.length > 0 ? blocks[blocks.length - 1].block_number + 1 : 42000000;
        const txC = 120 + Math.floor(Math.random() * 200);
        const bFee = 0.01 + Math.random() * 0.05;
        let fakeHash = '0x';
        const hexChars = '0123456789abcdef';
        for (let h = 0; h < 64; h++) fakeHash += hexChars[Math.floor(Math.random() * 16)];
        const ts = Math.floor(Date.now() / 1000);
        const vUsd = txC * (1000 + Math.random() * 5000);
        const wFlag = txC > 250 ? 1 : 0;
        processNewBlock(bNum, txC, bFee, fakeHash, ts, wFlag, vUsd);
    });
}


