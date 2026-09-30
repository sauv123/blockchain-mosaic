import re

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add the toggle button to the header
old_header_controls = """      <button id="theme-toggle-btn">Theme</button>
      <button id="archive-toggle-btn">Archives</button>
      <button id="guide-open-btn">Guide</button>"""
new_header_controls = """      <button id="scale-toggle-btn" title="Toggle between detailed subpixels and solid dominant blocks">Grid: Micro</button>
      <button id="theme-toggle-btn">Theme</button>
      <button id="archive-toggle-btn">Archives</button>
      <button id="guide-open-btn">Guide</button>"""
if 'scale-toggle-btn' not in html:
    html = html.replace(old_header_controls, new_header_controls)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. State variable and button listener
state_vars = "let isDimmingEnabled = true;"
if "let renderScale =" not in js:
    js = js.replace(state_vars, state_vars + "\nlet renderScale = 'MICRO'; // 'MICRO' or 'MACRO'")

init_logic = "const themeToggleBtn = document.getElementById('theme-toggle-btn');"
new_init = """const themeToggleBtn = document.getElementById('theme-toggle-btn');
const scaleToggleBtn = document.getElementById('scale-toggle-btn');
if (scaleToggleBtn) {
  scaleToggleBtn.addEventListener('click', () => {
    renderScale = renderScale === 'MICRO' ? 'MACRO' : 'MICRO';
    scaleToggleBtn.textContent = `Grid: ${renderScale.charAt(0) + renderScale.slice(1).toLowerCase()}`;
    if (typeof audio !== 'undefined') audio.playUIHoverTick(); // Haptic feedback
  });
}
"""
if "scaleToggleBtn.addEventListener" not in js:
    js = js.replace(init_logic, new_init)

# 2. Update drawTile function
# We need to find the activeCells.forEach loop inside drawTile and wrap it.
old_draw_loop = """  activeCells.forEach((cell, idx) => {
    const dx = cell.col - 3.5;
    const dy = cell.row - 3.5;
    const distSq = dx*dx + dy*dy;
    
    // Core structure"""

new_draw_loop = """  if (renderScale === 'MACRO') {
    // === MACRO MODE: SOLID DOMINANT BLOCKS ===
    const counts = {'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Contract Creation': 0};
    txs.forEach(t => { if(counts[t.type] !== undefined) counts[t.type]++; });
    const domCat = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    let baseColor = currentPalette === 'monochrome' ? theme.accent : palette[domCat];
    
    // Intensity based on block transaction volume
    const intensity = Math.min(1.0, 0.3 + (block.tx_count / 400));
    
    // Is Dimmed by legend filter?
    let isDimmed = false;
    if (clickedLegendFilter && domCat !== clickedLegendFilter) {
      isDimmed = true;
    }
    
    ctx.globalAlpha = isDimmed ? 0.05 : intensity;
    
    // Glassmorphic Solid Block Design
    const fillSize = size - 2; // slight gap
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillSize, fillSize, 4);
    
    ctx.fillStyle = baseColor;
    
    // Glow bloom for intense blocks
    if (!isDimmed && intensity > 0.7) {
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 15;
    } else {
      ctx.shadowBlur = 0;
    }
    
    // Whale override
    if (block.whale_flag === 1) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
    }
    
    ctx.fill();
    
    // Top glass highlight
    ctx.globalAlpha = isDimmed ? 0.01 : 0.15;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillSize, fillSize / 2, [4, 4, 0, 0]);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fill();
    
    ctx.globalAlpha = 1.0; // Reset
    
  } else {
    // === MICRO MODE: SUBPIXEL GRID ===
    activeCells.forEach((cell, idx) => {
      const dx = cell.col - 3.5;
      const dy = cell.row - 3.5;
      const distSq = dx*dx + dy*dy;
      
      // Core structure"""

# Close the else block at the end of activeCells loop
# The loop ends with:
#     ctx.shadowBlur = 0;
#   });
old_end_loop = """      }
    }
    ctx.shadowBlur = 0;
  });"""
new_end_loop = """      }
    }
    ctx.shadowBlur = 0;
  });
  } // End MICRO/MACRO split"""

js = js.replace(old_draw_loop, new_draw_loop)
js = js.replace(old_end_loop, new_end_loop)

# Hook the magnetic cursor to the new button
old_magnetic_buttons = "const buttons = document.querySelectorAll('header button, #archive-toggle-btn, #theme-toggle-btn');"
new_magnetic_buttons = "const buttons = document.querySelectorAll('header button, #archive-toggle-btn, #theme-toggle-btn, #scale-toggle-btn');"
js = js.replace(old_magnetic_buttons, new_magnetic_buttons)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("MACRO mode integrated into main app.")
