import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = """    if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
    } else {
      ctx.fillStyle = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');
    }
    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);"""

new_code = """    let isDimmed = false;
    let isFilteredMatch = false;
    if (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null) {
      if (tx.type !== clickedLegendFilter) isDimmed = true;
      else isFilteredMatch = true;
    }
    const isBlockHovered = (typeof hoveredBlock !== 'undefined' && block === hoveredBlock);
    
    if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
    } else {
      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');
        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }
    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    ctx.shadowBlur = 0;"""

if target in js:
    js = js.replace(target, new_code)
    print("Glow logic replaced!")
else:
    print("Could not find glow logic target.")

# Ledger update
js = js.replace(
    "if (text.includes('Plain Transfer')) typeKey = 'Plain Transfer';", 
    "if (text.includes('Plain Transfer') || text.includes('Direct Payments')) typeKey = 'Plain Transfer';"
)
js = js.replace(
    "else if (text.includes('Token Swap')) typeKey = 'Token Swap';",
    "else if (text.includes('Token Swap') || text.includes('Trading Coins')) typeKey = 'Token Swap';"
)
js = js.replace(
    "else if (text.includes('NFT Mint')) typeKey = 'NFT Mint';",
    "else if (text.includes('NFT Mint') || text.includes('Digital Art')) typeKey = 'NFT Mint';"
)

with open('mosaic.js', 'w') as f:
    f.write(js)

with open('mosaic.html', 'r') as f:
    html = f.read()

html = html.replace('Transfers', 'Direct Payments')
html = html.replace('DeFi Swaps', 'Trading Coins')
html = html.replace('NFT Mints', 'Digital Art')

with open('mosaic.html', 'w') as f:
    f.write(html)
