import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

ambient_drone = """
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
"""

# Inject it after xrHoverSound is created
target = "xrMesh.add(window.xrHoverSound);"
js = js.replace(target, target + "\n" + ambient_drone)

# Also play an ambient sound when a block arrives
# In quest.js, audio.playBlockTones(newBlock) is called.
# Let's add a massive reverb hit for the blocks in Tone.js.
tone_mod = """
  const blockReverb = new Tone.Reverb({ decay: 5.0, preDelay: 0.1 }).toDestination();
  blockReverb.generate();
  const ambientSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.5, decay: 2.0, sustain: 0.1, release: 4.0 }
  }).connect(blockReverb);
  ambientSynth.volume.value = -15;
"""

tone_target = "const delay = new Tone.FeedbackDelay(\"8n\", 0.4).connect(reverb);"
js = js.replace(tone_target, tone_target + "\n" + tone_mod)

tone_play = "ambientSynth.triggerAttackRelease(['C2', 'G2', 'C3'], '2n');"
play_target = "synth.triggerAttackRelease(note, \"8n\", now);"
js = js.replace(play_target, play_target + "\n" + tone_play)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added deep ambient drone and massive reverb synth!")
