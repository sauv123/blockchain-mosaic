import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

micro_logic = """
  } // END MACRO

  if (renderScale === 'MICRO') {
    ctx.save();
    const maskModifier = isOnTemplate ? 1.0 : 0.05;
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);
    const subSize = size / 8;
    
    activeCells.forEach(cell => {
      const tx = txs[cell.index % txs.length] || { type: 'Plain Transfer' };
      const cellColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
      ctx.fillStyle = cellColor;
      
      // Slight margin for subpixels so they look like a grid
      ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    });
    ctx.restore();
"""

js = js.replace("  } // END MACRO", micro_logic)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("MICRO restored")
