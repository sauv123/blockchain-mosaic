let vrTooltipMesh, vrTooltipCtx, vrTooltipTex;
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let renderScale = 'MICRO';


// === TEMPORAL DATA ENGINE (Circadian Sorting) ===
// This physically changes the mathematical layout of the mosaic
function getTemporalSortedBlocks(blocksArray, cState) {
  // Always create a fresh shallow copy to sort without mutating the main feed
  const b = [...blocksArray];
  
  if (cState === 'MORNING') {
    // 1. Organic Growth / Category Islands
    // Sort purely by the block's dominant hue (category: NFTs, Swaps, Transfers)
    b.sort((x, y) => x.hue - y.hue);
  } else if (cState === 'AFTERNOON') {
    // 2. Chronological flow (High action, standard ticker)
    // Keep it exactly chronological
  } else if (cState === 'EVENING') {
    // 3. Value Gravity (Whales pull to the center/top)
    // Sort by Whale status and then by complexity (financial density)
    b.sort((x, y) => (y.whale_flag || 0) - (x.whale_flag || 0) || y.complexity - x.complexity);
  } else if (cState === 'NIGHT') {
    // 4. Harmonic Resonance (Gradient of complexity)
    // Sort mathematically by complexity to create a perfect, calming gradient
    b.sort((x, y) => x.complexity - y.complexity);
  }
  
  return b;
}



// === MARKET PHASE & CIRCADIAN PHYSICS ENGINE ===
// Driven completely by actual transaction data + local time context

function getNetworkFactor(block) {
  if (!block) return 'ACTIVE';
  
  // Calculate raw intensity based on actual transactions
  const txDensity = block.tx_count / 300; // 0.0 to 1.0+
  const smartContractFriction = block.contract_ratio || 0.2; 
  
  if (txDensity > 0.75 && smartContractFriction > 0.5) return 'SPIKE';        // Intense volume + high friction
  if (txDensity > 0.65 && smartContractFriction <= 0.5) return 'ACCUMULATION'; // Heavy volume, simple transfers (Whale accumulation)
  if (txDensity < 0.25) return 'QUIET';                                        // Very low activity
  return 'ACTIVE';                                                             // Standard market flow
}

// Global Time getter
function getLocalTimePhase() {
  const hr = new Date().getHours();
  if (hr >= 6 && hr < 12) return 'MORNING';
  if (hr >= 12 && hr < 17) return 'AFTERNOON';
  if (hr >= 17 && hr < 22) return 'EVENING';
  return 'NIGHT';
}

function getPhasePhysics(factor) {
  // Returns [gutter, shimmerSpeed, cullingThreshold]
  if (factor === 'SPIKE') return [0, 400, -0.8];         // Massive solid wall, violent vibration, dense
  if (factor === 'ACCUMULATION') return [0.5, 2000, -0.4]; // Tight heavy blocks, slow heavy pulse
  if (factor === 'QUIET') return [3.5, 4500, 0.4];       // Spread out, extremely slow breathing, sparse
  return [1.2, 1800, 0.0];                               // Standard 'ACTIVE' grid
}

function getTimeOfDayDrift(col, row, cols, rows, factor, timePhase) {
  let driftX = 0; let driftY = 0;
  
  // The intensity of the Time of Day effect scales with the Network Factor
  let multiplier = 1.0;
  if (factor === 'SPIKE') multiplier = 3.5;
  if (factor === 'ACCUMULATION') multiplier = 2.0;
  if (factor === 'QUIET') multiplier = 0.5;

  if (timePhase === 'MORNING') {
    // Organic upward blooming (Market waking up)
    driftY = -Math.abs(Math.sin(col * 0.2 + row * 0.1)) * 4 * multiplier;
  } 
  else if (timePhase === 'EVENING') {
    // Gravity well / Consolidation towards center as volume peaks
    const dx = col - (cols/2);
    const dy = row - (rows/2);
    const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy));
    driftX = -(dx / dist) * 1.5 * multiplier;
    driftY = -(dy / dist) * 1.5 * multiplier;
  }
  else if (timePhase === 'NIGHT') {
    // Digital fragmentation / sleep mode (Blocks stagger horizontally)
    driftX = (row % 2 === 0) ? (1.5 * multiplier) : (-1.5 * multiplier);
  }
  // AFTERNOON remains neutral standard layout
  
  return { dx: driftX, dy: driftY };
}

function getCircadianState() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 21) return 'EVENING';
  return 'NIGHT';
}

function applyCircadianAmbientLayer(ctx, width, height, state) {
  if (currentTheme !== 'charcoal') return;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (state === 'MORNING') {
    grad.addColorStop(0, 'rgba(60, 100, 200, 0.25)'); // Soft dawn blue
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (state === 'AFTERNOON') {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.05)'); // Neutral
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (state === 'EVENING') {
    grad.addColorStop(0, 'rgba(255, 80, 0, 0.25)'); // Sunset amber glow
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)'); // Deep shadow
    grad.addColorStop(1, 'rgba(5, 5, 15, 0.4)'); // Void
  }

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}


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

const humanLabels = {
  'Plain Transfer': 'Direct Payment (Sending money)',
  'Token Swap': 'Currency Exchange (Trading coins)',
  'NFT Mint': 'Digital Art (Collectibles)',
  'Contract Creation': 'Automated Code',
  'Staking': 'Earning Interest'
};

const PALETTES = {

  'electricBlue': {
    'Plain Transfer': '#00d2ff', // Bright Cyan
    'Token Swap': '#0044ff',     // Deep Royal Blue
    'NFT Mint': '#8a2be2',       // Purple / Blue Violet
    'Contract Call': '#ffffff',  // Crisp White
    'default': '#00b4d8'
  },

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

};

// Themes

// === PREMIUM CUSTOM SELECT UI INIT ===
function initCustomSelects() {
  document.querySelectorAll('select').forEach(select => {
    if(select.classList.contains('native-hidden')) return;
    select.classList.add('native-hidden');
    
    const customSelect = document.createElement('div');
    customSelect.className = 'custom-select';
    
    const selectedDisplay = document.createElement('div');
    selectedDisplay.className = 'custom-select-display';
    selectedDisplay.innerText = select.options[select.selectedIndex]?.text || '';
    
    const optionsList = document.createElement('ul');
    optionsList.className = 'custom-select-options';
    
    Array.from(select.options).forEach((opt, idx) => {
      const li = document.createElement('li');
      li.innerText = opt.text;
      if(idx === select.selectedIndex) li.classList.add('selected');
      
      li.onclick = () => {
         select.selectedIndex = idx;
         selectedDisplay.innerText = opt.text;
         select.dispatchEvent(new Event('change'));
         optionsList.classList.remove('show');
         optionsList.querySelectorAll('li').forEach(l => l.classList.remove('selected'));
         li.classList.add('selected');
      };
      optionsList.appendChild(li);
    });
    
    selectedDisplay.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-options').forEach(ul => {
         if(ul !== optionsList) ul.classList.remove('show');
      });
      optionsList.classList.toggle('show');
    };
    
    customSelect.appendChild(selectedDisplay);
    customSelect.appendChild(optionsList);
    select.parentNode.insertBefore(customSelect, select.nextSibling);
  });

  document.addEventListener('click', () => {
     document.querySelectorAll('.custom-select-options').forEach(ul => ul.classList.remove('show'));
  });
}

function syncBodyTheme() {
  document.body.classList.remove('theme-warmGray', 'theme-charcoal');
  document.body.classList.add('theme-' + currentTheme);
}

