import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """  if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
    currentMode = 'LIVE';"""

good = """  const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.textContent = 'View Portrait';
    genPortraitBtn.style.color = '#00ff88';
    genPortraitBtn.style.borderColor = 'rgba(0,255,136,0.4)';
    genPortraitBtn.style.background = 'rgba(0,255,136,0.12)';
  }

  if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
    currentMode = 'LIVE';"""

js = js.replace(bad, good)
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("switchToLive patched")
