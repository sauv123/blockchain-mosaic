import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. OPTIMIZE THE 10k LOOP (Fix Jitter) & EXAGGERATE SPAWN
target = """  // SYNC 3D CUBES WITH 2D MOSAIC
  if (window.xrBlockMesh && typeof blocks !== 'undefined' && blocks.length > 0) {"""

optimization = """  // SYNC 3D CUBES WITH 2D MOSAIC
  if (window.xrBlockMesh && typeof blocks !== 'undefined' && blocks.length > 0) {
    const now = Date.now();
    let hasAnimations = false;
    const lastAge = now - (blocks[blocks.length-1]._liveMintedTime || 0);
    const firstAge = now - (blocks[0]._liveMintedTime || 0);
    if (lastAge < 2500 || firstAge < 2500) hasAnimations = true;
    
    let needsFullSync = (blocks.length !== window.xrLastBlockCount || window.xrHoveredIndex !== window.xrLastHoveredCache);
    
    // Performance optimization: SKIP massive JS loop if nothing is moving
    if (!needsFullSync && !hasAnimations) return;
    
    window.xrLastBlockCount = blocks.length;
    window.xrLastHoveredCache = window.xrHoveredIndex;
"""

js = js.replace(target, optimization)

# Exaggerate the pulse
old_pulse = "zSpawnPulse = Math.sin(t * Math.PI) * 2.0; // Pushes OUT and returns"
new_pulse = """zSpawnPulse = Math.sin(t * Math.PI) * 12.0; // EXTREME EXAGGERATION: shoots past the user
               // Global Light Flash on spawn!
               if (t < 0.1 && !window.xrFlashed) {
                   window.xrFlashed = true;
                   xrScene.background.setHex(0x00ff88);
                   setTimeout(() => { xrScene.background.setHex(0x000308); window.xrFlashed = false; }, 100);
               }"""
js = js.replace(old_pulse, new_pulse)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Optimized loop and exaggerated spawn animation!")
