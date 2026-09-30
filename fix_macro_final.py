import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """  if (renderScale === 'MACRO') {
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
    if (!isOnTemplate) { ctx.restore(); return; } // Completely hide culled blocks in MACRO for a sharp portrait shape
    ctx.globalAlpha = isDimmed ? 0.1 : 1.0;
    
    // Draw the pure solid square (Dominant color logic)
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

good = """  if (renderScale === 'MACRO') {
    // 1. Calculate true dominant transaction type
    let dominantType = 'Plain Transfer';
    let maxCount = 0;
    if (txs && txs.length > 0) {
      let typeCounts = {};
      for (let i = 0; i < txs.length; i++) {
        let type = txs[i].type || 'Plain Transfer';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        if (typeCounts[type] > maxCount) {
          maxCount = typeCounts[type];
          dominantType = type;
        }
      }
    }
    
    // 2. Fetch color from palette safely
    const baseColor = PALETTES[currentPalette][dominantType] || PALETTES[currentPalette]['default'] || 'hsl(210, 100%, 50%)';
    
    let isDimmed = false;
    let isFilteredMatch = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      if (dominantType !== clickedLegendFilter) isDimmed = true;
      else isFilteredMatch = true;
    }
    const isBlockHovered = (typeof hoveredBlock !== 'undefined' && block === hoveredBlock);
    
    ctx.save();
    
    // 3. Shape the portrait using the template
    if (!isOnTemplate) { 
      ctx.restore(); 
      return; 
    }
    
    ctx.globalAlpha = isDimmed ? 0.15 : 1.0;
    
    // 4. Fill the massive solid square with the completely dominant color!
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

if bad in js:
    js = js.replace(bad, good)
    print("Replaced successfully")
else:
    print("Could not find bad block")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
