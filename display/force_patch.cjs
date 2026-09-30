const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const anchor = "ctx.fillStyle = baseColor.replace(')', \`, \${finalOpacity})\`).replace('hsl', 'hsla');";
const anchor2 = "ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);";

const startIdx = js.indexOf(anchor);
const endIdx = js.indexOf(anchor2) + anchor2.length;

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `
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
    
    js = js.substring(0, startIdx) + replacement + js.substring(endIdx);
    fs.writeFileSync('mosaic.js', js);
    console.log("FORCE PATCH SUCCESS");
} else {
    console.log("COULD NOT FIND ANCHORS");
}