const THEMES = {
  warmGray: {
    bg: '#ffffff',
    tileBg: '#f2f2f7',
    accent: 'hsl(220, 85%, 50%)',
    text: '#1c1c1e',
    gridLine: 'rgba(0, 0, 0, 0.05)',
    accentLight: '#ffffff',
    graphNode: '#007aff',
    graphText: '#1c1c1e'
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
    
    // Sonography logic: Adjust intensity/pitch based on the 0-24hr phase in historical mode
    let timePhaseMult = 1.0;
    if (typeof currentMode !== 'undefined' && currentMode === 'HISTORICAL' && typeof playbackFullList !== 'undefined' && playbackFullList.length > 0) {
        const progress = typeof blocks !== 'undefined' ? (blocks.length / playbackFullList.length) : 1.0;
        // The day ramps up to a crescendo at evening (0.75 progress) and falls at night
        timePhaseMult = 0.5 + Math.sin(progress * Math.PI) * 1.5; 
    }

    if (this.muted || !this.ctx) return;

    const hashVal = parseInt(block.hash.substring(8, 12), 16);
    const noteFreq = this.scale[hashVal % this.scale.length] * (timePhaseMult > 1.2 ? 1.5 : (timePhaseMult < 0.8 ? 0.5 : 1.0));
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
const scaleToggleBtn = document.getElementById('scale-toggle-btn');
const scaleBtnText = document.getElementById('scale-btn-text');

function updateScaleUI() {
  if (scaleBtnText) {
    if (renderScale === 'MICRO') {
      scaleBtnText.textContent = 'VIEW: SOLID PORTRAIT';
    } else {
      scaleBtnText.textContent = 'VIEW: INDIVIDUAL PAYMENTS';
    }
  }
}

if (scaleToggleBtn) {
  scaleToggleBtn.addEventListener('click', () => {
    lastInteractionTime = Date.now();
    renderScale = renderScale === 'MICRO' ? 'MACRO' : 'MICRO';
    updateScaleUI();
  });
}

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
      if (currentMode === 'ART_SYNTHESIS') {
        // Toggle BACK to Individual Payments
        currentMode = 'HISTORICAL';
        renderScale = 'MICRO';
        genPortraitBtn.textContent = 'View Portrait';
        genPortraitBtn.style.color = '#00ff88';
        genPortraitBtn.style.borderColor = 'rgba(0,255,136,0.4)';
        genPortraitBtn.style.background = 'rgba(0,255,136,0.12)';
        
        // Hide the overlay text
        const artOv = document.getElementById('art-synthesis-overlay');
        if (artOv) { artOv.style.display = 'none'; }
        
        // Restore slider scrub state blocks
        blocks = playbackFullList.slice(0, playbackIndex);
        updateStats();
        
      } else {
        // Toggle TO Solid Portrait
        const fullDayData = playbackFullList && playbackFullList.length > 0 ? playbackFullList : blocks;
        blocks = [...fullDayData]; // Ensure full canvas is available for mask
        
        genPortraitBtn.textContent = 'View Individual Payments';
        genPortraitBtn.style.color = '#ffffff';
        genPortraitBtn.style.borderColor = 'rgba(255,255,255,0.4)';
        genPortraitBtn.style.background = 'rgba(255,255,255,0.1)';
        
        triggerArtisticSynthesis(historicalDayNumber, fullDayData);
      }
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
  if (e.key === 'p' || e.key === 'P') {
    const genBtn = document.getElementById('generate-portrait-btn');
    if (genBtn && genBtn.offsetParent !== null) { // visible
      genBtn.click();
    }
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
  syncBodyTheme();
  const palette = PALETTES[currentPalette];
  
  if (false) {
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
  syncBodyTheme();
  const palette = PALETTES[currentPalette];
  
  if (!legendContainer) return;
  
  if (false) {
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
  newBlock._liveMintedTime = Date.now();
              blocks.push(newBlock);
              
              if (typeof window.updateBillboard === 'function') {
                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : ((newBlock.tx_count||0) * 45 + (newBlock.largest_tx_value_usd || 0));
                  const txCount = newBlock.transactions ? newBlock.transactions.length : (newBlock.tx_count || 0);
                  
                  // Set notification text for the billboard
                  window.lastNotificationTime = Date.now();
                  if (newBlock.whale_flag === 1) {
                      window.lastNotificationText = `🚨 WHALE DETECTED: $${Math.round(val).toLocaleString()} 🚨`;
                  } else {
                      window.lastNotificationText = `NEW BLOCK: ${txCount} TRANSACTIONS`;
                  }
                  
                  // ==========================================
                  // 3D ELEGANT SLIDE ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)'; // default
                      if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      
                      // Update particles ONLY if the global theme changes. We'll do this outside the smash block!
                      
                      // Create a physical glowing block
                      const blockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      
                      // Start it underground below the main panel
                      physicalBlock.position.set(0, -3.0, -1.0); 
                      xrScene.add(physicalBlock);
                      
                      if (typeof gsap !== 'undefined') {
                          // ELEGANT SLIDE: from underneath the FRONT of the curved panel
                          physicalBlock.position.set(0, -3.0, -4.5); // Start below the giant screen
                          
                          gsap.to(physicalBlock.position, {
                              y: 1.8, z: -4.5, duration: 2.0, ease: 'power2.out', 
                              onComplete: () => {
                                  xrScene.remove(physicalBlock);
                                  physicalBlock.geometry.dispose();
                                  physicalBlock.material.dispose();
                              }
                          });
                      }
                  }


              }
              
              if (typeof gsap !== 'undefined' && window.xrGridHelper) {
                  // Ground Pulse Animation
                  gsap.fromTo(window.xrGridHelper.material.color, 
                     {r: 0, g: 1, b: 0}, 
                     {r: 0, g: 1, b: 0.53, duration: 1.0, ease: 'power2.out'}
                  );
                  gsap.fromTo(window.xrGridHelper.position,
                     {y: -2.0}, {y: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)'}
                  );
                  // Make the grid flash white
                  window.xrGridHelper.material.color.setHex(0xffffff);
                  gsap.to(window.xrGridHelper.material.color, {r: 0, g: 1, b: 0.53, duration: 0.8, ease: 'power2.out'});
              }
              
              if (newBlock.whale_flag === 1 && typeof xrScene !== 'undefined') {
                  // MASSIVE WHALE FLASH IN VR
                  gsap.to(xrScene.background, { r: 1.0, g: 1.0, b: 1.0, duration: 0.1, yoyo: true, repeat: 1 });
                  if (navigator.vibrate) navigator.vibrate([100, 50, 200]); // browser vibe
              } if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);
  
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

  // Calculate dynamic gutter for the whole frame
  

  const theme = THEMES[currentTheme];
  syncBodyTheme();
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

// Draw Loop
function draw(timestamp) {

  


  // ART_SYNTHESIS: canvas filter applied via CSS — no separate draw path needed

  const theme = THEMES[currentTheme];
  syncBodyTheme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  

  // Smooth interpolate canvas tilt for Focus Mode
  if (currentMode !== 'ART_SYNTHESIS') {
    currentTiltX += (targetTiltX - currentTiltX) * 0.05;
    currentTiltY += (targetTiltY - currentTiltY) * 0.05;
    if (Math.abs(currentTiltX) > 0.01 || Math.abs(currentTiltY) > 0.01) {
      canvas.style.transform = `rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg) translateZ(0)`;
    } else if (canvas.style.transform) {
      canvas.style.transform = '';
    }
  }

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
    
    // ALWAYS MATCH PARTICLES TO GLOBAL THEME
    if (window.xrParticles) {
        let accent = '#00ff88';
        if (window.currentThemeObj && window.currentThemeObj.accent) {
            accent = window.currentThemeObj.accent;
        } else if (typeof THEMES !== 'undefined' && typeof currentTheme !== 'undefined' && THEMES[currentTheme]) {
            accent = THEMES[currentTheme].accent;
        }
        if (!window.lastParticleAccent || window.lastParticleAccent !== accent) {
            window.lastParticleAccent = accent;
            const tColor = new THREE.Color().setStyle(accent);
            const colors = window.xrParticles.geometry.attributes.color.array;
            for(let c=0; c<colors.length; c+=3) {
                colors[c] = tColor.r;
                colors[c+1] = tColor.g;
                colors[c+2] = tColor.b;
            }
            window.xrParticles.geometry.attributes.color.needsUpdate = true;
        }
    }
    if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {
      // Three.js WebXR requires setAnimationLoop, so we skip manual requestAnimationFrame
    } else {
      requestAnimationFrame(draw);
    }
    return;
  }

  const category = currentMode === 'HISTORICAL' ? getCategoryForDay(historicalDayNumber) : null;

  
  

  
  const timePhase = getLocalTimePhase();
  
  
  
  if (currentMode === 'HISTORICAL') {
    // Determine 0 to 24 hour state based on playback progress
    const progress = (typeof playbackFullList !== 'undefined' && playbackFullList.length > 0) ? (blocks.length / playbackFullList.length) : 1.0;
    const currentHour = Math.floor(progress * 24);
    const hourMins = Math.floor((progress * 24 * 60) % 60);
    const formattedHour = (currentHour < 10 ? '0' : '') + currentHour + ':' + (hourMins < 10 ? '0' : '') + hourMins;
    if (window.cachedHourDisplay === undefined) {
       window.cachedHourDisplay = document.getElementById('playback-hour-display');
    }
    if (window.cachedHourDisplay && window.lastFormattedHour !== formattedHour) {
       window.cachedHourDisplay.innerText = formattedHour;
       window.lastFormattedHour = formattedHour;
    }
  }
  
  for (let index = 0; index < blocks.length; index++) {


    const block = blocks[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * tileSize;
    const y = row * tileSize;

    const prevBlock = index > 0 ? blocks[index - 1] : null;
    const blockInterval = prevBlock ? Math.max(1, block.timestamp - prevBlock.timestamp) : 12;
    
    // Calculate exact network phase based on the transaction data itself!
    const networkFactor = currentMode === 'HISTORICAL' 
       ? (index % 7 === 0 ? 'SPIKE' : (index % 4 === 0 ? 'ACCUMULATION' : 'ACTIVE')) // Simulated for archive preview
       : getNetworkFactor(block);
       
    const [phaseGutter, phaseShimmerSpeed, cullThreshold] = getPhasePhysics(networkFactor);
    
    // Shape Culling (only for historical generative shapes and portraits)
    let isOnTemplate = true;
    if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
       const category = getCategoryForDay(historicalDayNumber);
       isOnTemplate = getDailyMaskAlignment(col, row, category);
    }

    let progress = 1.0;
    if (currentMode === 'LIVE' && block.block_number === incomingBlockNum) {
      const elapsed = Date.now() - incomingBlockStartTime;
      progress = Math.min(elapsed / PAINT_DURATION, 1.0);
    }

    const phaseShift = (col + row) * 0.15;
    const tileShimmer = Math.sin(Date.now() / phaseShimmerSpeed + phaseShift) * 0.03 + 0.97;

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

    // 1. Organic Spatial Drift (Focus Mode Sine Wave)
    let floatX = 0;
    let floatY = 0;
    if (focusFloatProgress.value > 0) {
      const timeFactor = Date.now() * 0.0012;
      floatX = Math.sin(timeFactor + col * 0.5 + row * 0.3) * 8 * focusFloatProgress.value;
      floatY = Math.cos(timeFactor + col * 0.3 + row * 0.5) * 8 * focusFloatProgress.value;
    }
    
    // 2. TIME OF DAY MODIFIER (The physical layout warps based on Morning/Evening interacting with Network Factor)
    const todDrift = getTimeOfDayDrift(col, row, cols, rows, networkFactor, timePhase);
    floatX += todDrift.dx;
    floatY += todDrift.dy;

    // 3. Click Radial Wave Ripple Effect calculation
    let rippleAlphaModifier = 1.0;
    if (rippleOriginCol !== -1 && rippleProgress.value > 0 && rippleProgress.value < 1.0) {
      const dist = Math.sqrt(Math.pow(col - rippleOriginCol, 2) + Math.pow(row - rippleOriginRow, 2));
      const targetRadius = rippleProgress.value * Math.max(cols, rows) * 1.5;
      const width = 2.5;
      if (Math.abs(dist - targetRadius) < width) {
        const factor = 1.0 - (Math.abs(dist - targetRadius) / width);
        rippleAlphaModifier = 1.0 + factor * 1.5;
      }
    }

    drawTile(ctx, x + floatX, y + floatY, tileSize - phaseGutter, block, blockInterval, progress * tileShimmer * rippleAlphaModifier, theme, isTracked, trackDirection, isOnTemplate);
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
      // Restored the intense hover glow effect
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, size, size);
      ctx.restore();
    }
  }

  if (detailsSidebar && detailsSidebar.classList.contains('open') && Date.now() - lastInteractionTime > DISMISS_TIMEOUT) {
    detailsSidebar.classList.remove('open');
    canvasContainer.classList.remove('sidebar-open');
    activePopoverBlock = null;
    setTimeout(resizeCanvas, 420);
  }

    // Render Shockwaves
  if (currentMode !== 'ART_SYNTHESIS') {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      let sw = shockwaves[i];
      sw.radius += 3;
      sw.opacity -= 0.015;
      
      if (sw.opacity <= 0) {
        shockwaves.splice(i, 1);
        continue;
      }
      
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      if (sw.isWhale) {
        ctx.strokeStyle = `rgba(255, 215, 0, ${sw.opacity})`; // Gold whale pulse
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
      } else {
        ctx.strokeStyle = `rgba(0, 255, 136, ${sw.opacity})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {
      // Three.js WebXR requires setAnimationLoop, so we skip manual requestAnimationFrame
    } else {
      requestAnimationFrame(draw);
    }
  if (typeof updateXRInteraction === "function") updateXRInteraction();
  if (typeof xrRenderer !== "undefined" && xrRenderer.xr.isPresenting) { xrRenderer.render(xrScene, xrCamera); }
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
  
  // === PREMIUM 3D GLASS PANE BACKGROUND ===
  const radius = size > 20 ? 8 : 2;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  
  // Inner gradient for glass depth
  const gradBg = ctx.createLinearGradient(x, y, x, y + size);
  gradBg.addColorStop(0, isOnTemplate ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)');
  gradBg.addColorStop(1, 'rgba(0,0,0,0.2)');
  
  ctx.fillStyle = gradBg;
  ctx.fill();
  
  // Subtle outer glass rim (eliminates the "flat outline" look)
  ctx.lineWidth = 1;
  ctx.strokeStyle = isOnTemplate ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';
  ctx.stroke();

  const density = Math.max(0.1, Math.min(0.85, block.tx_count / 300));
  const targetOnCount = Math.max(6, Math.floor(density * 64));
  const regularity = 1.0 - block.contract_ratio;
  const activeCells = getSubpixelLayout(hash, targetOnCount, regularity);

  const edgeFadeFactor = Math.max(0, Math.min(0.75, (blockInterval - 8) / 16));
  const subSize = size / 8;

  const whaleIndex1 = parseInt(hash.substring(0, 2), 16) % targetOnCount;
  const whaleIndex2 = parseInt(hash.substring(2, 4), 16) % targetOnCount;

  const txs = getBlockTransactions(block);

  if (renderScale === 'MACRO') {
    // 1. Calculate true dominant transaction type
    let dominantType = 'Plain Transfer';
    let maxCount = 0;
    if (txs && txs.length > 0) {
      let typeCounts = {};
      for (let i = 0; i < txs.length; i++) {
        let type = txs[i].type || 'Plain Transfer';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        if (typeCounts[type] > maxCount) {
          maxCount = typeCounts[type];
          dominantType = type;
        }
      }
    }
    
    // 2. Fetch color from palette safely
    const baseColor = PALETTES[currentPalette][dominantType] || PALETTES[currentPalette]['default'] || 'hsl(210, 100%, 50%)';
    
    let isDimmed = false;
    let isFilteredMatch = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      if (dominantType !== clickedLegendFilter) isDimmed = true;
      else isFilteredMatch = true;
    }
    const isBlockHovered = (typeof hoveredBlock !== 'undefined' && block === hoveredBlock);
    
    ctx.save();
    
    // 3. Shape the portrait using the template
    if (!isOnTemplate) { 
      ctx.restore(); 
      return; // Absolutely NO background. Pure geometric shape to satisfy user demand.
    }
    
    ctx.globalAlpha = isDimmed ? 0.15 : 1.0;
    
    // 4. Fill the massive solid square with the completely dominant color!
    ctx.fillStyle = baseColor;
    
    // Premium Drop Shadow & Rounded Tile Look for MACRO
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, size - 2, size - 2, size > 20 ? 6 : 2);
    ctx.fill();
    
    // Clear shadow so it doesn't pollute strokes
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    if (isFilteredMatch || isBlockHovered) {
       ctx.shadowColor = baseColor;
       ctx.shadowBlur = 20;
       ctx.strokeStyle = 'rgba(255,255,255,0.85)';
       ctx.lineWidth = 2.5;
       ctx.beginPath();
       ctx.roundRect(x + 1, y + 1, size - 2, size - 2, size > 20 ? 6 : 2);
       ctx.stroke();
    }
    ctx.restore();
  } // END MACRO

  if (renderScale === 'MICRO') {
    ctx.save();
    const maskModifier = isOnTemplate ? 1.0 : 0.05;
    let isDimmed = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      // In MICRO, we don't have domCat yet, so we don't dim the whole block blindly, we just let individual cells draw.
      // But we can check if there are ANY transactions of the clicked type in this block.
      const hasMatch = txs.some(t => t.type === clickedLegendFilter);
      if (!hasMatch) isDimmed = true;
    }
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);
    const subSize = size / 8;
    
    activeCells.forEach(cell => {
      const tx = txs[cell.index % txs.length] || { type: 'Plain Transfer' };
      const cellColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
      ctx.fillStyle = cellColor;
      
      // Slight margin for subpixels so they look like a grid
      ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    });
    ctx.restore();
  }


  if (isTracked) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    // Add intense visual tracking glow
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + size/2 - 2, y + size/2 - 2, 4, 4);
    ctx.shadowBlur = 0;
  }

  
  // === WHALE FLASH ANIMATION ===
  if (block.whale_flag === 1) {
      // Elegant pulsing flash instead of shockwaves/diamonds
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2; // 0.0 to 1.0 fast pulse
      
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15 + (pulse * 15); // Pulsing glow from 15px to 30px
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.6})`; // Pulsing opacity 0.4 to 1.0
      
      if (renderScale === 'MACRO') {
          ctx.fillRect(x, y, size, size);
      } else {
          // In MICRO, outline the micro-grid
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.4})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, size, size);
      }
      ctx.restore();
  }


}

