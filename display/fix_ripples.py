import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# Add ripples array and push logic
setup_hook = """const filterCountTooltip = document.getElementById('filter-count-tooltip');"""
new_setup = """const filterCountTooltip = document.getElementById('filter-count-tooltip');
let shockwaves = [];
"""
js = js.replace(setup_hook, new_setup)

# Push to shockwaves when new block arrives
block_hook = """blocks.push(newBlock);
    if (blocks.length > maxTiles) {
      blocks.shift();
    }"""
new_block_hook = """blocks.push(newBlock);
    if (blocks.length > maxTiles) {
      blocks.shift();
    }
    // Calculate block X/Y for shockwave
    const bIndex = blocks.length - 1;
    let bCol = bIndex % cols;
    let bRow = Math.floor(bIndex / cols);
    const originX = bCol * (cellSize + gap) + marginX + (cellSize / 2);
    const originY = bRow * (cellSize + gap) + marginY + (cellSize / 2);
    shockwaves.push({ x: originX, y: originY, radius: 0, opacity: 1.0 });
"""
js = js.replace(block_hook, new_block_hook)

# Render shockwaves in draw loop
draw_hook = """requestAnimationFrame(draw);
}"""
new_draw_hook = """  // Render Shockwaves
  if (currentMode !== 'ART_SYNTHESIS') {
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
js = js.replace(draw_hook, new_draw_hook)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("Ripples injected.")
