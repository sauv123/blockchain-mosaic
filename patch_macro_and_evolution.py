import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update the loop limit in draw() to simulate 0-24hr evolution
evolution_injection = """
  let renderLimit = blocks.length;
  if (currentMode === 'HISTORICAL') {
    renderLimit = Math.max(0, Math.floor(blocks.length * historicalPlaybackProgress));
    
    // Update the 24-hour UI display
    const currentHour = Math.floor(historicalPlaybackProgress * 24);
    const hourMins = Math.floor((historicalPlaybackProgress * 24 * 60) % 60);
    const formattedHour = (currentHour < 10 ? '0' : '') + currentHour + ':' + (hourMins < 10 ? '0' : '') + hourMins;
    const hourDisplay = document.getElementById('playback-hour-display');
    if (hourDisplay) hourDisplay.innerText = formattedHour;
  }
  
  for (let index = 0; index < renderLimit; index++) {
"""
js = re.sub(r'for \(let index = 0; index < blocks\.length; index\+\+\) \{', evolution_injection, js)

# 2. Update drawTile() MACRO rendering to be purely solid colors ("beautiful portrait with a solid color in one square")
# Let's locate the MACRO rendering block inside drawTile
macro_block = r"if \(renderScale === 'MACRO'\) \{[\s\S]*?\} \/\/ END MACRO"

solid_macro = """if (renderScale === 'MACRO') {
    // Solid Color Portrait Mode
    const counts = {'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Contract Creation': 0, 'Staking': 0};
    txs.forEach(t => { if(counts[t.type] !== undefined) counts[t.type]++; });
    const domCat = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    let baseColor = PALETTES[currentPalette][domCat] || PALETTES[currentPalette]['default'];
    
    let isDimmed = false;
    let isFilteredMatch = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      if (domCat !== clickedLegendFilter) isDimmed = true;
      else isFilteredMatch = true;
    }
    const isBlockHovered = (typeof hoveredBlock !== 'undefined' && block === hoveredBlock);
    
    ctx.save();
    
    // Apply intensity culling mask transparency
    const maskModifier = isOnTemplate ? 1.0 : 0.05;
    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);
    
    // Draw the pure solid square
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);
    
    if (isFilteredMatch || isBlockHovered) {
       ctx.shadowColor = baseColor;
       ctx.shadowBlur = 15;
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 2;
       ctx.strokeRect(x, y, size, size);
    }
    ctx.restore();
    
  } // END MACRO"""

if re.search(r"if \(renderScale === 'MACRO'\) \{", js):
    js = re.sub(macro_block, solid_macro, js)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Evolution and Solid Color MACRO injected.")
