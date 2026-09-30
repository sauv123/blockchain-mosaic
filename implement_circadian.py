import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Inject the Circadian Engine Logic
circadian_code = """
// === CIRCADIAN UI ENGINE (Time of Day) ===
function getCircadianState() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 21) return 'EVENING';
  return 'NIGHT';
}

function applyCircadianAmbientLayer(ctx, width, height, state) {
  // If not on charcoal/dark theme, don't overwhelm the warmGray theme
  if (currentTheme !== 'charcoal') return;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (state === 'MORNING') {
    grad.addColorStop(0, 'rgba(40, 60, 90, 0.1)'); // Soft dawn blue
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (state === 'AFTERNOON') {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.05)'); // Neutral
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (state === 'EVENING') {
    grad.addColorStop(0, 'rgba(255, 120, 50, 0.08)'); // Sunset amber glow
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    // NIGHT
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)'); // Deep shadow
    grad.addColorStop(1, 'rgba(5, 5, 15, 0.4)'); // Void
  }

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}
"""

if "function getCircadianState" not in js:
    # Inject it before the draw function
    js = js.replace("function draw() {", circadian_code + "\nfunction draw() {")

# 2. Inject into the main draw() function to render the ambient layer
old_draw_clear = """  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);"""

new_draw_clear = """  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Apply Time of Day Ambient Glow
  const circadianState = getCircadianState();
  applyCircadianAmbientLayer(ctx, canvas.width, canvas.height, circadianState);"""

if "applyCircadianAmbientLayer" not in js and old_draw_clear in js:
    js = js.replace(old_draw_clear, new_draw_clear)
elif "applyCircadianAmbientLayer" not in js:
    # Fallback if Exact match failed
    js = js.replace("ctx.clearRect(0, 0, canvas.width, canvas.height);", "ctx.clearRect(0, 0, canvas.width, canvas.height);\n  const circadianState = getCircadianState();\n  applyCircadianAmbientLayer(ctx, canvas.width, canvas.height, circadianState);")

# 3. Adjust block brightness (alpha) at night in drawTile()
# We need to find where alpha is set or used, but the simplest is at the top of drawTile
night_alpha_code = """
  // Circadian brightness dampening
  const cState = getCircadianState();
  if (cState === 'NIGHT' && currentTheme === 'charcoal') {
    alpha *= 0.65; // Dim the entire grid by 35% for comfortable night viewing
  } else if (cState === 'MORNING' && currentTheme === 'charcoal') {
    alpha *= 1.1; // Slight brightness boost for morning clarity
  }
"""

old_drawTile = """function drawTile(ctx, x, y, size, block, blockInterval, alpha, theme, isTracked, trackDirection, isOnTemplate) {"""
new_drawTile = old_drawTile + "\n" + night_alpha_code

if "Circadian brightness dampening" not in js:
    js = js.replace(old_drawTile, new_drawTile)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Circadian engine injected successfully!")
