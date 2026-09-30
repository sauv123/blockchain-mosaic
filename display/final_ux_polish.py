import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# 1. Remove Frosted Glass Block Glow
old_block_glow = """      ctx.save();
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
      ctx.restore();"""

new_block_glow = """      ctx.save();
      // Crisp outer border only
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, size, size);
      ctx.restore();"""

js = js.replace(old_block_glow, new_block_glow)

# 2. Fix the interactive ledger matching and legend text
js = js.replace("> Transfers</span>", "> Direct Payments</span>")
js = js.replace("> DeFi Swaps</span>", "> Trading Coins</span>")
js = js.replace("> NFT Mints</span>", "> Digital Art</span>")

js = js.replace("if (text.includes('Plain Transfer')) typeKey = 'Plain Transfer';", "if (text.includes('Plain Transfer') || text.includes('Direct Payments')) typeKey = 'Plain Transfer';")
js = js.replace("else if (text.includes('Token Swap')) typeKey = 'Token Swap';", "else if (text.includes('Token Swap') || text.includes('Trading Coins')) typeKey = 'Token Swap';")
js = js.replace("else if (text.includes('NFT Mint')) typeKey = 'NFT Mint';", "else if (text.includes('NFT Mint') || text.includes('Digital Art')) typeKey = 'NFT Mint';")

# 3. Restore the tooltip table
idx1 = js.find("hoverTooltip.innerHTML = `")
idx2 = js.find("`;", idx1) + 2

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

with open('mosaic.js', 'w') as f:
    f.write(js)
