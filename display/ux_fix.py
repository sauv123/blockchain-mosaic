import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# 1. Remove the Block Level frosted glass glow
target_block_glow = """  if (hoveredBlock) {
    const idx = blocks.indexOf(hoveredBlock);
    if (idx !== -1) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * tileSize;
      const y = row * tileSize;
      const size = tileSize - gutter;
      
      ctx.save();
      // Block level glow
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 20;
      ctx.fillRect(x, y, size, size);
      
      // Crisp outer border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeRect(x, y, size, size);
      ctx.restore();
    }
  }"""

new_block_glow = """  if (hoveredBlock) {
    const idx = blocks.indexOf(hoveredBlock);
    if (idx !== -1) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * tileSize;
      const y = row * tileSize;
      const size = tileSize - gutter;
      
      ctx.save();
      // Crisp outer border ONLY (no frosted glass)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, size, size);
      ctx.restore();
    }
  }"""

if target_block_glow in js:
    js = js.replace(target_block_glow, new_block_glow)
else:
    print("Could not find block glow target.")


# 2. Fix the interactive ledger matching and text
js = js.replace("> Transfers</span>", "> Direct Payments</span>")
js = js.replace("> DeFi Swaps</span>", "> Trading Coins</span>")
js = js.replace("> NFT Mints</span>", "> Digital Art</span>")

js = js.replace("if (text.includes('Plain Transfer') || text.includes('Direct Payments')) typeKey = 'Plain Transfer';", "if (text.includes('Direct Payments')) typeKey = 'Plain Transfer';")
js = js.replace("else if (text.includes('Token Swap') || text.includes('Trading Coins')) typeKey = 'Token Swap';", "else if (text.includes('Trading Coins')) typeKey = 'Token Swap';")
js = js.replace("else if (text.includes('NFT Mint') || text.includes('Digital Art')) typeKey = 'NFT Mint';", "else if (text.includes('Digital Art')) typeKey = 'NFT Mint';")

# 3. Enhance element glow with slight 3D
target_element_glow = """    if (isDimmed) {
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
    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);"""

new_element_glow = """    if (isDimmed) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.shadowBlur = 0;
      ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    } else {
      const parsedColor = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');
      
      // Slight 3D bevel / shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 0;
      ctx.fillRect(x + cell.col * subSize + 1.5, y + cell.row * subSize + 1.5, subSize - 1, subSize - 1);

      ctx.fillStyle = parsedColor;
      if (isBlockHovered || isFilteredMatch) {
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 16; // brighter glow
        // subtle inset border effect
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
      } else {
        ctx.shadowBlur = 2; // subtle ambient glow
        ctx.shadowColor = baseColor;
      }
      ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    }"""

if target_element_glow in js:
    js = js.replace(target_element_glow, new_element_glow)
else:
    print("Could not find element glow target.")


# 4. Restore Minimalistic Tooltip 
target_tooltip_start = "hoverTooltip.innerHTML = `"
target_tooltip_end = "  `;"

idx1 = js.find(target_tooltip_start)
idx2 = js.find(target_tooltip_end, idx1) + len(target_tooltip_end)

if idx1 != -1 and idx2 != -1:
    new_tooltip = """hoverTooltip.innerHTML = `
    <div class="tooltip-header" style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
      <span class="block-num" style="font-size: 11px; letter-spacing: 0.1em;">Block #${block.block_number}</span>
      <span class="mood-badge" style="font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight:600; background:rgba(0,0,0,0.1);">${block.contract_ratio > 0.6 ? 'Trading Dominant' : 'Payments Dominant'}</span>
    </div>
    <div class="tooltip-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <span class="label" style="font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase;">Total Actions</span>
      <span class="value" style="font-size: 12px; font-weight: 600;">${block.tx_count}</span>
    </div>
    <div class="tooltip-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <span class="label" style="font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase;">Amount Moved</span>
      <span class="value" style="font-size: 12px; font-weight: 600;">$${totalBlockUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
    </div>
    <div class="tooltip-row" style="display: flex; justify-content: space-between;">
      <span class="label" style="font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase;">Network Cost</span>
      <span class="value" style="font-size: 12px; font-weight: 600; color: ${block.base_fee_gwei > 50 ? '#ff4444' : '#00ff88'}">${block.base_fee_gwei.toFixed(1)} Gwei</span>
    </div>
  `;"""
    js = js[:idx1] + new_tooltip + js[idx2:]
else:
    print("Could not find tooltip target.")

with open('mosaic.js', 'w') as f:
    f.write(js)