// Websocket sync
function connectRelay() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  let candidateUrls = [];
  if (isLocalHost) {
    const candidatePorts = [8086, 8080, 8087, 8088];
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
      window._wsReconnectDelay = (window._wsReconnectDelay || 1000) * 1.5;
      if (window._wsReconnectDelay > 30000) window._wsReconnectDelay = 30000;
      setTimeout(connectRelay, window._wsReconnectDelay);
      return;
    }

    const wsUrl = candidateUrls[currentIndex];
    currentIndex += 1;
    
    // Add Reconnecting UI status
    const liveStatus = document.querySelector('.status-indicator');
    if (liveStatus && currentMode === 'LIVE') {
       liveStatus.style.background = '#ffaa00';
       liveStatus.style.animation = 'none';
       liveStatus.title = 'Reconnecting...';
    }

    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      window._wsReconnectDelay = 1000; // reset backoff
      if (liveStatus && currentMode === 'LIVE') {
         liveStatus.style.background = '#00ff88';
         liveStatus.style.animation = 'liveGlow 2s ease-out infinite';
         liveStatus.title = 'Live';
      }

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
              newBlock._liveMintedTime = Date.now();
              blocks.push(newBlock);
              
              if (typeof window.updateBillboard === 'function') {
                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : ((newBlock.tx_count||0) * 45 + (newBlock.largest_tx_value_usd || 0));
                  const txCount = newBlock.transactions ? newBlock.transactions.length : (newBlock.tx_count || 0);
                  
                  // Set notification text for the billboard
                  window.lastNotificationTime = Date.now();
                  if (newBlock.whale_flag === 1) {
                      window.lastNotificationText = `🚨 WHALE DETECTED: $${Math.round(val).toLocaleString()} 🚨`;
                  } else {
                      window.lastNotificationText = `NEW BLOCK: ${txCount} TRANSACTIONS`;
                  }
                  
                  // ==========================================
                  // 3D ELEGANT SLIDE ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)'; // default
                      if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      
                      // Update particles ONLY if the global theme changes. We'll do this outside the smash block!
                      
                      // Create a physical glowing block
                      const blockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      
                      // Start it underground below the main panel
                      physicalBlock.position.set(0, -3.0, -1.0); 
                      xrScene.add(physicalBlock);
                      
                      if (typeof gsap !== 'undefined') {
                          // ELEGANT SLIDE: from underneath the FRONT of the curved panel
                          physicalBlock.position.set(0, -3.0, -4.5); // Start below the giant screen
                          
                          gsap.to(physicalBlock.position, {
                              y: 1.8, z: -4.5, duration: 2.0, ease: 'power2.out', 
                              onComplete: () => {
                                  xrScene.remove(physicalBlock);
                                  physicalBlock.geometry.dispose();
                                  physicalBlock.material.dispose();
                              }
                          });
                      }
                  }


              }
              
              if (typeof gsap !== 'undefined' && window.xrGridHelper) {
                  // Ground Pulse Animation
                  gsap.fromTo(window.xrGridHelper.material.color, 
                     {r: 0, g: 1, b: 0}, 
                     {r: 0, g: 1, b: 0.53, duration: 1.0, ease: 'power2.out'}
                  );
                  gsap.fromTo(window.xrGridHelper.position,
                     {y: -2.0}, {y: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)'}
                  );
                  // Make the grid flash white
                  window.xrGridHelper.material.color.setHex(0xffffff);
                  gsap.to(window.xrGridHelper.material.color, {r: 0, g: 1, b: 0.53, duration: 0.8, ease: 'power2.out'});
              }
              
              if (newBlock.whale_flag === 1 && typeof xrScene !== 'undefined') {
                  // MASSIVE WHALE FLASH IN VR
                  gsap.to(xrScene.background, { r: 1.0, g: 1.0, b: 1.0, duration: 0.1, yoyo: true, repeat: 1 });
                  if (navigator.vibrate) navigator.vibrate([100, 50, 200]); // browser vibe
              } if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);

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
          newBlock._liveMintedTime = Date.now();
              blocks.push(newBlock);
              
              if (typeof window.updateBillboard === 'function') {
                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : ((newBlock.tx_count||0) * 45 + (newBlock.largest_tx_value_usd || 0));
                  const txCount = newBlock.transactions ? newBlock.transactions.length : (newBlock.tx_count || 0);
                  
                  // Set notification text for the billboard
                  window.lastNotificationTime = Date.now();
                  if (newBlock.whale_flag === 1) {
                      window.lastNotificationText = `🚨 WHALE DETECTED: $${Math.round(val).toLocaleString()} 🚨`;
                  } else {
                      window.lastNotificationText = `NEW BLOCK: ${txCount} TRANSACTIONS`;
                  }
                  
                  // ==========================================
                  // 3D ELEGANT SLIDE ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)'; // default
                      if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      
                      // Update particles ONLY if the global theme changes. We'll do this outside the smash block!
                      
                      // Create a physical glowing block
                      const blockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      
                      // Start it underground below the main panel
                      physicalBlock.position.set(0, -3.0, -1.0); 
                      xrScene.add(physicalBlock);
                      
                      if (typeof gsap !== 'undefined') {
                          // ELEGANT SLIDE: from underneath the FRONT of the curved panel
                          physicalBlock.position.set(0, -3.0, -4.5); // Start below the giant screen
                          
                          gsap.to(physicalBlock.position, {
                              y: 1.8, z: -4.5, duration: 2.0, ease: 'power2.out', 
                              onComplete: () => {
                                  xrScene.remove(physicalBlock);
                                  physicalBlock.geometry.dispose();
                                  physicalBlock.material.dispose();
                              }
                          });
                      }
                  }


              }
              
              if (typeof gsap !== 'undefined' && window.xrGridHelper) {
                  // Ground Pulse Animation
                  gsap.fromTo(window.xrGridHelper.material.color, 
                     {r: 0, g: 1, b: 0}, 
                     {r: 0, g: 1, b: 0.53, duration: 1.0, ease: 'power2.out'}
                  );
                  gsap.fromTo(window.xrGridHelper.position,
                     {y: -2.0}, {y: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)'}
                  );
                  // Make the grid flash white
                  window.xrGridHelper.material.color.setHex(0xffffff);
                  gsap.to(window.xrGridHelper.material.color, {r: 0, g: 1, b: 0.53, duration: 0.8, ease: 'power2.out'});
              }
              
              if (newBlock.whale_flag === 1 && typeof xrScene !== 'undefined') {
                  // MASSIVE WHALE FLASH IN VR
                  gsap.to(xrScene.background, { r: 1.0, g: 1.0, b: 1.0, duration: 0.1, yoyo: true, repeat: 1 });
                  if (navigator.vibrate) navigator.vibrate([100, 50, 200]); // browser vibe
              } if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);
          
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
    if (typeof window.sessionTotalTx === 'undefined') {
      window.sessionTotalTx = 0;
      window.sessionTotalUsd = 0;
      window.sessionDirectCount = 0;
      window.tickerProxy = { count: 0, usd: 0 };
    }
    
    let changed = false;
    blocks.forEach(b => {
      if (!b._counted) {
        window.sessionTotalTx += b.tx_count;
        const txs = getBlockTransactions(b);
        txs.forEach(t => {
          window.sessionTotalUsd += t.valueUsd || 0;
          if (t.type === 'Plain Transfer') window.sessionDirectCount++;
        });
        b._counted = true;
        changed = true;
      }
    });
    
    let totalTx = window.sessionTotalTx;
    let totalUsd = window.sessionTotalUsd;
    let directCount = window.sessionDirectCount;

    let weatherCondition = "calm and quiet";
    if (totalUsd > 10000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (totalTx > 1000) weatherCondition = "highly congested and expensive";
    else if (directCount > totalTx * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const numColor = '#ffffff';
    
    if (!weatherLine.hasAttribute('data-initialized')) {
      weatherLine.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; font-weight: 200; font-size: clamp(32px, 4vw, 54px); letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 8px;">
          Today, 
          <div style="display: inline-block; perspective: 400px; vertical-align: bottom;">
            <span id="ticker-count" style="display: inline-block; font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 4px 16px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2); transform-style: preserve-3d; will-change: transform;">0</span>
          </div> 
          human payments moved 
          <div style="display: inline-block; perspective: 400px; vertical-align: bottom;">
            <span id="ticker-usd" style="display: inline-block; font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 4px 16px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2); transform-style: preserve-3d; will-change: transform;">$0</span>
          </div>
        </div>
        <div id="ticker-prose" style="font-family: 'Outfit', sans-serif; font-size: clamp(16px, 2vw, 24px); font-style: italic; font-weight: 300; opacity: 0.6; letter-spacing: 0.05em; transition: opacity 0.5s;">
          The network weather is ${weatherCondition}.
        </div>
      `;
      weatherLine.setAttribute('data-initialized', 'true');
      
      // Inject hardware-accelerated breathing animation
      if (typeof gsap !== 'undefined') {
        gsap.to(weatherLine, {
          y: -4,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true
        });
      }
    }

    if (changed && typeof gsap !== 'undefined') {
      const elCount = document.getElementById('ticker-count');
      const elUsd = document.getElementById('ticker-usd');
      const elProse = document.getElementById('ticker-prose');
      
      if (elCount && elUsd && elProse) {
        elProse.textContent = `The network weather is ${weatherCondition}.`;
        
        // Wall Street Flip Animation
        gsap.timeline()
          .to([elCount, elUsd], { rotateX: 90, opacity: 0.5, duration: 0.25, ease: 'power2.in' })
          .to([elCount, elUsd], { rotateX: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
        
        gsap.to(window.tickerProxy, {
          count: directCount || 0,
          usd: totalUsd || 0,
          duration: 0.75,
          ease: 'power2.out',
          onUpdate: () => {
            const vUsd = window.tickerProxy.usd;
            const volStr = vUsd > 1000000 ? '$' + (vUsd / 1000000).toFixed(2) + 'M' : '$' + Math.floor(vUsd).toLocaleString();
            elCount.textContent = Math.floor(window.tickerProxy.count).toLocaleString();
            elUsd.textContent = volStr;
            elCount.style.color = '#ffffff';
            elUsd.style.color = '#ffffff';
          }
        });
      }
    }
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

  // GSAP Spring Tooltip Interpolation with Bounds Checking
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  hoverTooltip.style.visibility = 'hidden';
  hoverTooltip.classList.add('visible');
  const rect = hoverTooltip.getBoundingClientRect();
  hoverTooltip.style.visibility = '';
  
  let targetX = e.clientX + 20;
  let targetY = e.clientY + 20;
  
  if (targetX + rect.width > vw) targetX = e.clientX - rect.width - 20;
  if (targetY + rect.height > vh) targetY = e.clientY - rect.height - 20;

  if (typeof gsap !== 'undefined') {
    hoverTooltip.style.left = '0px';
    hoverTooltip.style.top = '0px';
    gsap.to(hoverTooltip, { 
      x: targetX, 
      y: targetY, 
      duration: 0.6, 
      ease: 'back.out(1.2)', // Premium spring physics
      overwrite: 'auto'
    });
  } else {
    hoverTooltip.style.left = `${targetX}px`;
    hoverTooltip.style.top = `${targetY}px`;
  }
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
  syncBodyTheme();

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
      
      // Phase 1: On-Chain Heatmap
      dayEl.style.color = '#fff';
      dayEl.style.border = '1px solid rgba(255,255,255,0.05)';
      if (category === 'zen') {
        dayEl.style.background = 'rgba(0, 255, 136, 0.04)';
      } else if (category === 'dragon') {
        dayEl.style.background = 'rgba(0, 255, 136, 0.25)';
        dayEl.style.boxShadow = '0 0 10px rgba(0,255,136,0.2)';
        dayEl.style.borderColor = 'rgba(0, 255, 136, 0.4)';
      } else {
        dayEl.style.background = 'rgba(0, 255, 136, 0.1)';
      }

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
function updatePlaybackTimeDisplay() {
  const hourDisplay = document.getElementById('playback-hour-display');
  if (hourDisplay && playbackFullList && playbackFullList.length > 0) {
    const ratio = playbackIndex / playbackFullList.length;
    const totalMinutes = ratio * 24 * 60;
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(Math.floor(totalMinutes % 60)).padStart(2, '0');
    if (hourDisplay.textContent !== `${hh}:${mm}`) {
      hourDisplay.textContent = `${hh}:${mm}`;
    }
  }
}

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
  updatePlaybackTimeDisplay();
  updatePlaybackTimeDisplay();
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
  updatePlaybackTimeDisplay();
  updatePlaybackTimeDisplay();
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
  // Beautiful scatter animation for blocks!
  if (typeof gsap !== 'undefined') {
      const cvsCont = document.getElementById('canvas-container');
      
      // Flash and blur the container
      gsap.to(cvsCont, { 
          filter: 'blur(20px) brightness(2)',
          scale: 0.9,
          duration: 0.4,
          ease: 'power2.in'
      });
      
      // Cinematic Calendar Transition: Color Shift and Lights!
      if (typeof xrScene !== 'undefined') {
          // Flash the entire void into a neon synthwave sunset
          gsap.to(xrScene.background, { r: 1.0, g: 0.0, b: 0.6, duration: 0.5, ease: 'power2.out' });
          gsap.to(xrScene.fog.color, { r: 1.0, g: 0.0, b: 0.6, duration: 0.5, ease: 'power2.out' });
      }

      // In 3D VR, explode the cubes outwards
      if (window.xrBlockMesh) {
          gsap.to(window.xrBlockMesh.position, {
              z: 5,
              y: -2,
              duration: 0.4,
              ease: 'power2.in'
          });
      }
      
      await new Promise(r => setTimeout(r, 450));
      
      // Restore gracefully
      gsap.to(cvsCont, { 
          filter: 'blur(0px) brightness(1)',
          scale: 1.0,
          duration: 1.2,
          ease: 'expo.out'
      });
      
      if (typeof xrScene !== 'undefined') {
          // Restore the deep void
          gsap.to(xrScene.background, { r: 0.0, g: 0.012, b: 0.031, duration: 1.5, ease: 'power2.in' });
          gsap.to(xrScene.fog.color, { r: 0.0, g: 0.012, b: 0.031, duration: 1.5, ease: 'power2.in' });
      }
      
      if (window.xrBlockMesh) {
          window.xrBlockMesh.position.set(0, 1.6, 0); // snap back
          // Add a bounce to the cubes' scale by triggering a global 'minted' flag
          if (blocks) {
             blocks.forEach(b => b._liveMintedTime = Date.now() + Math.random() * 500);
          }
      }
  }

  lastInteractionTime = Date.now();
  archiveDrawer.classList.remove('open');
  pausePlayback();

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
  renderScale = 'MICRO'; // Always start day playback in subpixel view
  
  const category = getCategoryForDay(dayNum);
  const categoryLabel = getCategoryLabel(category);
  
  liveIndicator.className = 'status-indicator historical-mode';
  modeStatusText.textContent = `Viewing Archives: ${categoryLabel}`;
  
  // Inject a floating context card explaining what the user is seeing
  let contextCard = document.getElementById('historical-context-card');
  if (!contextCard) {
    contextCard = document.createElement('div');
    contextCard.id = 'historical-context-card';
    Object.assign(contextCard.style, {
      position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '6000', background: 'rgba(10,12,16,0.88)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
      padding: '12px 20px', textAlign: 'center', pointerEvents: 'none', opacity: '0',
      fontFamily: "'Outfit', sans-serif", color: 'rgba(255,255,255,0.85)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: '520px', lineHeight: '1.5'
    });
    document.querySelector('.canvas-container').appendChild(contextCard);
  }

  const dateLabel = formattedFriendlyDate;
  contextCard.innerHTML = `
    <span style="font-family:'Space Mono',monospace; font-size:9px; letter-spacing:0.2em; text-transform:uppercase; opacity:0.5; display:block; margin-bottom:4px;">Archive</span>
    <span style="font-size:14px; font-weight:500;">${dateLabel} — ${categoryLabel}</span>
    <span style="display:block; font-size:12px; font-weight:300; opacity:0.65; margin-top:4px;">Each square = one block (~12s of time). Colors = transaction types. <strong style="color:#00ff88; font-weight:500;">View Portrait</strong> melts the grid into art.</span>
  `;
  contextCard.style.display = 'block';
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(contextCard, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    gsap.to(contextCard, { opacity: 0, y: -10, duration: 0.5, delay: 7, ease: 'power2.in', onComplete: () => { contextCard.style.display = 'none'; } });
  }
  
  statsBlockLabel.textContent = 'PORTRAIT DATE';
  statsFillLabel.textContent = 'BLOCKS MINED';
  
  if (historicalDateLabel) historicalDateLabel.textContent = `${formattedFriendlyDate} — ${categoryLabel}`;
  if (historicalBanner) historicalBanner.classList.add('active');
  
  // Phase 1: GSAP Crossfade Out
  if (typeof gsap !== 'undefined') {
    gsap.to(canvas, { opacity: 0.1, duration: 0.3, ease: 'power2.out' });
  }

  // Try to fetch real blocks from the backend
  let fetchedBlocks = [];
  try {
    // Resolve HTTP host address dynamically
    const protocol = window.location.protocol;
    const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `${window.location.hostname}:8086`
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
  
  // Fix calendar bug: Automatically start playback to watch it evolve!
  setTimeout(() => { startPlayback(); }, 500);
  
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

  // Reset canvas filter in case portrait mode was active
  const mosaicCanvas = document.getElementById('mosaic-canvas');
  if (mosaicCanvas) gsap.to(mosaicCanvas, { filter: 'saturate(100%) contrast(100%) brightness(1) blur(0px)', duration: 0.5 });
  const artOv = document.getElementById('art-synthesis-overlay');
  if (artOv) { artOv.style.display = 'none'; }
  
  const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.textContent = 'View Portrait';
    genPortraitBtn.style.color = '#00ff88';
    genPortraitBtn.style.borderColor = 'rgba(0,255,136,0.4)';
    genPortraitBtn.style.background = 'rgba(0,255,136,0.12)';
  }

  if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
    currentMode = 'LIVE';
    renderScale = 'MICRO';
    if (typeof updateScaleUI === 'function') updateScaleUI();
    
    // Phase 2: Exit Gallery Mode
    const header = document.querySelector('.app-header');
    const playCtrls = document.querySelector('.playback-controls');
    const canvasCont = document.getElementById('canvas-container');
    if (typeof gsap !== 'undefined') {
      if (header) gsap.to(header, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      if (playCtrls) gsap.to(playCtrls, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      if (canvasCont) gsap.to(canvasCont, { scale: 1.0, borderRadius: '0px', boxShadow: 'none', duration: 0.8, ease: 'power2.out' });
    }

    tileSize = 64;
    resizeCanvas();
    
    blocks = [...liveBlocksCache];
    
    liveIndicator.className = 'status-indicator live';
    modeStatusText.textContent = 'A Living Portrait of the Blockchain';
    statsBlockLabel.textContent = 'LATEST BLOCK';
    statsFillLabel.textContent = 'GRID FILL';
    
    if (historicalBanner) historicalBanner.classList.remove('active');
    updateStats();
    const ctxCard = document.getElementById('historical-context-card');
    if (ctxCard) ctxCard.style.display = 'none';
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
    const ts = document.getElementById('theme-select');
    if (ts) ts.value = currentTheme;
  }
  
  // Apply all settings after URL params are loaded
  applyAllSettings();

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
if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {
      // Three.js WebXR requires setAnimationLoop, so we skip manual requestAnimationFrame
    } else {
      requestAnimationFrame(draw);
    }
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
  filterCountTooltip.style.background = 'var(--panel-bg)';
  filterCountTooltip.style.border = '1px solid var(--border-color)';
  filterCountTooltip.style.backdropFilter = 'blur(20px)';
  filterCountTooltip.style.borderRadius = '12px';
  filterCountTooltip.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
  filterCountTooltip.style.padding = '12px 16px';
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
        <div style="font-family: 'Outfit', sans-serif; max-width: 280px; text-align: left; line-height: 1.6; padding: 8px 4px; color: var(--text-primary);">
          <div style="font-size: 11px; font-weight: 600; color: ${PALETTES[currentPalette][typeKey]}; margin-bottom: 10px; font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.15em; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${PALETTES[currentPalette][typeKey]}; box-shadow: 0 0 10px ${PALETTES[currentPalette][typeKey]};"></span>
            ${titleName}
          </div>
          <div style="color: var(--text-secondary); margin-bottom: 16px; font-weight: 300; font-size: 13px;">
            ${explanation}
          </div>
          <div style="display: flex; justify-content: space-between; font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 500; opacity: 0.9;">
            <span>${count.toLocaleString()} LIVE</span>
            <span>${usdString} MOVED</span>
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
  
  // Actually trigger the solid-color MACRO portrait view!
  renderScale = 'MACRO';
  if (typeof updateScaleUI === 'function') updateScaleUI();

  pausePlayback();
  
  // Use the blocks exactly as they were during playback — same data, same shape
  if (dayBlocks && dayBlocks.length > 0) {
    blocks = [...dayBlocks];
  } else {
    // Fallback: generate if no playback blocks provided
    blocks = generateMockHistoryForDate(selectedHistoricalDate || new Date().toISOString().split('T')[0]).slice(0, maxTiles);
  }
  
  let counts = { 'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Smart Contract': 0 };
  blocks.forEach(b => {
    getBlockTransactions(b).forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
  });
  let dominantType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) weatherLine.style.display = 'none';
  document.getElementById('archive-drawer').classList.remove('open');
  document.querySelector('.canvas-container').classList.remove('sidebar-open');
  
  // Phase 2: Gallery Mode UI Pushback
  const header = document.querySelector('.app-header');
  const playCtrls = document.querySelector('.playback-controls');
  const canvasCont = document.getElementById('canvas-container');
  if (typeof gsap !== 'undefined') {
    if (header) gsap.to(header, { opacity: isVRActive ? 0.9 : 0.1, y: 0, duration: 0.8, ease: 'power3.out' });
    if (playCtrls) gsap.to(playCtrls, { opacity: 0.1, y: 20, duration: 0.8, ease: 'power3.out' });
    if (canvasCont) {
      canvasCont.style.transition = 'none'; // let GSAP handle it
      gsap.to(canvasCont, { scale: 0.85, borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)', duration: 1.2, ease: 'expo.out' });
    }
  }

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
    artOverlay.style.bottom = '180px';
    artOverlay.style.left = '50%';
    artOverlay.style.transform = 'translateX(-50%)';
    artOverlay.style.zIndex = '9000';
    artOverlay.style.background = 'radial-gradient(circle, rgba(10,12,16,0.6) 0%, rgba(10,12,16,0) 60%)';
    artOverlay.style.padding = '40px';
    artOverlay.style.textAlign = 'center';
    artOverlay.style.color = '#fff';
    artOverlay.style.pointerEvents = 'none';
    
    artOverlay.innerHTML = `
      <div style="font-family: 'Space Mono', monospace; font-size: 14px; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">Synthesis Complete</div>
      <div id="art-portrait-title" style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">PORTRAIT OF JULY ${day}, 2026</div>
      <div id="art-portrait-story" style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 300; color: rgba(255,255,255,0.8); max-width: 600px; margin: 0 auto 24px auto; line-height: 1.5; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">${storyText}</div>
      <button id="art-return-btn" style="pointer-events: auto; padding: 12px 30px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 30px; font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 600; text-transform: uppercase; cursor: pointer; letter-spacing: 0.12em; backdrop-filter: blur(10px);">Return to Live Grid</button>
    `;
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(artOverlay, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' });
    }
    document.body.appendChild(artOverlay);
    setTimeout(() => {
      const retBtn = document.getElementById('art-return-btn');
      if (retBtn) {
        retBtn.addEventListener('click', () => {
          artOverlay.style.display = 'none';
          if (typeof returnToLive === 'function') returnToLive();
          else if (document.getElementById('return-live-btn')) document.getElementById('return-live-btn').click();
        });
      }
    }, 100);
  } else {
    artOverlay.style.display = 'block';
    document.getElementById('art-portrait-title').textContent = `PORTRAIT OF JULY ${day}, 2026`;
    document.getElementById('art-portrait-story').textContent = storyText;
  }
}


// ----------------------------------------------------
// MICRO-INTERACTION: Magnetic Buttons
// ----------------------------------------------------
function initMagneticButtons() {
  const buttons = document.querySelectorAll('header button, #archive-toggle-btn, #theme-toggle-btn, #scale-toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      // Sound omitted
    });
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      // Calculate cursor position relative to button center
      const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
      
      if (typeof gsap !== 'undefined') {
        gsap.to(btn, { x: x, y: y, duration: 0.3, ease: 'power2.out' });
      } else {
        btn.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (typeof gsap !== 'undefined') {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
      } else {
        btn.style.transform = `translate(0px, 0px)`;
      }
    });
  });
}

// Ensure it runs after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMagneticButtons);
} else {
  initMagneticButtons();
}

// ----------------------------------------------------
// MICRO-INTERACTION: Custom Cursor (High Performance GSAP)
// ----------------------------------------------------
function initCustomCursor() {
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  // Use GSAP quickSetter for buttery smooth 120fps hardware acceleration
  const xSetter = gsap.quickSetter(cursor, "x", "px");
  const ySetter = gsap.quickSetter(cursor, "y", "px");

  window.addEventListener('mousemove', (e) => {
    xSetter(e.clientX);
    ySetter(e.clientY);
    
    // Debounce/Throttle the elementFromPoint check slightly for performance
    if (e.clientX % 2 === 0) {
        const hoveredEl = document.elementFromPoint(e.clientX, e.clientY);
        if (hoveredEl && (
          hoveredEl.tagName === 'BUTTON' || 
          hoveredEl.tagName === 'A' || 
          hoveredEl.tagName === 'SELECT' ||
          hoveredEl.closest('button') ||
          (hoveredEl.id === 'mosaic-canvas' && hoveredBlock !== null)
        )) {
          cursor.classList.add('hovering');
        } else {
          cursor.classList.remove('hovering');
        }
    }
  });
  
  document.addEventListener('mouseleave', () => gsap.to(cursor, {opacity: 0, duration: 0.2}));
  document.addEventListener('mouseenter', () => gsap.to(cursor, {opacity: 1, duration: 0.2}));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCursor);
} else {
  // initCustomCursor(); removed by user request
}


// ============================================================================
// META QUEST WEBXR COMPATIBILITY ENGINE
// ============================================================================
var xrRenderer, xrScene, xrCamera, xrTexture, xrMesh;
var xrController1, xrController2, xrRaycaster;
var isVRActive = false;
var lastIntersectedUV = null;

function initWebXR() {
  const tCanvas = document.createElement('canvas');
  tCanvas.style.position = 'absolute';
  tCanvas.style.top = '0';
  tCanvas.style.left = '0';
  tCanvas.style.zIndex = '-1';
  document.body.appendChild(tCanvas);

  xrRenderer = new THREE.WebGLRenderer({ canvas: tCanvas, antialias: true, alpha: true });
  xrRenderer.setPixelRatio(window.devicePixelRatio);
  xrRenderer.setSize(window.innerWidth, window.innerHeight);
  xrRenderer.xr.enabled = true;

  xrScene = new THREE.Scene();
  xrScene.background = new THREE.Color('#000308'); // Deep void
  
  // IMMERSION: Thick Volumetric Fog
  xrScene.fog = new THREE.FogExp2('#000308', 0.06);

  // IMMERSION: Infinite Cyberpunk Floor Grid
  const gridHelper = new THREE.GridHelper(100, 100, 0x00ff88, 0x002211);
  window.xrGridHelper = gridHelper;
  gridHelper.position.y = 0; // Floor level
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.4;
  gridHelper.material.blending = THREE.AdditiveBlending;
  xrScene.add(gridHelper);

  xrCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  
  // IMMERSION: Massive Wrap-Around IMAX Screen (180 degrees, towering height)
  const geometry = new THREE.CylinderGeometry(5, 5, 4.5, 80, 1, true, -Math.PI / 2, Math.PI);
  geometry.scale(-1, 1, 1); 

  // Make sure canvas is available
  const cvs = document.getElementById('mosaic-canvas');
  xrTexture = new THREE.CanvasTexture(cvs);
  xrTexture.minFilter = THREE.LinearFilter;
  
  const material = new THREE.MeshBasicMaterial({ map: xrTexture, transparent: true });
  xrMesh = new THREE.Mesh(geometry, material);
  xrMesh.position.set(0, 1.8, 0);

  // CREATE 3D VR TOOLTIP
  const tCv = document.createElement('canvas');
  tCv.width = 512; tCv.height = 256;
  vrTooltipCtx = tCv.getContext('2d');
  vrTooltipTex = new THREE.CanvasTexture(tCv);
  const tGeo = new THREE.PlaneGeometry(0.8, 0.4);
  const tMat = new THREE.MeshBasicMaterial({ map: vrTooltipTex, transparent: true, opacity: 0.9, depthTest: false });
  vrTooltipMesh = new THREE.Mesh(tGeo, tMat);
  vrTooltipMesh.renderOrder = 9999;
  vrTooltipMesh.visible = false;
  xrScene.add(vrTooltipMesh); // Lifted slightly above eye level for dominance
  xrScene.add(xrMesh);

  // IMMERSION: Ambient Screen Aura (Fake Bloom/Light Bleed)
  const auraGeo = new THREE.CylinderGeometry(5.2, 5.2, 5.0, 40, 1, true, -Math.PI / 2, Math.PI);
  auraGeo.scale(-1, 1, 1);
  const auraMat = new THREE.MeshBasicMaterial({ map: xrTexture, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
  const auraMesh = new THREE.Mesh(auraGeo, auraMat);
  auraMesh.position.set(0, 1.8, 0);
  xrScene.add(auraMesh);

  // IMMERSION: Floating Data Stream Particles
  const particlesGeo = new THREE.BufferGeometry();
  const particleCount = 8000;
  const posArray = new Float32Array(particleCount * 3);
  const colorsArray = new Float32Array(particleCount * 3);
  
  for(let i=0; i<particleCount; i++) {
    const radius = 2 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 30;
    
    posArray[i*3] = radius * Math.cos(theta);
    posArray[i*3+1] = y;
    posArray[i*3+2] = radius * Math.sin(theta);
    
    const isBlue = Math.random() > 0.2; // More blue/green mix
    
    // Add floating Cyber Monoliths in the deep background

    colorsArray[i*3] = 0; // R
    colorsArray[i*3+1] = isBlue ? 0.8 : 1.0; // G
    colorsArray[i*3+2] = isBlue ? 1.0 : 0.5; // B
  }
  
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
  
  const particlesMat = new THREE.PointsMaterial({ 
    size: 0.04, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending 
  });
  window.xrParticles = new THREE.Points(particlesGeo, particlesMat);
  xrScene.add(window.xrParticles);
  
  window.xrMonoliths = new THREE.Group();
  const monoGeo = new THREE.BoxGeometry(1, 10, 1);
  const monoMat = new THREE.MeshBasicMaterial({ color: 0x002211, wireframe: true, transparent: true, opacity: 0.3 });
  for(let m=0; m<15; m++) {
    const mono = new THREE.Mesh(monoGeo, monoMat);
    const mRad = 15 + Math.random() * 20;
    const mTheta = Math.random() * Math.PI * 2;
    mono.position.set(mRad * Math.cos(mTheta), (Math.random()-0.5)*20, mRad * Math.sin(mTheta));
    mono.rotation.y = Math.random() * Math.PI;
    mono.rotation.x = (Math.random()-0.5) * 0.2;
    window.xrMonoliths.add(mono);
  }
  xrScene.add(window.xrMonoliths);

  


  xrController1 = xrRenderer.xr.getController(0);
  xrController1.addEventListener('select', onXRSelect);
  xrController1.addEventListener('connected', function (event) { this.gamepad = event.data.gamepad; });
  xrScene.add(xrController1);

  xrController2 = xrRenderer.xr.getController(1);
  xrController2.addEventListener('select', onXRSelect);
  xrController2.addEventListener('connected', function (event) { this.gamepad = event.data.gamepad; });
  xrScene.add(xrController2);

  const controllerModelFactory = new XRControllerModelFactory();
  const grip1 = xrRenderer.xr.getControllerGrip(0);
  grip1.add(controllerModelFactory.createControllerModel(grip1));
  xrScene.add(grip1);

  const grip2 = xrRenderer.xr.getControllerGrip(1);
  grip2.add(controllerModelFactory.createControllerModel(grip2));
  xrScene.add(grip2);

  const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
  xrController1.add(new THREE.Line(laserGeo, laserMat));
  xrController2.add(new THREE.Line(laserGeo, laserMat));

  xrRaycaster = new THREE.Raycaster();

  

  // ==========================================
  // CONTEXTUAL HOLO-BILLBOARD
  // ==========================================
  const billboardCanvas = document.createElement('canvas');
  billboardCanvas.width = 1024;
  billboardCanvas.height = 512;
  const bbCtx = billboardCanvas.getContext('2d');
  const bbTex = new THREE.CanvasTexture(billboardCanvas);
  
  const bbGeo = new THREE.PlaneGeometry(6, 3); // Massive 6m x 3m billboard
  const bbMat = new THREE.MeshBasicMaterial({ map: bbTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  window.xrBillboard = new THREE.Mesh(bbGeo, bbMat);
  
  window.xrBillboard.position.set(-4.5, 1.6, -3.0); // Far Left side
  window.xrBillboard.rotation.y = Math.PI/6; // Angled inward from the left // Angled toward the user
  xrScene.add(window.xrBillboard);

  // ==========================================
  // FLOATING NOTIFICATION HUD
  // ==========================================
  const notifCanvas = document.createElement('canvas');
  notifCanvas.width = 1024;
  notifCanvas.height = 256;
  window.notifCtx = notifCanvas.getContext('2d');
  const notifTex = new THREE.CanvasTexture(notifCanvas);
  
  const notifGeo = new THREE.PlaneGeometry(4, 1);
  const notifMat = new THREE.MeshBasicMaterial({ map: notifTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  window.xrNotifHUD = new THREE.Mesh(notifGeo, notifMat);
  
  // Place it directly above the DOM overlay in front of the user
  window.xrNotifHUD.position.set(0, -100, 0); // Hide the old HUD completely // Hovering directly above the Live Stats panel
  window.xrNotifHUD.rotation.y = Math.PI/6; // Same angle as stats panel
  xrScene.add(window.xrNotifHUD);
  
  window.showVRNotification = function(text, isWhale) {
      window.notifCtx.clearRect(0, 0, 1024, 256);
      window.notifCtx.fillStyle = isWhale ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 255, 136, 0.3)';
      window.notifCtx.fillRoundedRect = function(x, y, w, h, r) {
        this.beginPath(); this.moveTo(x+r, y); this.lineTo(x+w-r, y); this.quadraticCurveTo(x+w, y, x+w, y+r);
        this.lineTo(x+w, y+h-r); this.quadraticCurveTo(x+w, y+h, x+w-r, y+h); this.lineTo(x+r, y+h);
        this.quadraticCurveTo(x, y+h, x, y+h-r); this.lineTo(x, y+r); this.quadraticCurveTo(x, y, x+r, y); this.fill();
      };
      window.notifCtx.fillRoundedRect(20, 20, 984, 216, 20);
      
      window.notifCtx.fillStyle = '#ffffff';
      window.notifCtx.font = isWhale ? 'bold 60px monospace' : 'bold 50px monospace';
      window.notifCtx.textAlign = 'center';
      window.notifCtx.fillText(text, 512, 140);
      notifTex.needsUpdate = true;
      
      // Animate the HUD popping in
      if (typeof gsap !== 'undefined') {
          gsap.fromTo(window.xrNotifHUD.scale, {x: 0, y: 0}, {x: 1, y: 1, duration: 0.5, ease: 'back.out(1.7)'});
          gsap.to(window.xrNotifHUD.scale, {x: 0, y: 0, duration: 0.3, delay: 1.5, ease: 'power2.in'}); // Vanish ASAP
      }
  };

  
  // Update it every second to avoid CPU usage
  setInterval(() => {
     if (!isVRActive || !window.xrBillboard) return;
     
     const blockEl = document.getElementById('latest-block-val');
     const feeEl = document.getElementById('avg-fee-val');
     const trendEl = document.getElementById('trend-dominant-val');
     const modeEl = document.querySelector('.brand h1');
     
     const blockVal = blockEl ? blockEl.innerText : '0000000';
     const feeVal = feeEl ? feeEl.innerText : '0 Gwei';
     const trendVal = trendEl ? trendEl.innerText : 'Analyzing...';
     const mode = modeEl ? modeEl.innerText : 'BLOCKCHAIN MOSAIC';
     
     bbCtx.clearRect(0, 0, 1024, 512);
     
     // Glowing Background Panel
     bbCtx.fillStyle = 'rgba(4, 6, 8, 0.8)';
     bbCtx.strokeStyle = '#00ff88';
     bbCtx.lineWidth = 4;
     bbCtx.fillRect(10, 10, 1004, 492);
     bbCtx.strokeRect(10, 10, 1004, 492);
     
     // Title
     bbCtx.fillStyle = '#ffffff';
     bbCtx.font = 'bold 48px monospace';
     bbCtx.textAlign = 'center';
     bbCtx.fillText(mode, 512, 120);
     
     // Subtitle Context
     bbCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
     bbCtx.font = 'italic 32px sans-serif';
     bbCtx.fillText("Each cube represents a live cryptographic transaction on the network.", 512, 200);
     
     // Live Stats
     bbCtx.fillStyle = '#00ff88';
     bbCtx.font = 'bold 70px monospace';
     bbCtx.fillText("BLOCK: " + blockVal + " | FEE: " + feeVal, 512, 350);
     
     bbCtx.fillStyle = '#00aaff';
     bbCtx.font = 'bold 60px monospace';
     bbCtx.fillText("TREND: " + trendVal, 512, 450);
     
     bbTex.needsUpdate = true;
  }, 1000);



  window.xrAudioListener = new THREE.AudioListener();
  xrCamera.add(window.xrAudioListener);
  window.xrHoverSound = new THREE.PositionalAudio(window.xrAudioListener);
  
  const osc = window.xrAudioListener.context.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, window.xrAudioListener.context.currentTime);
  osc.start(0);
  window.xrHoverSound.setNodeSource(osc);
  window.xrHoverSound.setRefDistance(1);
  window.xrHoverSound.setVolume(0);
  xrMesh.add(window.xrHoverSound);

  // ==========================================
  // DEEP AMBIENT DRONE
  // ==========================================
  window.xrDroneSound = new THREE.PositionalAudio(window.xrAudioListener);
  const droneOsc = window.xrAudioListener.context.createOscillator();
  const droneGain = window.xrAudioListener.context.createGain();
  
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(45, window.xrAudioListener.context.currentTime); // Deep bass
  
  // Create an LFO to modulate the drone volume slightly
  const lfo = window.xrAudioListener.context.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.1, window.xrAudioListener.context.currentTime);
  const lfoGain = window.xrAudioListener.context.createGain();
  lfoGain.gain.setValueAtTime(0.2, window.xrAudioListener.context.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(droneGain.gain);
  
  droneGain.gain.setValueAtTime(0.3, window.xrAudioListener.context.currentTime);
  droneOsc.connect(droneGain);
  
  droneOsc.start(0);
  lfo.start(0);
  
  window.xrDroneSound.setNodeSource(droneGain);
  window.xrDroneSound.setRefDistance(10);
  window.xrDroneSound.setVolume(1.0); // Ambient is controlled by gain
  xrScene.add(window.xrDroneSound);


  const vrBtn = document.createElement('button');
  vrBtn.innerText = 'ENTER VR (DOM OVERLAY)';
  vrBtn.style.position = 'fixed';
  vrBtn.style.bottom = '20px';
  vrBtn.style.right = '20px';
  vrBtn.style.zIndex = '99999';
  vrBtn.style.fontFamily = "'Space Mono', monospace";
  vrBtn.style.background = 'rgba(0, 255, 136, 0.15)';
  vrBtn.style.color = '#00ff88';
  vrBtn.style.border = '1px solid #00ff88';
  vrBtn.style.borderRadius = '4px';
  vrBtn.style.padding = '12px 24px';
  vrBtn.style.cursor = 'pointer';
  vrBtn.style.fontWeight = 'bold';
  
  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then(supported => {
      if (supported) {
        document.body.appendChild(vrBtn);
        let currentSession = null;
        vrBtn.onclick = () => {
          if (currentSession === null) {
            navigator.xr.requestSession('immersive-vr', {
              optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'dom-overlay'],
              domOverlay: { root: document.body }
            }).then(session => {
              currentSession = session;
              vrBtn.innerText = 'EXIT VR';
              session.addEventListener('end', () => {
                currentSession = null;
                vrBtn.innerText = 'ENTER VR (DOM OVERLAY)';
              });
              xrRenderer.xr.setSession(session);
            });
          } else {
            currentSession.end();
          }
        };
      } else {
        vrBtn.innerText = 'VR NOT SUPPORTED';
        vrBtn.style.opacity = '0.5';
        vrBtn.style.cursor = 'not-allowed';
        document.body.appendChild(vrBtn);
      }
    });
  }

  xrRenderer.xr.addEventListener('sessionstart', () => {
    isVRActive = true;
  // PLAY A MASSIVE WELCOME ANIMATION SO THEY KNOW EFFECTS ARE WORKING
  setTimeout(() => {
      if (typeof window.showVRNotification === 'function') {
          window.showVRNotification('VR SYSTEMS ONLINE', false);
      }
      
      // ELEGANT DEMO SLIDE SO THEY IMMEDIATELY SEE THE ANIMATION WORKING
      if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
          const fakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
          fakeBlock.position.set(0, -3.0, -6.0);
          xrScene.add(fakeBlock);
          gsap.to(fakeBlock.position, {
              y: 1.8, z: -4.5, duration: 2.0, ease: 'power2.out', 
              onComplete: () => { xrScene.remove(fakeBlock); }
          });
      }
      
      if (typeof gsap !== 'undefined' && window.xrGridHelper) {
          gsap.fromTo(window.xrGridHelper.position,
             {y: -2.0}, {y: 0, duration: 1.2, ease: 'elastic.out(1, 0.3)'}
          );
          window.xrGridHelper.material.color.setHex(0xffffff);
          gsap.to(window.xrGridHelper.material.color, {r: 0, g: 1, b: 0.53, duration: 1.2, ease: 'power2.out'});
      }
  }, 1000);
    xrRenderer.setAnimationLoop(draw);
    const vrStyle = document.createElement('style');
    vrStyle.id = 'vr-immersive-style';
    vrStyle.innerHTML = `
      html, body, #app-container, .main-layout, .canvas-container {
        background: transparent !important; background-color: transparent !important; box-shadow: none !important;
      }
      #mosaic-canvas { opacity: 0.001 !important; pointer-events: none !important; }
      .app-header { 
        background: rgba(8, 9, 12, 0.85) !important; 
        border-bottom: 2px solid #00ff88 !important; 
        transform: scale(2.0) translateY(40px) !important;
        transform-origin: top center;
        z-index: 999999 !important;
      }
      
      /* Make the Blend selector large and visible */
      .blend-selector {
        transform: scale(2.5) translateY(-50%) !important;
        right: 40px !important;
        z-index: 999999 !important;
      }
      
      /* Make sure the Archive Drawer is front and center in VR, not off to the side */
      .archive-drawer {
        width: 600px !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(100%) !important;
        transition: transform 0.4s ease !important;
        bottom: 0 !important;
        top: auto !important;
        border-top: 2px solid #00ff88 !important;
        border-left: 2px solid #00ff88 !important;
        border-right: 2px solid #00ff88 !important;
      }
      .archive-drawer.open {
        transform: translateX(-50%) translateY(0) !important;
      }
      
      /* Make the Settings sidebar pop out on the left in VR */
      #details-sidebar {
        width: 400px !important;
        left: 0 !important;
        right: auto !important;
        transform: translateX(-100%) !important;
        border-right: 2px solid #00ff88 !important;
      }
      #details-sidebar.open {
        transform: translateX(0) !important;
      }
      .playback-controls { background: rgba(8, 9, 12, 0.8) !important; border: 1px solid rgba(0, 255, 136, 0.4) !important; }
      
      /* Make sure the sidebars and drawers are extremely visible and float like HUDs */
      #details-sidebar, .archive-drawer {
        background: rgba(4, 6, 8, 0.95) !important;
        border-left: 1px solid #00ff88 !important;
        border-right: 1px solid #00ff88 !important;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.2) !important;
        z-index: 999999 !important;
      }
      
      /* The tooltip needs to pop heavily against the 3D background */
      #hover-tooltip {
        background: rgba(0, 0, 0, 0.95) !important;
        border: 2px solid #00ff88 !important;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.5) !important;
        transform: scale(1.5) !important; /* Make it larger in VR for readability */
        z-index: 999999 !important;
      }
      
      /* Buttons need to be highly visible */
      header button, .app-header button {
        background: rgba(0, 255, 136, 0.1) !important;
        border: 1px solid rgba(0, 255, 136, 0.4) !important;
        color: #00ff88 !important;
        font-weight: bold !important;
      }
      ::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(vrStyle);
  });

  xrRenderer.xr.addEventListener('sessionend', () => {
    isVRActive = false;
    xrRenderer.setAnimationLoop(null);
    requestAnimationFrame(draw);
    const vrStyle = document.getElementById('vr-immersive-style');
    if (vrStyle) vrStyle.remove();
  });
}

