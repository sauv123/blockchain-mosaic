import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """const archiveToggleBtn = document.getElementById('archive-toggle-btn');
const archiveDrawer = document.getElementById('archive-drawer');"""

good = """const archiveToggleBtn = document.getElementById('archive-toggle-btn');
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
"""

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("JS successfully added")
else:
    print("NOT FOUND!")
