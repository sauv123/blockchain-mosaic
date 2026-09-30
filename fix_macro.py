import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the MACRO color logic
macro_bad = """    // Draw the pure solid square
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);"""

macro_good = """    // Draw the pure solid square (Dominant color logic)
    let dominantType = 'Plain Transfer';
    if (txs && txs.length > 0) {
      let typeCounts = {};
      let maxCount = 0;
      for (let i = 0; i < txs.length; i++) {
        let type = txs[i].type || 'Plain Transfer';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        if (typeCounts[type] > maxCount) {
          maxCount = typeCounts[type];
          dominantType = type;
        }
      }
    }
    const dominantColor = PALETTES[currentPalette][dominantType] || PALETTES[currentPalette]['default'];
    ctx.fillStyle = dominantColor;
    ctx.fillRect(x, y, size, size);"""

if macro_bad in js:
    js = js.replace(macro_bad, macro_good)
else:
    print("Could not find macro color logic")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Macro dominant color fixed")
