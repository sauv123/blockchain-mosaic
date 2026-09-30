import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add Generative Math and Intensity Logic
generative_code = """
// === GENERATIVE DAILY ALGORITHM ===
// This replaces static PNG masks with infinite procedural mathematical shapes

function getDailyIntensity(dayNum) {
  // Deterministic pseudo-random intensity based on the day
  // In a real backend, this reads from Total USD Volume
  const hash = (dayNum * 137) % 3;
  if (hash === 0) return 'HEAVY';
  if (hash === 1) return 'LIGHT';
  return 'MODERATE';
}

function getGenerativeDailyShape(col, row, daySeed, intensity) {
  // 1. Procedural Noise Generation (Creates infinite unique organic shapes)
  const frequency = 0.1 + (daySeed % 15) * 0.015;
  const phaseX = Math.sin(row * frequency + daySeed);
  const phaseY = Math.cos(col * frequency - daySeed);
  const noise = Math.sin(phaseX + phaseY) * Math.cos(phaseX - phaseY);
  
  // 2. Shape Culling based on Intensity
  let threshold = 0;
  if (intensity === 'HEAVY') threshold = -0.6; // Most blocks survive -> massive solid wall
  if (intensity === 'MODERATE') threshold = 0.0; // Half survive -> organic archipelago
  if (intensity === 'LIGHT') threshold = 0.5; // Few survive -> scattered constellation
  
  return noise > threshold;
}

function getDynamicGutter(intensity) {
  if (intensity === 'HEAVY') return 0;   // Blocks fuse together (Viscous/Heavy)
  if (intensity === 'LIGHT') return 3.5; // Blocks separate wildly (Airy/Porous)
  return 1.2;                            // Standard structural grid
}
"""

if "function getGenerativeDailyShape" not in js:
    js = js.replace("// === CIRCADIAN UI ENGINE (Time of Day) ===", generative_code + "\n// === CIRCADIAN UI ENGINE (Time of Day) ===")

# 2. Hook it into the draw loop
# Find: const isOnTemplate = currentMode === 'HISTORICAL' ? getDailyMaskAlignment(col, row, category) : true;
old_template_logic = "const isOnTemplate = currentMode === 'HISTORICAL' ? getDailyMaskAlignment(col, row, category) : true;"

new_template_logic = """
    let isOnTemplate = true;
    let dynamicGutter = gutter;
    
    if (currentMode === 'HISTORICAL') {
      const intensity = getDailyIntensity(historicalDayNumber);
      isOnTemplate = getGenerativeDailyShape(col, row, historicalDayNumber, intensity);
      dynamicGutter = getDynamicGutter(intensity);
    } else {
      // In LIVE mode, maybe calculate rolling intensity. For now, default.
      dynamicGutter = gutter;
    }
"""
if "getGenerativeDailyShape(col, row," not in js:
    js = js.replace(old_template_logic, new_template_logic)

# Replace tileSize - gutter with tileSize - dynamicGutter in the drawTile call
if "tileSize - dynamicGutter" not in js:
    js = js.replace("tileSize - gutter", "tileSize - dynamicGutter")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Generative algorithm injected!")
