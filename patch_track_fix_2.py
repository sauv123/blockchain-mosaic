import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """  if (isTracked) {
    ctx.strokeStyle = trackDirection === 'sent' ? 'rgba(255, 120, 0, 0.85)' : 'rgba(0, 229, 255, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  }"""

good = """  if (isTracked) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    // Add intense visual tracking glow
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + size/2 - 2, y + size/2 - 2, 4, 4);
    ctx.shadowBlur = 0;
  }"""

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Fixed isTracked rendering")
else:
    print("Not found")
