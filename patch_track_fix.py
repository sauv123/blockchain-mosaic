import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """      if (block.isTracked) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
        // Add a soft glow
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + tileSize/2 - 2, y + tileSize/2 - 2, 4, 4);
        ctx.shadowBlur = 0;
      }"""
      
good = """      if (isTracked) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
        // Add a soft glow
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + tileSize/2 - 2, y + tileSize/2 - 2, 4, 4);
        ctx.shadowBlur = 0;
      }"""

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Fixed isTracked logic")
else:
    print("Not found")
