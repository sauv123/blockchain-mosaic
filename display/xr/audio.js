// ============================================================================
// /trace XR — SPATIAL AUDIO ENGINE
// The sonification from mosaic.js, note for note, but every voice is routed
// through a PannerNode so a block sounds from where it hangs on the wall.
// The WebAudio listener is driven by the XR head pose each frame.
// ============================================================================

export class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.profile = 'chimes';          // 'chimes' | 'guitar' | 'drums' | 'pad'
    this.ambientProfile = 'hum';      // 'none' | 'hum' | 'crackle'
    this.scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // pentatonic
    this.ambientSource = null;
    this.ambientGain = null;
    this.droneOsc = null;
    this.droneGain = null;
    this.droneFilter = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // A gentle limiter keeps a burst of simultaneous blocks from clipping in
    // headphones, which is far more noticeable in a headset than on a laptop.
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-8, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.25, this.ctx.currentTime);

    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    this.updateAmbient();
    this.startPressureDrone();
  }

  resume() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggle() {
    this.init();
    this.resume();
    this.muted = !this.muted;
    this.updateAmbient();
    if (this.droneGain) {
      this.droneGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.05, this.ctx.currentTime + 0.4);
    }
    return this.muted;
  }

  setProfile(p) { this.profile = p; }

  setAmbientProfile(p) {
    this.ambientProfile = p;
    this.init();
    this.updateAmbient();
  }

  // -------------------------------------------------------------------------
  // Listener tracking — call once per frame with the XR camera's world pose.
  // -------------------------------------------------------------------------
  updateListener(position, forward, up) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(position.x, t, 0.02);
      l.positionY.setTargetAtTime(position.y, t, 0.02);
      l.positionZ.setTargetAtTime(position.z, t, 0.02);
      l.forwardX.setTargetAtTime(forward.x, t, 0.02);
      l.forwardY.setTargetAtTime(forward.y, t, 0.02);
      l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      l.upX.setTargetAtTime(up.x, t, 0.02);
      l.upY.setTargetAtTime(up.y, t, 0.02);
      l.upZ.setTargetAtTime(up.z, t, 0.02);
    } else if (l.setPosition) {
      // Safari / older implementations
      l.setPosition(position.x, position.y, position.z);
      l.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /**
   * Returns the node a voice should connect into. With a position it builds a
   * PannerNode at that world point; without one it goes straight to master
   * (used for head-locked UI ticks).
   */
  dest(pos) {
    if (!pos) return this.masterGain;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.2;
    panner.maxDistance = 40;
    panner.rolloffFactor = 1.1;
    if (panner.positionX) {
      panner.positionX.value = pos.x;
      panner.positionY.value = pos.y;
      panner.positionZ.value = pos.z;
    } else {
      panner.setPosition(pos.x, pos.y, pos.z);
    }
    panner.connect(this.masterGain);
    return panner;
  }

  // -------------------------------------------------------------------------
  // Ambient bed — 55Hz hum or vinyl crackle, placed all around rather than
  // in the centre of the head.
  // -------------------------------------------------------------------------
  updateAmbient() {
    if (!this.ctx) return;
    this.stopAmbient();
    if (this.muted || this.ambientProfile === 'none') return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    if (this.ambientProfile === 'hum') {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, this.ctx.currentTime);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, this.ctx.currentTime);

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
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const hiss = (Math.random() * 2 - 1) * 0.003;
        const pop = Math.random() < 0.00015 ? (Math.random() * 2 - 1) * 0.35 : 0;
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
      const srcs = Array.isArray(this.ambientSource) ? this.ambientSource : [this.ambientSource];
      srcs.forEach((s) => { try { s.stop(); } catch (e) { /* already stopped */ } });
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      try { this.ambientGain.disconnect(); } catch (e) { /* already detached */ }
      this.ambientGain = null;
    }
  }

  // -------------------------------------------------------------------------
  // Gas-pressure drone: the room's low end rises as the network congests.
  // -------------------------------------------------------------------------
  startPressureDrone() {
    if (this.droneOsc || !this.ctx) return;
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(38, this.ctx.currentTime);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(90, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc.start();
  }

  /** pressure: 0..1 from core.getGasPressure() */
  setPressure(pressure) {
    if (!this.ctx || !this.droneGain || this.muted) return;
    const t = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(0.01 + pressure * 0.055, t, 1.5);
    this.droneOsc.frequency.setTargetAtTime(32 + pressure * 22, t, 2.0);
    this.droneFilter.frequency.setTargetAtTime(70 + pressure * 180, t, 2.0);
  }

  // -------------------------------------------------------------------------
  // Block sonification — the four instrument profiles, unchanged, but spatial.
  // `pos` is a THREE.Vector3-like {x,y,z} world position, or null.
  // -------------------------------------------------------------------------
  playBlockTones(block, pos, progressThroughDay) {
    if (this.muted || !this.ctx) return;

    let timePhaseMult = 1.0;
    if (typeof progressThroughDay === 'number') {
      timePhaseMult = 0.5 + Math.sin(progressThroughDay * Math.PI) * 1.5;
    }

    const hashVal = parseInt(block.hash.substring(8, 12), 16);
    const octave = timePhaseMult > 1.2 ? 1.5 : timePhaseMult < 0.8 ? 0.5 : 1.0;
    const noteFreq = this.scale[hashVal % this.scale.length] * octave;
    const now = this.ctx.currentTime;
    const out = this.dest(pos);

    if (this.profile === 'guitar') {
      this._playGuitar(noteFreq, now, out);
    } else if (this.profile === 'drums') {
      this._playDrums(block, now, out);
    } else if (this.profile === 'pad') {
      this._playPad(noteFreq, now, out);
    } else {
      this._playChimes(block, noteFreq, now, out);
    }
  }

  _playGuitar(noteFreq, now, out) {
    const sampleRate = this.ctx.sampleRate;
    const period = Math.round(sampleRate / noteFreq);
    const bufLen = sampleRate * 2;
    const ksBuf = this.ctx.createBuffer(1, bufLen, sampleRate);
    const ksData = ksBuf.getChannelData(0);

    for (let i = 0; i < period; i++) ksData[i] = Math.random() * 2 - 1;
    for (let i = period; i < bufLen; i++) {
      ksData[i] = 0.5 * (ksData[i - period] + ksData[i - period + 1]) * 0.996;
    }

    const ksSource = this.ctx.createBufferSource();
    ksSource.buffer = ksBuf;

    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'highpass';
    bodyFilter.frequency.setValueAtTime(80, now);

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
    ksGain.connect(out);
    ksSource.start(now);
    ksSource.stop(now + 1.9);
  }

  _playDrums(block, now, out) {
    // Deep 808 kick
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(180, now);
    kickOsc.frequency.exponentialRampToValueAtTime(48, now + 0.06);
    kickGain.gain.setValueAtTime(0.9, now);
    kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    kickOsc.connect(kickGain);
    kickGain.connect(out);
    kickOsc.start(now);
    kickOsc.stop(now + 0.5);

    // Snare, offset unless this is a whale
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
    const snareToneOsc = this.ctx.createOscillator();
    const snareToneGain = this.ctx.createGain();
    snareToneOsc.type = 'triangle';
    snareToneOsc.frequency.setValueAtTime(220, snareTime);
    snareToneGain.gain.setValueAtTime(0.3, snareTime);
    snareToneGain.gain.exponentialRampToValueAtTime(0.0001, snareTime + 0.1);
    snareNoise.connect(snareFilter);
    snareFilter.connect(snareGain);
    snareGain.connect(out);
    snareToneOsc.connect(snareToneGain);
    snareToneGain.connect(out);
    snareNoise.start(snareTime);
    snareNoise.stop(snareTime + 0.2);
    snareToneOsc.start(snareTime);
    snareToneOsc.stop(snareTime + 0.15);

    // Hi-hat
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
    hatGain.connect(out);
    hat.start(hatTime);
    hat.stop(hatTime + 0.05);
  }

  _playPad(noteFreq, now, out) {
    const noteFreqs = [noteFreq * 0.5, noteFreq, noteFreq * 1.25, noteFreq * 1.5];
    noteFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const detOsc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const padFilter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      detOsc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      detOsc.frequency.setValueAtTime(freq * 1.006, now);

      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(600, now);
      padFilter.frequency.linearRampToValueAtTime(1800, now + 0.3);
      padFilter.frequency.exponentialRampToValueAtTime(500, now + 1.6);
      padFilter.Q.setValueAtTime(1.5, now);

      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(idx === 0 ? 0.08 : 0.11, now + 0.25);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(padFilter);
      detOsc.connect(padFilter);
      padFilter.connect(oscGain);
      oscGain.connect(out);

      osc.start(now);
      detOsc.start(now);
      osc.stop(now + 2.0);
      detOsc.stop(now + 2.0);
    });
  }

  _playChimes(block, noteFreq, now, out) {
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
      g.connect(out);
      o.start(now + delay);
      o.stop(now + delay + dur + 0.05);
    };

    playChime(noteFreq, 0, 0.35, 0.8);
    playChime(noteFreq * 2, 0.01, 0.18, 0.6);
    playChime(noteFreq * 1.5, 0.02, 0.1, 0.5);
    playChime(noteFreq, 0.18, 0.12, 0.5);

    if (block.whale_flag === 1) {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(65.41, now);
      subOsc.frequency.linearRampToValueAtTime(55, now + 0.4);
      subGain.gain.setValueAtTime(0, now);
      subGain.gain.linearRampToValueAtTime(0.75, now + 0.1);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      subOsc.connect(subGain);
      subGain.connect(out);
      subOsc.start(now);
      subOsc.stop(now + 2.4);
    }
  }

  /** Room-filling boom for a whale landing — non-positional on purpose. */
  playWhaleBoom() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.6);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.85, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 2.8);
  }

  /** The soft click UI surfaces make when the laser crosses a hit region. */
  playUiTick(pos, bright = false) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(bright ? 1400 : 780, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(bright ? 0.08 : 0.035, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    o.connect(g);
    g.connect(this.dest(pos));
    o.start(now);
    o.stop(now + 0.09);
  }
}

export const audio = new SpatialAudioEngine();
