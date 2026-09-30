import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# 1. Update Stats to use ALL-TIME tracking, not just maxTiles
stats_hook = """let totalTx = 0;
    let totalUsd = 0;
    let directCount = 0;
    
    blocks.forEach(b => {
      totalTx += b.tx_count;
      const txs = getBlockTransactions(b);
      txs.forEach(t => {
        totalUsd += t.valueUsd;
        if (t.type === 'Plain Transfer') directCount++;
      });
    });"""

# Replace it to use a global counter
new_stats = """// Use global session counters so it feels truly "live" and ever-growing
    if (typeof window.sessionTotalTx === 'undefined') {
      window.sessionTotalTx = 0;
      window.sessionTotalUsd = 0;
      window.sessionDirectCount = 0;
    }
    
    // Only add the NEWEST block to the counter
    const newestBlock = blocks[blocks.length - 1];
    if (newestBlock && !newestBlock._counted) {
      window.sessionTotalTx += newestBlock.tx_count;
      const txs = getBlockTransactions(newestBlock);
      txs.forEach(t => {
        window.sessionTotalUsd += t.valueUsd || 0;
        if (t.type === 'Plain Transfer') window.sessionDirectCount++;
      });
      newestBlock._counted = true;
    }
    
    let totalTx = window.sessionTotalTx;
    let totalUsd = window.sessionTotalUsd;
    let directCount = window.sessionDirectCount;
    """
js = js.replace(stats_hook, new_stats)


# 2. Interactive hover & Whale shockwaves
# In the shockwave push logic:
shockwave_push = """shockwaves.push({ x: originX, y: originY, radius: 0, opacity: 1.0 });"""
shockwave_push_new = """const isWhale = getBlockTransactions(newBlock).some(t => (t.valueUsd || 0) > 20000);
        shockwaves.push({ x: originX, y: originY, radius: 0, opacity: 1.0, isWhale: isWhale });"""
js = js.replace(shockwave_push, shockwave_push_new)

# In the shockwave draw loop:
shockwave_draw = """ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${sw.opacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();"""
shockwave_draw_new = """ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      if (sw.isWhale) {
        ctx.strokeStyle = `rgba(255, 215, 0, ${sw.opacity})`; // Gold whale pulse
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
      } else {
        ctx.strokeStyle = `rgba(0, 255, 136, ${sw.opacity})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);"""
js = js.replace(shockwave_draw, shockwave_draw_new)

# 3. Canvas hover interaction (Scale up the block slightly if hoveredCol == col && hoveredRow == row)
hover_scale = """ctx.fillStyle = baseColor;
      ctx.fillRect(x + gap, y + gap, cellSize, cellSize);"""
hover_scale_new = """ctx.fillStyle = baseColor;
      if (hoveredCol === col && hoveredRow === row) {
        ctx.fillRect(x + gap - 2, y + gap - 2, cellSize + 4, cellSize + 4);
      } else {
        ctx.fillRect(x + gap, y + gap, cellSize, cellSize);
      }"""
js = js.replace(hover_scale, hover_scale_new)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("JS updated.")
