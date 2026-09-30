import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Modify drawTile to skip animating blocks
target_draw_tile = "function drawTile(ctx, x, y, size, block, blockInterval, alpha, theme, isTracked, trackDirection, isOnTemplate) {"
repl_draw_tile = """function drawTile(ctx, x, y, size, block, blockInterval, alpha, theme, isTracked, trackDirection, isOnTemplate) {
  if (window.xrActiveBlocks && window.xrActiveBlocks.some(anim => anim.block === block)) return; // Hide on 2D canvas while 3D animation plays
"""
js = js.replace(target_draw_tile, repl_draw_tile)

# 2. Pass block reference into window.xrActiveBlocks.push
target_push = """                      window.xrActiveBlocks.push({
                          mesh: physicalBlock, """
repl_push = """                      window.xrActiveBlocks.push({
                          block: newBlock,
                          mesh: physicalBlock, """
js = js.replace(target_push, repl_push)

# 3. Change Tooltip Information Format
target_tooltip_html = """  hoverTooltip.innerHTML = `
    <div style="font-family: 'Outfit', sans-serif; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.9); padding: 4px;">
      This block was mostly filled with <strong>${block.contract_ratio > 0.6 ? 'Trading Coins' : 'Direct Payments'}</strong>. 
      <br><br>
      Network traffic was <strong>${block.base_fee_gwei > 50 ? 'Congested and Expensive' : 'Quiet and Cheap'}</strong>, costing people around <strong>${block.base_fee_gwei.toFixed(0)} Gwei</strong>.
      <br><br>
      Overall, <strong>$${(totalBlockUsd/1000).toFixed(0)}k</strong> moved in ${block.tx_count} pulses.
    </div>
  `;"""

repl_tooltip_html = """  hoverTooltip.innerHTML = `
    <div style="font-family: 'Space Mono', monospace; font-size: 16px; line-height: 1.5; color: #fff; padding: 10px;">
      <div style="color: #00ff88; font-size: 12px; margin-bottom: 8px;">BLOCK #${block.block_number || block.id || 'LIVE'}</div>
      <div>PAYMENTS: <strong>${block.tx_count || 50}</strong></div>
      <div>MOVED: <strong>$${((block.largest_tx_value_usd || 50000) * (block.tx_count || 50)).toLocaleString()}</strong></div>
    </div>
  `;"""
js = js.replace(target_tooltip_html, repl_tooltip_html)

# 4. Modify VR Billboard Information Format
target_billboard = """                  if (newBlock.whale_flag === 1) {
                      window.lastNotificationText = `🚨 WHALE DETECTED: $${Math.round(val).toLocaleString()} 🚨`;
                  } else {
                      window.lastNotificationText = `NEW BLOCK: ${txCount} TRANSACTIONS`;
                  }"""
                  
repl_billboard = """                  window.lastNotificationText = `Payments: ${txCount} | Amount: $${Math.round(val).toLocaleString()}`;"""
js = js.replace(target_billboard, repl_billboard)

target_billboard_draw = """      ctx.fillText(window.lastNotificationText || "WAITING FOR NETWORK", 128, 150);"""
repl_billboard_draw = """      ctx.fillText(window.lastNotificationText || "WAITING FOR NETWORK", 80, 150);"""
js = js.replace(target_billboard_draw, repl_billboard_draw)

# 5. Make Billboard Panel completely independent and right-side (x=6.0, z=0.0)
js = js.replace("window.xrBillboard.position.set(3.5, 1.6, -1.5); // Right side, closer", "window.xrBillboard.position.set(6.0, 1.6, 0.0); // Completely far right")
js = js.replace("window.xrBillboard.rotation.y = -Math.PI/4;", "window.xrBillboard.rotation.y = -Math.PI/2;") # Face directly left at the user

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied fixes for drawing bug, tooltip format, and billboard positioning.")
