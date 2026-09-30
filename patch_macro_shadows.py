import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """    // 4. Fill the massive solid square with the completely dominant color!
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);"""

good = """    // 4. Fill the massive solid square with the completely dominant color!
    ctx.fillStyle = baseColor;
    
    // Premium Drop Shadow & Rounded Tile Look for MACRO
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, size - 2, size - 2, size > 20 ? 6 : 2);
    ctx.fill();
    
    // Clear shadow so it doesn't pollute strokes
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;"""

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Shadows added to MACRO")
else:
    print("Not found")
