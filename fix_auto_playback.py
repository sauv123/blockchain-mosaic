import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """  playbackSlider.max = playbackFullList.length;
  playbackSlider.value = 0;
  playbackCounter.textContent = `0 / ${playbackFullList.length} Blocks`;
  playbackPlayBtn.textContent = 'Play';
  playbackControls.classList.add('active');

  updateStats();
  
  document.querySelectorAll('.calendar-day').forEach(el => {"""

good = """  playbackSlider.max = playbackFullList.length;
  playbackSlider.value = 0;
  playbackCounter.textContent = `0 / ${playbackFullList.length} Blocks`;
  playbackPlayBtn.textContent = 'Play';
  playbackControls.classList.add('active');

  updateStats();
  
  // Fix calendar bug: Automatically start playback to watch it evolve!
  setTimeout(() => { startPlayback(); }, 500);
  
  document.querySelectorAll('.calendar-day').forEach(el => {"""

js = js.replace(bad, good)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Auto-playback fixed")
