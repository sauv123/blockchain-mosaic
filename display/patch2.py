import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = """  if (hoveredBlock) {
    const idx = blocks.indexOf(hoveredBlock);
    if (idx !== -1) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(col * tileSize, row * tileSize, tileSize - gutter, tileSize - gutter);
    }
  }"""

new_code = """  if (hoveredBlock) {
    const idx = blocks.indexOf(hoveredBlock);
    if (idx !== -1) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * tileSize;
      const y = row * tileSize;
      const size = tileSize - gutter;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 20;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeRect(x, y, size, size);
      ctx.restore();
    }
  }"""

if target in js:
    js = js.replace(target, new_code)
    print("Block glow replaced!")
else:
    print("Could not find block glow target.")

with open('mosaic.js', 'w') as f:
    f.write(js)
