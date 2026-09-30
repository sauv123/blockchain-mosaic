import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add the scale toggle listener
hook_bad = """const archiveDrawer = document.getElementById('archive-drawer');
const archiveToggleBtn = document.getElementById('archive-toggle-btn');"""

hook_good = """const archiveDrawer = document.getElementById('archive-drawer');
const archiveToggleBtn = document.getElementById('archive-toggle-btn');
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

if hook_bad in js:
    js = js.replace(hook_bad, hook_good)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("JS UI logic re-injected")
