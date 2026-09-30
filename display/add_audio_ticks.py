import re
with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add a tiny tick sound method to AudioEngine
old_audio = """  playBlockTones(block) {
    if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;"""

new_audio = """  playUIHoverTick() {
    if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playBlockTones(block) {
    if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;"""

js = js.replace(old_audio, new_audio)

# Connect it to the magnetic buttons initialization
old_magnetic = """    btn.addEventListener('mousemove', (e) => {"""
new_magnetic = """    btn.addEventListener('mouseenter', () => {
      if (typeof audio !== 'undefined') audio.playUIHoverTick();
    });
    btn.addEventListener('mousemove', (e) => {"""

js = js.replace(old_magnetic, new_magnetic)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Added UI hover ticks.")
