import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = "const maskModifier = isOnTemplate ? 1.0 : 0.05;\n    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);"
good = """const maskModifier = isOnTemplate ? 1.0 : 0.05;
    let isDimmed = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      // In MICRO, we don't have domCat yet, so we don't dim the whole block blindly, we just let individual cells draw.
      // But we can check if there are ANY transactions of the clicked type in this block.
      const hasMatch = txs.some(t => t.type === clickedLegendFilter);
      if (!hasMatch) isDimmed = true;
    }
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);"""

js = js.replace(bad, good)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("isDimmed fixed")
