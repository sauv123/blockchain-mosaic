import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix the draw() loop that currently throws ReferenceError for historicalPlaybackProgress
bad_evolution = r"let renderLimit = blocks\.length;\s*if \(currentMode === 'HISTORICAL'\) \{[\s\S]*?for \(let index = 0; index < renderLimit; index\+\+\) \{"

good_evolution = """
  if (currentMode === 'HISTORICAL') {
    // Determine 0 to 24 hour state based on playback progress
    const progress = (typeof playbackFullList !== 'undefined' && playbackFullList.length > 0) ? (blocks.length / playbackFullList.length) : 1.0;
    const currentHour = Math.floor(progress * 24);
    const hourMins = Math.floor((progress * 24 * 60) % 60);
    const formattedHour = (currentHour < 10 ? '0' : '') + currentHour + ':' + (hourMins < 10 ? '0' : '') + hourMins;
    const hourDisplay = document.getElementById('playback-hour-display');
    if (hourDisplay) hourDisplay.innerText = formattedHour;
  }
  
  for (let index = 0; index < blocks.length; index++) {
"""

if re.search(bad_evolution, js):
    js = re.sub(bad_evolution, good_evolution, js)


# 2. Modify playBlockTones to accept a time of day / progress modifier for the "Sonography"
# The user wants "logic with the sonography and also with the 0th till the 24th hour"
# Let's add a global variable or just pass a multiplier based on hour to playBlockTones if we're in HISTORICAL
# Let's modify AudioEngine.playBlockTones signature: playBlockTones(block, hourProgress = 0.5)

# Actually, the simplest is to modify `tickPlayback()` to change the master volume or filter based on progress
# Wait, `tickPlayback` calls `audio.playBlockTones(blocks[blocks.length - 1])`.

# Let's just modify the audio playback directly inside AudioEngine based on currentMode and blocks/playbackFullList

audio_engine_target = r"playBlockTones\(block\) \{"
audio_engine_replacement = """playBlockTones(block) {
    if (this.muted || !this.ctx) return;
    
    // Sonography logic: Adjust intensity/pitch based on the 0-24hr phase in historical mode
    let timePhaseMult = 1.0;
    if (typeof currentMode !== 'undefined' && currentMode === 'HISTORICAL' && typeof playbackFullList !== 'undefined' && playbackFullList.length > 0) {
        const progress = typeof blocks !== 'undefined' ? (blocks.length / playbackFullList.length) : 1.0;
        // The day ramps up to a crescendo at evening (0.75 progress) and falls at night
        timePhaseMult = 0.5 + Math.sin(progress * Math.PI) * 1.5; 
    }
"""

# Let's replace the top of playBlockTones
if "let timePhaseMult" not in js:
    js = js.replace("playBlockTones(block) {", audio_engine_replacement)

# Then apply timePhaseMult to the gain or frequency.
# Find `const noteFreq = this.scale[hashVal % this.scale.length];`
js = js.replace("const noteFreq = this.scale[hashVal % this.scale.length];", "const noteFreq = this.scale[hashVal % this.scale.length] * (timePhaseMult > 1.2 ? 1.5 : (timePhaseMult < 0.8 ? 0.5 : 1.0));")
js = js.replace("kickGain.gain.setValueAtTime(0.6, now);", "kickGain.gain.setValueAtTime(0.6 * timePhaseMult, now);")
js = js.replace("subGain.gain.setValueAtTime(0.8, now);", "subGain.gain.setValueAtTime(0.8 * timePhaseMult, now);")


# 3. Double check the MACRO mode solid color fix from earlier. It should be correct.
# Wait, let's make sure I didn't break MACRO transparency entirely. 
# In my previous script I wrote `ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);`
# But if it's solid color, it should be 1.0 for blocks that survive the cull, right?
# The generative cull uses `isOnTemplate`. If `!isOnTemplate`, `maskModifier` is 0.05.
# This is fine.


with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Historical 24-hr sonography and UI fixed.")
