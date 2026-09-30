import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """    if (isFilteredMatch || isBlockHovered) {
       ctx.shadowColor = baseColor;
       ctx.shadowBlur = 15;
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 2;
       ctx.strokeRect(x, y, size, size);
    }"""

good = """    if (isFilteredMatch || isBlockHovered) {
       ctx.shadowColor = baseColor;
       ctx.shadowBlur = 20;
       ctx.strokeStyle = 'rgba(255,255,255,0.85)';
       ctx.lineWidth = 2.5;
       ctx.beginPath();
       ctx.roundRect(x + 1, y + 1, size - 2, size - 2, size > 20 ? 6 : 2);
       ctx.stroke();
    }"""

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Hover stroke fixed")
else:
    print("Not found")
