import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. State variable
if "let renderScale =" not in js:
    js = js.replace("let isDimmingEnabled = true;", "let isDimmingEnabled = true;\nlet renderScale = 'MICRO';")

# 2. Toggle Event Listener
listener_code = """const scaleToggleBtn = document.getElementById('scale-toggle-btn');
if (scaleToggleBtn) {
  scaleToggleBtn.addEventListener('click', () => {
    renderScale = renderScale === 'MICRO' ? 'MACRO' : 'MICRO';
    scaleToggleBtn.textContent = `Grid: ${renderScale.charAt(0) + renderScale.slice(1).toLowerCase()}`;
    if (typeof audio !== 'undefined') audio.playUIHoverTick();
  });
}
"""
if "scaleToggleBtn.addEventListener" not in js:
    js = js.replace("const themeToggleBtn = document.getElementById('theme-toggle-btn');", "const themeToggleBtn = document.getElementById('theme-toggle-btn');\n" + listener_code)

# 3. Magnetic buttons
js = js.replace(
    "const buttons = document.querySelectorAll('header button, #archive-toggle-btn, #theme-toggle-btn');",
    "const buttons = document.querySelectorAll('header button, #archive-toggle-btn, #theme-toggle-btn, #scale-toggle-btn');"
)

# 4. Inject into drawTile
old_loop = """  activeCells.forEach((cell, idx) => {
    const dx = cell.col - 3.5;
    const dy = cell.row - 3.5;"""

new_loop = """  if (renderScale === 'MACRO') {
    const counts = {'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Contract Creation': 0};
    txs.forEach(t => { if(counts[t.type] !== undefined) counts[t.type]++; });
    const domCat = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    let baseColor = currentPalette === 'monochrome' ? theme.accent : PALETTES[currentPalette][domCat];
    const intensity = Math.min(1.0, 0.3 + (block.tx_count / 400));
    
    let isDimmed = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null && domCat !== clickedLegendFilter) {
      isDimmed = true;
    }
    
    ctx.globalAlpha = isDimmed ? 0.05 : intensity * alpha;
    
    const fillSize = size - 2;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillSize, fillSize, 4);
    ctx.fillStyle = baseColor;
    
    if (!isDimmed && intensity > 0.7) {
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 15;
    } else {
      ctx.shadowBlur = 0;
    }
    
    if (block.whale_flag === 1) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
    }
    
    ctx.fill();
    
    ctx.globalAlpha = isDimmed ? 0.01 : 0.15 * alpha;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillSize, fillSize / 2, [4, 4, 0, 0]);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fill();
    
    ctx.globalAlpha = alpha;
  } else {
  activeCells.forEach((cell, idx) => {
    const dx = cell.col - 3.5;
    const dy = cell.row - 3.5;"""

js = js.replace(old_loop, new_loop)

old_loop_end = """      }
    }
    ctx.shadowBlur = 0;
  });

  if (isTracked) {"""

new_loop_end = """      }
    }
    ctx.shadowBlur = 0;
  });
  } // END MACRO

  if (isTracked) {"""

js = js.replace(old_loop_end, new_loop_end)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Macro mode successfully injected!")
