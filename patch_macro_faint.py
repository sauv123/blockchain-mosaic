import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """    // 3. Shape the portrait using the template
    if (!isOnTemplate) { 
      ctx.restore(); 
      return; 
    }"""

good = """    // 3. Shape the portrait using the template
    if (!isOnTemplate) { 
      ctx.globalAlpha = 0.03; // Faintly draw the background context so the shape has a 'place'
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, size - 2, size - 2, size > 20 ? 6 : 2);
      ctx.fill();
      ctx.restore(); 
      return; 
    }"""

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Faint background shape added")
else:
    print("Not found")
