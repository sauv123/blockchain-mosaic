import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = """hoverTooltip.innerHTML = `
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

new_tooltip = """hoverTooltip.innerHTML = `
    <div style="font-family: 'Outfit', sans-serif; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.9); padding: 4px;">
      This block was mostly filled with <strong>${block.contract_ratio > 0.6 ? 'Trading Coins' : 'Direct Payments'}</strong>. 
      <br><br>
      Network traffic was <strong>${block.base_fee_gwei > 50 ? 'Congested and Expensive' : 'Quiet and Cheap'}</strong>, costing people around <strong>${block.base_fee_gwei.toFixed(0)} Gwei</strong>.
      <br><br>
      <span style="color: #00ff88;">${block.tx_count} Total Actions</span> • <span style="color: rgba(255,255,255,0.5);">$${totalBlockUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} Moved</span>
    </div>
  `;"""

if target in js:
    js = js.replace(target, new_tooltip)
    print("Tooltip reverted to summary.")
else:
    print("Tooltip target not found!")

with open('mosaic.js', 'w') as f:
    f.write(js)