function onXRSelect(event) {
  if (lastIntersectedUV) {
    // Flash the laser green on click for visual feedback
    if (xrController1 && xrController1.children[0]) xrController1.children[0].material.color.setHex(0xffffff);
    setTimeout(() => { if (xrController1 && xrController1.children[0]) xrController1.children[0].material.color.setHex(0x00ff88); }, 150);
    
    const syntheticEvent = new MouseEvent('click', {
      clientX: lastIntersectedUV.x * window.innerWidth,
      clientY: (1 - lastIntersectedUV.y) * window.innerHeight,
      bubbles: true, cancelable: true, view: window
    });
    const cvs = document.getElementById('mosaic-canvas');
    if (cvs) cvs.dispatchEvent(syntheticEvent);
  }
}

function updateXRInteraction() {
  if (!isVRActive || !xrRenderer.xr.isPresenting) return;
  
  if (xrTexture) xrTexture.needsUpdate = true;

      
    

  
  if (window.xrParticles) {
    const speed = (window.sessionDirectCount && window.sessionDirectCount > 500) ? 0.005 : 0.0005; 
    window.xrParticles.rotation.y += speed;
    window.xrParticles.rotation.x += speed * 0.1;
    // Digital rain effect
    const positions = window.xrParticles.geometry.attributes.position.array;
    for(let i=1; i<positions.length; i+=3) {
      positions[i] -= 0.05; // fall down
      if(positions[i] < -15) positions[i] = 15; // wrap around
    }
    window.xrParticles.geometry.attributes.position.needsUpdate = true;
    
    if (window.xrMonoliths) {
      window.xrMonoliths.rotation.y -= speed * 0.2; // slow counter-rotation
    }
  }
  
  let intersected = false;
  [xrController1, xrController2].forEach(controller => {
    if (!controller) return;
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    xrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    
    
    // Accurate VR Raycasting to 2D Canvas Tooltips
    const hits = xrRaycaster.intersectObject(xrMesh);
    if (hits.length > 0) {
      intersected = true;
      const uv = hits[0].uv;
      
      if (lastIntersectedUV && (Math.abs(lastIntersectedUV.x - uv.x) > 0.01 || Math.abs(lastIntersectedUV.y - uv.y) > 0.01)) {
         if (controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
            controller.gamepad.hapticActuators[0].pulse(0.1, 10);
         }
      }
      if (window.xrHoverSound) window.xrHoverSound.setVolume(0.05);
      
      lastIntersectedUV = uv;
      
      // Calculate exact pixel position on the internal canvas regardless of CSS scaling!
      const cvs = document.getElementById('mosaic-canvas');
      if (cvs) {
         const rect = cvs.getBoundingClientRect();
         // The UV maps exactly to the internal canvas resolution width/height
         // We add rect.left/top so that when getBoundingClientRect() is called inside the listener, it subtracts it perfectly back to the raw internal coordinate!
         // Force window dimensions because the canvas might be structurally hidden but fills the window
         const exactClientX = uv.x * window.innerWidth;
         const exactClientY = (1 - uv.y) * window.innerHeight;
         
         const syntheticEvent = new MouseEvent('mousemove', {
           clientX: exactClientX,
           clientY: exactClientY,
           bubbles: true, cancelable: true, view: window
         });
         cvs.dispatchEvent(syntheticEvent);
      }
      
      // Update 3D VR Tooltip
      if (typeof vrTooltipMesh !== 'undefined' && vrTooltipCtx) {
          const domTooltip = document.getElementById('hover-tooltip');
          if (domTooltip && domTooltip.classList.contains('visible')) {
              vrTooltipCtx.clearRect(0, 0, 512, 256);
              vrTooltipCtx.fillStyle = 'rgba(8,9,12,0.95)';
              vrTooltipCtx.beginPath();
              vrTooltipCtx.rect(0, 0, 512, 256);
              vrTooltipCtx.fill();
              vrTooltipCtx.strokeStyle = 'rgba(0,255,136,0.5)';
              vrTooltipCtx.lineWidth = 4;
              vrTooltipCtx.stroke();
              
              vrTooltipCtx.fillStyle = '#ffffff';
              vrTooltipCtx.font = '24px monospace';
              
              const lines = domTooltip.innerText.split('\n').filter(l => l.trim().length > 0);
              let y = 50;
              lines.forEach(line => {
                  vrTooltipCtx.fillText(line.substring(0, 40), 30, y);
                  y += 40;
              });
              
              vrTooltipTex.needsUpdate = true;
              vrTooltipMesh.visible = true;
              
              vrTooltipMesh.position.copy(hits[0].point);
              vrTooltipMesh.position.z += 0.2;
              vrTooltipMesh.position.y += 0.3;
              vrTooltipMesh.lookAt(xrCamera.position);
          } else {
              vrTooltipMesh.visible = false;
          }
      }
    }

    

  });
  
  if (!intersected) {
    if (typeof vrTooltipMesh !== 'undefined' && vrTooltipMesh) vrTooltipMesh.visible = false;
  }
  if (!intersected && lastIntersectedUV) {
    lastIntersectedUV = null;
    if (window.xrHoverSound) window.xrHoverSound.setVolume(0);
    const hoverTooltip = document.getElementById('hover-tooltip');
    if (hoverTooltip) hoverTooltip.style.visibility = 'hidden';
  }
  
}

setTimeout(initWebXR, 500);
