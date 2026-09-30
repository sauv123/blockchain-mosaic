const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

// 1. Element Glow
// We need to replace the fillRect for the individual elements.
// In mosaic.js it looks like:
// ctx.fillStyle = baseColor.replace(')', \`, \${finalOpacity})\`).replace('hsl', 'hsla');
// ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
const glowRegex = /ctx\.fillStyle = baseColor\.replace\('\)', \`, \\\$\\{finalOpacity\\}\)\`\)\.replace\('hsl', 'hsla'\);\s*ctx\.fillRect\(x \+ cell\.col \* subSize \+ 0\.5, y \+ cell\.row \* subSize \+ 0\.5, subSize - 1, subSize - 1\);/m;

const glowNew = `
      let isDimmed = false;
      let isFilteredMatch = false;
      if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
        if (tx.type !== clickedLegendFilter) isDimmed = true;
        else isFilteredMatch = true;
      }
      const isBlockHovered = (typeof hoveredBlock !== 'undefined' && block === hoveredBlock);
      
      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = baseColor.replace(')', \`, \${finalOpacity})\`).replace('hsl', 'hsla');
        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
      }
      ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
      ctx.shadowBlur = 0;
`;
if (js.match(glowRegex)) {
  js = js.replace(glowRegex, glowNew.trim());
} else {
  console.log("FAILED to match glow logic");
}

// 2. Legend Text Change
js = js.replace(/Transfers/g, "Direct Payments");
js = js.replace(/DeFi Swaps/g, "Trading Coins");
js = js.replace(/NFT Mints/g, "Digital Art");

// 3. Fix the Interactive Ledger filtering so it matches the new English text or the original types
const clickLogicRegex = /if \(text\.includes\('Plain Transfer'\)\) typeKey = 'Plain Transfer';\s*else if \(text\.includes\('Token Swap'\)\) typeKey = 'Token Swap';\s*else if \(text\.includes\('NFT Mint'\)\) typeKey = 'NFT Mint';/m;
const clickLogicNew = `
    if (text.includes('Direct Payments') || text.includes('Transfer')) typeKey = 'Plain Transfer';
    else if (text.includes('Trading Coins') || text.includes('Swap')) typeKey = 'Token Swap';
    else if (text.includes('Digital Art') || text.includes('Mint')) typeKey = 'NFT Mint';
`;
if (js.match(clickLogicRegex)) {
  js = js.replace(clickLogicRegex, clickLogicNew.trim());
} else {
  console.log("FAILED to match click logic");
}

fs.writeFileSync('mosaic.js', js);
console.log("Ultimate fix applied.");
