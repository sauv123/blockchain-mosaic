import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add Slide-up Animation and Whale logic to 2D Canvas `drawTile`
target_draw = """      const jitter = bm.offsetJitter * subSize;
      const cx = x + cell.col * subSize + subSize / 2 + (hashSeed - 0.5) * jitter;
      const cy = y + cell.row * subSize + subSize / 2 + (hashSeed * 0.7 - 0.35) * jitter;
      const radius = Math.max(1, subSize * (bm.radiusScale + (hashSeed - 0.5) * bm.radiusVariance));"""

replacement_draw = """      const jitter = bm.offsetJitter * subSize;
      const cx = x + cell.col * subSize + subSize / 2 + (hashSeed - 0.5) * jitter;
      let cy = y + cell.row * subSize + subSize / 2 + (hashSeed * 0.7 - 0.35) * jitter;
      let radius = Math.max(1, subSize * (bm.radiusScale + (hashSeed - 0.5) * bm.radiusVariance));
      
      let isWhaleSpawn = false;
      
      // LIVE SPAWN: SLIDE UP FROM BELOW + WHALE FLASH
      if (block._liveMintedTime) {
          const age = Date.now() - block._liveMintedTime;
          if (age < 1500) {
              const t = age / 1500;
              // Elastic slide up from below
              const slideUp = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
              cy += (1 - slideUp) * 200; // Slide up from 200px below
              radius *= (slideUp * 1.5); // Pop size
              
              if (block.whale_flag === 1 && age < 800) {
                  isWhaleSpawn = true;
                  // Draw massive whale shockwave
                  ctx.strokeStyle = `rgba(255, 255, 255, ${1 - age/800})`;
                  ctx.lineWidth = 4;
                  ctx.beginPath();
                  ctx.arc(cx, cy, radius + (age/800)*100, 0, Math.PI*2);
                  ctx.stroke();
              }
          }
      }"""

js = js.replace(target_draw, replacement_draw)

# 2. Add VR Lighting logic for Whale Transactions
# In audio.playBlockTones (or wherever new block arrives), we can trigger a whale flash!
# We can do it in the websocket onmessage or where blocks.push happens.
target_ws = "              blocks.push(newBlock);"
replacement_ws = """              blocks.push(newBlock);
              if (newBlock.whale_flag === 1 && typeof xrScene !== 'undefined') {
                  // MASSIVE WHALE FLASH IN VR
                  gsap.to(xrScene.background, { r: 1.0, g: 1.0, b: 1.0, duration: 0.1, yoyo: true, repeat: 1 });
                  if (navigator.vibrate) navigator.vibrate([100, 50, 200]); // browser vibe
              }"""
js = js.replace(target_ws, replacement_ws)

# 3. FIX Holographic Billboard text (read correct IDs)
target_bb = """     const payEl = document.getElementById('stat-payments');
     const volEl = document.getElementById('stat-volume');
     const modeEl = document.querySelector('.brand h1');
     
     const payments = payEl ? payEl.innerText : '0';
     const volume = volEl ? volEl.innerText : '$0.00';
     const mode = modeEl ? modeEl.innerText : 'BLOCKCHAIN MOSAIC';
     
     bbCtx.clearRect(0, 0, 1024, 512);"""

replacement_bb = """     const blockEl = document.getElementById('latest-block-val');
     const feeEl = document.getElementById('avg-fee-val');
     const trendEl = document.getElementById('trend-dominant-val');
     const modeEl = document.querySelector('.brand h1');
     
     const blockVal = blockEl ? blockEl.innerText : '0000000';
     const feeVal = feeEl ? feeEl.innerText : '0 Gwei';
     const trendVal = trendEl ? trendEl.innerText : 'Analyzing...';
     const mode = modeEl ? modeEl.innerText : 'BLOCKCHAIN MOSAIC';
     
     bbCtx.clearRect(0, 0, 1024, 512);"""

js = js.replace(target_bb, replacement_bb)

target_bb_draw = """     bbCtx.fillStyle = '#00ff88';
     bbCtx.font = 'bold 80px monospace';
     bbCtx.fillText("TRANSACTIONS: " + payments, 512, 350);
     
     bbCtx.fillStyle = '#00aaff';
     bbCtx.font = 'bold 70px monospace';
     bbCtx.fillText("VOLUME: " + volume, 512, 450);"""

replacement_bb_draw = """     bbCtx.fillStyle = '#00ff88';
     bbCtx.font = 'bold 70px monospace';
     bbCtx.fillText("BLOCK: " + blockVal + " | FEE: " + feeVal, 512, 350);
     
     bbCtx.fillStyle = '#00aaff';
     bbCtx.font = 'bold 60px monospace';
     bbCtx.fillText("TREND: " + trendVal, 512, 450);"""

js = js.replace(target_bb_draw, replacement_bb_draw)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added 2D Slide-up, Whale FX, and fixed Billboard stats!")
