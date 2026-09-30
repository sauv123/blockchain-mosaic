const fs = require('fs');
let html = fs.readFileSync('mosaic.html', 'utf8');

// Add Audio Button
const audioBtnHTML = `
      <button id="audio-toggle-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        Enable Audio
      </button>
`;
html = html.replace('<button id="archive-toggle-btn">', audioBtnHTML + '      <button id="archive-toggle-btn">');
fs.writeFileSync('mosaic.html', html);

// Add SoundEngine to mosaic.js
let js = fs.readFileSync('mosaic.js', 'utf8');

const soundEngineLogic = `
// SONIC UI ENGINE
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
  }
  
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    
    // Create a reverb effect (Convolver)
    const convolver = this.ctx.createConvolver();
    const rate = this.ctx.sampleRate;
    const length = rate * 2; // 2 seconds
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-3 * (i / length));
      impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
      impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
    }
    convolver.buffer = impulse;
    
    this.masterGain.connect(convolver);
    convolver.connect(this.ctx.destination);
    
    // Direct dry signal as well
    this.masterGain.connect(this.ctx.destination);
    
    this.enabled = true;
  }
  
  playBlockSound(isWhale) {
    if (!this.enabled || !this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    const now = this.ctx.currentTime;
    
    if (isWhale) {
      // Deep Bass Hum for Whales
      osc.type = 'sine';
      osc.frequency.setValueAtTime(45, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      
      osc.start(now);
      osc.stop(now + 2.1);
    } else {
      // Crystalline Chime for normal block
      osc.type = 'triangle';
      const root = 440; // A4
      const intervals = [1, 1.25, 1.5, 1.66, 2]; // Pentatonic-ish
      const freq = root * intervals[Math.floor(Math.random() * intervals.length)];
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      osc.start(now);
      osc.stop(now + 0.9);
    }
  }
}

const audio = new SoundEngine();
`;

// Inject Sound Engine
js = soundEngineLogic + '\n' + js;

// Hook audio button
const initUITarget = "function initUI() {";
const audioHook = `
  const audioBtn = document.getElementById('audio-toggle-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      audio.init();
      audioBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Audio Live';
      audioBtn.style.color = '#00ff88';
      audioBtn.style.borderColor = 'rgba(0,255,136,0.3)';
      audioBtn.style.background = 'rgba(0,255,136,0.05)';
    });
  }
`;
js = js.replace(initUITarget, initUITarget + '\n' + audioHook);

// Hook block generation
const blockGenTarget = "blocks.push(block);";
const playSoundHook = `
    blocks.push(block);
    if (currentMode !== 'ART_SYNTHESIS') {
      audio.playBlockSound(block.whale_flag === 1);
    }
`;
js = js.replace(blockGenTarget, playSoundHook);

fs.writeFileSync('mosaic.js', js);
console.log("Audio logic injected.");
