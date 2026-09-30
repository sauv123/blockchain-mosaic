with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Hide weather line and add vignette in focus mode
css += """

/* ============================================================
   PREMIUM FOCUS MODE UPGRADES
   ============================================================ */

/* Hide weather line in focus mode */
body.focus-mode #cinematic-weather-line {
  opacity: 0 !important;
  visibility: hidden !important;
}

/* Immersive Vignette Overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.8) 120%);
  opacity: 0;
  z-index: 100;
  transition: opacity 1.5s ease-in-out;
}
body.focus-mode::after {
  opacity: 1;
}

/* Base Canvas for 3D Tilt */
.canvas-container {
  perspective: 1200px;
}
#mosaic-canvas {
  transform-style: preserve-3d;
  transition: transform 0.1s linear, filter 0.5s ease;
  will-change: transform;
}

/* Subtle canvas shadow in focus mode */
body.focus-mode #mosaic-canvas {
  filter: drop-shadow(0 20px 60px rgba(0,0,0,0.6));
}

"""
with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

# 2. Add Parallax Mouse Tracker in JS for Focus Mode
with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

mouse_tracker = """// Mouse tracking for parallax
let mouseX = 0;
let mouseY = 0;
let targetTiltX = 0;
let targetTiltY = 0;
let currentTiltX = 0;
let currentTiltY = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  if (document.body.classList.contains('focus-mode')) {
    // Calculate tilt angles based on mouse position relative to center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Max tilt of 6 degrees for subtle 3D effect
    targetTiltY = ((mouseX - centerX) / centerX) * 6;
    targetTiltX = -((mouseY - centerY) / centerY) * 6;
  } else {
    targetTiltX = 0;
    targetTiltY = 0;
  }
});
"""

# Insert mouse_tracker near the top, after global vars
js = js.replace("""let focusFloatProgress = { value: 0 };""", mouse_tracker + "\nlet focusFloatProgress = { value: 0 };")

# Add the tilt interpolation into the draw loop
draw_hook = """  if (blocks.length === 0 && currentMode === 'LIVE') {"""
draw_tilt = """  // Smooth interpolate canvas tilt for Focus Mode
  if (currentMode !== 'ART_SYNTHESIS') {
    currentTiltX += (targetTiltX - currentTiltX) * 0.05;
    currentTiltY += (targetTiltY - currentTiltY) * 0.05;
    if (Math.abs(currentTiltX) > 0.01 || Math.abs(currentTiltY) > 0.01) {
      canvas.style.transform = `rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg) translateZ(0)`;
    } else if (canvas.style.transform) {
      canvas.style.transform = '';
    }
  }

  if (blocks.length === 0 && currentMode === 'LIVE') {"""
js = js.replace(draw_hook, draw_tilt)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Focus mode upgraded.")
