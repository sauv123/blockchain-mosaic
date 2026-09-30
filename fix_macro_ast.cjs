const fs = require('fs');

let js = fs.readFileSync('display/mosaic.js', 'utf8');

// 1. Inject renderScale at top
if (!js.includes("let renderScale =")) {
  js = js.replace(/let isDimmingEnabled = true;/, "let isDimmingEnabled = true;\nlet renderScale = 'MICRO';");
}

// 2. Inject scale toggle listener
const listenerCode = `const scaleToggleBtn = document.getElementById('scale-toggle-btn');
if (scaleToggleBtn) {
  scaleToggleBtn.addEventListener('click', () => {
    renderScale = renderScale === 'MICRO' ? 'MACRO' : 'MICRO';
    scaleToggleBtn.textContent = \`Grid: \${renderScale.charAt(0) + renderScale.slice(1).toLowerCase()}\`;
    if (typeof audio !== 'undefined') audio.playUIHoverTick();
  });
}`;
if (!js.includes("scale-toggle-btn")) {
  js = js.replace("const themeToggleBtn = document.getElementById('theme-toggle-btn');", "const themeToggleBtn = document.getElementById('theme-toggle-btn');\n" + listenerCode);
}

// 3. Update the magnetic buttons
js = js.replace(/const buttons = document.querySelectorAll\('header button, #archive-toggle-btn, #theme-toggle-btn'\);/, "const buttons = document.querySelectorAll('header button, #archive-toggle-btn, #theme-toggle-btn, #scale-toggle-btn');");

// 4. Overhaul drawTile
const drawTileRegex = /(function drawTile\(ctx, x, y, size, block, alpha = 1\.0, activeCells, targetOnCount, isOnTemplate\)\s*\{)([\s\S]*?)(if \(isTracked\))/;
const match = js.match(drawTileRegex);

if (match) {
  let innerBody = match[2];
  
  // Cut out the activeCells loop
  const loopStart = "activeCells.forEach((cell, idx) => {";
  const loopEnd = "    ctx.shadowBlur = 0;\n  });";
  
  const loopStartIndex = innerBody.indexOf(loopStart);
  const loopEndIndex = innerBody.indexOf(loopEnd) + loopEnd.length;
  
  if (loopStartIndex !== -1 && loopEndIndex !== -1) {
    const originalLoop = innerBody.substring(loopStartIndex, loopEndIndex);
    
    const newLoop = `
  if (renderScale === 'MACRO') {
    const counts = {'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Contract Creation': 0};
    txs.forEach(t => { if(counts[t.type] !== undefined) counts[t.type]++; });
    const domCat = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    let baseColor = currentPalette === 'monochrome' ? theme.accent : palette[domCat];
    
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
    ${originalLoop}
  }`;
    
    innerBody = innerBody.substring(0, loopStartIndex) + newLoop + innerBody.substring(loopEndIndex);
    
    js = js.replace(match[0], match[1] + innerBody + match[3]);
  }
}

// 5. Fix any broken syntax from previous bad sed replace if there was one
// Check if there are extra brackets
try {
  new Function(js);
  console.log("Syntax is valid!");
} catch(e) {
  console.log("SYNTAX ERROR STILL PRESENT:", e);
}

fs.writeFileSync('display/mosaic.js', js);
