import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# 1. Declare shockwaves at the top
if 'let shockwaves = [];' not in js:
    js = js.replace('let blocks = [];', 'let blocks = [];\nlet shockwaves = [];')
    
# 2. Push to shockwaves
push_target = """    blocks.push(newBlock);
    if (blocks.length > maxTiles) {
      blocks.shift();
    }"""
push_new = """    blocks.push(newBlock);
    if (blocks.length > maxTiles) {
      blocks.shift();
    }
    // Calculate block X/Y for shockwave
    if (typeof cols !== 'undefined' && typeof cellSize !== 'undefined') {
      const bIndex = blocks.length - 1;
      let bCol = bIndex % cols;
      let bRow = Math.floor(bIndex / cols);
      const originX = bCol * (cellSize + gap) + marginX + (cellSize / 2);
      const originY = bRow * (cellSize + gap) + marginY + (cellSize / 2);
      if (typeof shockwaves !== 'undefined') {
        shockwaves.push({ x: originX, y: originY, radius: 0, opacity: 1.0 });
      }
    }"""
if 'shockwaves.push' not in js:
    js = js.replace(push_target, push_new)

# 3. Draw shockwaves
draw_target = """  requestAnimationFrame(draw);
}"""
draw_new = """  // Render Shockwaves
  if (currentMode !== 'ART_SYNTHESIS' && typeof shockwaves !== 'undefined') {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      let sw = shockwaves[i];
      sw.radius += 3;
      sw.opacity -= 0.015;
      
      if (sw.opacity <= 0) {
        shockwaves.splice(i, 1);
        continue;
      }
      
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${sw.opacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  requestAnimationFrame(draw);
}"""
if 'Render Shockwaves' not in js:
    js = js.replace(draw_target, draw_new)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("Ripples injected safely.")
