import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """function triggerArtisticSynthesis(day, dayBlocks) {
  currentMode = 'ART_SYNTHESIS';
  pausePlayback();"""

good = """function triggerArtisticSynthesis(day, dayBlocks) {
  currentMode = 'ART_SYNTHESIS';
  
  // Actually trigger the solid-color MACRO portrait view!
  renderScale = 'MACRO';
  if (typeof updateScaleUI === 'function') updateScaleUI();

  pausePlayback();"""

if bad in js:
    js = js.replace(bad, good)
else:
    print("Could not find triggerArtisticSynthesis")
    
# Also ensure returning to live resets to MICRO
bad_live = """  if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
    currentMode = 'LIVE';
    
    tileSize = 64;"""

good_live = """  if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
    currentMode = 'LIVE';
    renderScale = 'MICRO';
    if (typeof updateScaleUI === 'function') updateScaleUI();
    
    tileSize = 64;"""

if bad_live in js:
    js = js.replace(bad_live, good_live)
    
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("View Portrait now triggers MACRO mode")
