const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const anchor = `    if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
      ctx.fillStyle = \\\`rgba(255, 255, 255, \\\${finalOpacity})\\\`;
    } else {
      ctx.fillStyle = baseColor.replace(')', \\\`, \\\${finalOpacity})\\\`).replace('hsl', 'hsla');
    }
    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);`;

const replacement = `
    let isDimmed = false;
    let isFilteredMatch = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      if (tx.type !== clickedLegendFilter) isDimmed = true;
      else isFilteredMatch = true;
    }
    const isBlockHovered = (typeof hoveredBlock !== 'undefined' && block === hoveredBlock);
    
    if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
      ctx.fillStyle = \\\`rgba(255, 255, 255, \\\${finalOpacity})\\\`;
    } else {
      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = baseColor.replace(')', \\\`, \\\${finalOpacity})\\\`).replace('hsl', 'hsla');
        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }
    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    ctx.shadowBlur = 0;
`;

const idx = js.indexOf("if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {");
if (idx !== -1) {
    const endIdx = js.indexOf("ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);") + "ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);".length;
    
    js = js.substring(0, idx) + replacement.replace(/\\\\`/g, '`').replace(/\\\\\$/g, '$') + js.substring(endIdx);
    fs.writeFileSync('mosaic.js', js);
    console.log("GLOW PATCH APPLIED");
}

// 2. Legend Logic Text Updates
js = js.replace(/if \(text\.includes\('Plain Transfer'\)\) typeKey = 'Plain Transfer';/g, "if (text.includes('Plain Transfer') || text.includes('Direct Payments')) typeKey = 'Plain Transfer';");
js = js.replace(/else if \(text\.includes\('Token Swap'\)\) typeKey = 'Token Swap';/g, "else if (text.includes('Token Swap') || text.includes('Trading Coins')) typeKey = 'Token Swap';");
js = js.replace(/else if \(text\.includes\('NFT Mint'\)\) typeKey = 'NFT Mint';/g, "else if (text.includes('NFT Mint') || text.includes('Digital Art')) typeKey = 'NFT Mint';");

fs.writeFileSync('mosaic.js', js);

// Patching the HTML directly for the legend text
let html = fs.readFileSync('mosaic.html', 'utf8');
html = html.replace(/Transfers/g, "Direct Payments");
html = html.replace(/DeFi Swaps/g, "Trading Coins");
html = html.replace(/NFT Mints/g, "Digital Art");
fs.writeFileSync('mosaic.html', html);

console.log("HTML and Ledger Patched");
