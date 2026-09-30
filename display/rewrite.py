import sys

with open('app.js', 'r') as f:
    js = f.read()

# 1. Simulator Fix
js = js.replace("if (currentMode !== 'LIVE' || currentChain === 'ethereum') return;", "if (currentMode !== 'LIVE') return;")
fallback_old = """    if (currentIndex >= candidateUrls.length) {
      setTimeout(connectRelay, 5000);
      return;
    }"""
fallback_new = """    if (currentIndex >= candidateUrls.length) {
      if (currentMode === 'LIVE') {
        if (!window.simIntervalId) {
          window.simIntervalId = setInterval(generateSimulatedBlock, 12000);
          const capacity = cols * rows;
          for (let i = 0; i < capacity; i++) {
            blocks.push({
              block_number: 42000000 + i,
              timestamp: Math.floor(Date.now() / 1000) - ((capacity - i) * 12),
              hash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
              tx_count: 20 + Math.floor(Math.random() * 150),
              base_fee_gwei: 10 + Math.random() * 80,
              contract_ratio: Math.random(),
              whale_flag: Math.random() < 0.05 ? 1 : 0
            });
          }
          generateSimulatedBlock(); 
        }
      }
      setTimeout(connectRelay, 15000);
      return;
    }"""
js = js.replace(fallback_old, fallback_new)

# 2. Element Glow in drawTile
glow_old = "ctx.fillStyle = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');\n    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);"
glow_new = """    let isDimmed = false;
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
      ctx.fillStyle = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');
      if (isBlockHovered || isFilteredMatch) {
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }
    }
    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    ctx.shadowBlur = 0;"""
js = js.replace(glow_old, glow_new)

# 3. Plain English Hover Tooltip
tt_start = js.find("hoverTooltip.innerHTML = `")
tt_end = js.find("`;", tt_start) + 2
tooltip_old = js[tt_start:tt_end]
tooltip_new = """hoverTooltip.innerHTML = `
    <div style="font-family: 'Outfit', sans-serif; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.9); padding: 4px;">
      This block was mostly filled with <strong>${block.contract_ratio > 0.6 ? 'Trading Coins' : 'Direct Payments'}</strong>. 
      <br><br>
      Network traffic was <strong>${block.base_fee_gwei > 50 ? 'Congested and Expensive' : 'Quiet and Cheap'}</strong>, costing people around <strong>${block.base_fee_gwei.toFixed(0)} Gwei</strong>.
      <br><br>
      <span style="color: #00ff88;">${block.tx_count} Total Actions</span> • <span style="color: rgba(255,255,255,0.5);">$${totalBlockUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} Moved</span>
    </div>
  `;"""
js = js.replace(tooltip_old, tooltip_new)

# 4. Interactive Ledger Logic (Append to bottom)
ledger_logic = """
let clickedLegendFilter = null;
let filterCountTooltip = document.getElementById('filter-count-tooltip');
if (!filterCountTooltip) {
  filterCountTooltip = document.createElement('div');
  filterCountTooltip.id = 'filter-count-tooltip';
  filterCountTooltip.style.position = 'absolute';
  filterCountTooltip.style.bottom = '50px';
  filterCountTooltip.style.left = '32px';
  filterCountTooltip.style.fontFamily = "'Space Mono', monospace";
  filterCountTooltip.style.fontSize = '12px';
  filterCountTooltip.style.color = '#fff';
  filterCountTooltip.style.background = 'rgba(8,9,12,0.95)';
  filterCountTooltip.style.padding = '12px 18px';
  filterCountTooltip.style.borderRadius = '8px';
  filterCountTooltip.style.border = '1px solid rgba(255,255,255,0.15)';
  filterCountTooltip.style.pointerEvents = 'none';
  filterCountTooltip.style.opacity = '0';
  document.body.appendChild(filterCountTooltip);
}

const legendEl = document.getElementById('legend-container');
if (legendEl) {
  legendEl.addEventListener('click', (e) => {
    const item = e.target.closest('.legend-item');
    if (!item) return;
    const text = item.textContent.trim();
    
    let typeKey = null;
    if (text.includes('Plain Transfer')) typeKey = 'Plain Transfer';
    else if (text.includes('Token Swap')) typeKey = 'Token Swap';
    else if (text.includes('NFT Mint')) typeKey = 'NFT Mint';
    if (!typeKey) return;

    if (clickedLegendFilter === typeKey) {
      clickedLegendFilter = null;
      document.querySelectorAll('.legend-item').forEach(el => el.style.opacity = '1');
      if (typeof gsap !== 'undefined') gsap.to(filterCountTooltip, { opacity: 0, y: 10, duration: 0.3 });
    } else {
      clickedLegendFilter = typeKey;
      document.querySelectorAll('.legend-item').forEach(el => el.style.opacity = '0.3');
      item.style.opacity = '1';
      
      let count = 0;
      blocks.slice(-maxTiles).forEach(b => {
        getBlockTransactions(b).forEach(t => {
          if (t.type === typeKey) count++;
        });
      });
      
      filterCountTooltip.innerHTML = `<div style="font-size: 16px; font-weight: bold; color: ${PALETTES.classic[typeKey]};">${count.toLocaleString()} ${typeKey}s</div>`;
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(filterCountTooltip);
        gsap.fromTo(filterCountTooltip, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      }
    }
  });
}
"""
js += "\n" + ledger_logic

# 5. Remove Block Hover Box
hover_border = """  if (hoveredBlock) {
    const idx = blocks.indexOf(hoveredBlock);
    if (idx !== -1) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(col * tileSize, row * tileSize, tileSize - gutter, tileSize - gutter);
    }
  }"""
js = js.replace(hover_border, "")

with open('app.js', 'w') as f:
    f.write(js)
