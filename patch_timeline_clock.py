import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

helper = """function updatePlaybackTimeDisplay() {
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
"""

if "updatePlaybackTimeDisplay" not in js:
    js = js.replace("function tickPlayback() {", helper + "\nfunction tickPlayback() {")

# Patch tickPlayback
bad_tick = "playbackCounter.textContent = `${playbackIndex} / ${playbackFullList.length} Blocks`;"
good_tick = """playbackCounter.textContent = `${playbackIndex} / ${playbackFullList.length} Blocks`;
  updatePlaybackTimeDisplay();"""
js = js.replace(bad_tick, good_tick)

# Patch slider
bad_slider = "playbackCounter.textContent = `${playbackIndex} / ${playbackFullList.length} Blocks`;"
good_slider = """playbackCounter.textContent = `${playbackIndex} / ${playbackFullList.length} Blocks`;
  updatePlaybackTimeDisplay();"""
js = js.replace(bad_slider, good_slider)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Timeline clock patched")
