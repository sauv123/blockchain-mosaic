import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the broken scale and color logic inside the 10k loop
target = """       // Scale the cube based on the block grid
       const scaleSize = (blockH * 0.8) * 4; // Arbitrary nice scale
       let spawnScale = 1;
       let zSpawnPulse = 0;
       
       if (block._liveMintedTime) {
           const age = Date.now() - block._liveMintedTime;
           if (age < 2000) {
               // Elastic ease out
               const t = age / 2000;
               spawnScale = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
               zSpawnPulse = Math.sin(t * Math.PI) * 12.0; // EXTREME EXAGGERATION: shoots past the user
               // Global Light Flash on spawn!
               if (t < 0.1 && !window.xrFlashed) {
                   window.xrFlashed = true;
                   xrScene.background.setHex(0x00ff88);
                   setTimeout(() => { xrScene.background.setHex(0x000308); window.xrFlashed = false; }, 100);
               }
           }
       }
       
       dummy.scale.set(scaleSize * spawnScale, scaleSize * spawnScale, isHovered ? scaleSize * 2 : (scaleSize * 0.5) + zSpawnPulse);
       
       // Pop outwards slightly on spawn
       if (zSpawnPulse > 0) {
           dummy.position.x -= Math.sin(theta) * zSpawnPulse;
           dummy.position.z += Math.cos(theta) * zSpawnPulse;
       }
       
       dummy.updateMatrix();
       window.xrBlockMesh.setMatrixAt(i, dummy.matrix);
       
       // Extract color from block (we can use the dominant hue)
       const hue = block.hue || 200;
       const lit = isHovered ? 80 : 50;
       c.setHSL(hue / 360, 1.0, lit / 100);
       window.xrBlockMesh.setColorAt(i, c);"""

fixed_logic = """       // Perfectly calculate non-overlapping scale
       const arcLength = blockW * R;
       const scaleSize = Math.min(arcLength, blockH) * 0.85; // 15% gap between blocks
       
       let spawnScale = 1;
       let zSpawnPulse = 0;
       
       if (block._liveMintedTime) {
           const age = Date.now() - block._liveMintedTime;
           if (age < 2000) {
               // Elastic ease out
               const t = age / 2000;
               spawnScale = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
               zSpawnPulse = Math.sin(t * Math.PI) * 10.0; // Pushes OUT and returns
               
               // Global Light Flash on spawn!
               if (t < 0.1 && !window.xrFlashed) {
                   window.xrFlashed = true;
                   if (xrScene.background && xrScene.background.setHex) xrScene.background.setHex(0x00ff88);
                   setTimeout(() => { if (xrScene.background && xrScene.background.setHex) xrScene.background.setHex(0x000308); window.xrFlashed = false; }, 100);
               }
           }
       }
       
       // Scale properly
       dummy.scale.set(scaleSize * spawnScale, scaleSize * spawnScale, isHovered ? scaleSize * 4 : scaleSize + zSpawnPulse);
       
       // Pop outwards slightly on spawn
       if (zSpawnPulse > 0) {
           dummy.position.x -= Math.sin(theta) * zSpawnPulse;
           dummy.position.z += Math.cos(theta) * zSpawnPulse;
       }
       
       dummy.updateMatrix();
       window.xrBlockMesh.setMatrixAt(i, dummy.matrix);
       
       // Get exact color from 2D palette!
       let colorStr = 'hsl(210, 100%, 50%)'; // default blue fallback
       if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && block.dominant_type) {
           colorStr = PALETTES[currentPalette][block.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
       }
       
       try {
           c.setStyle(colorStr);
           if (isHovered) {
              c.offsetHSL(0, 0, 0.2); // Brighten on hover
           } else {
              c.offsetHSL(0, 0, -0.1); // Slightly dim standard
           }
       } catch(e) { c.setHex(0x00ff88); }
       
       window.xrBlockMesh.setColorAt(i, c);"""

js = js.replace(target, fixed_logic)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed Z-fighting scaling and correctly mapped the actual network colors!")
