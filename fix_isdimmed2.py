import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix MACRO block back to normal
macro_bad = """    // Apply intensity culling mask transparency
    const maskModifier = isOnTemplate ? 1.0 : 0.05;
    let isDimmed = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      // In MICRO, we don't have domCat yet, so we don't dim the whole block blindly, we just let individual cells draw.
      // But we can check if there are ANY transactions of the clicked type in this block.
      const hasMatch = txs.some(t => t.type === clickedLegendFilter);
      if (!hasMatch) isDimmed = true;
    }
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);
    if (!isOnTemplate) { ctx.restore(); return; } // Completely hide culled blocks in MACRO for a sharp portrait shape
    ctx.globalAlpha = isDimmed ? 0.1 : 1.0;"""

macro_good = """    // Apply intensity culling mask transparency
    const maskModifier = isOnTemplate ? 1.0 : 0.05;
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);
    if (!isOnTemplate) { ctx.restore(); return; } // Completely hide culled blocks in MACRO for a sharp portrait shape
    ctx.globalAlpha = isDimmed ? 0.1 : 1.0;"""

js = js.replace(macro_bad, macro_good)

# Fix MICRO block
micro_bad = """  if (renderScale === 'MICRO') {
    ctx.save();
    const maskModifier = isOnTemplate ? 1.0 : 0.05;
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);"""

micro_good = """  if (renderScale === 'MICRO') {
    ctx.save();
    const maskModifier = isOnTemplate ? 1.0 : 0.05;
    let isDimmed = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      const hasMatch = txs.some(t => t.type === clickedLegendFilter);
      if (!hasMatch) isDimmed = true;
    }
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);"""

js = js.replace(micro_bad, micro_good)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("isDimmed fixed properly")
