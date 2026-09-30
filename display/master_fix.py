import re

with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ============================================================
# 1. FIX ART_SYNTHESIS DRAW LOOP
# Use the EXACT same block-per-tile grid as LIVE mode.
# The only difference: we apply a heavy saturate+blur filter
# to make colors melt into a painting.
# ============================================================
art_draw_old = re.compile(
    r"if \(currentMode === 'ART_SYNTHESIS'\) \{.*?return; // Skip normal grid drawing\s*\}",
    re.DOTALL
)
art_draw_new = """if (currentMode === 'ART_SYNTHESIS') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Artistic melt: bleed each block so colors blend at borders
    ctx.filter = 'saturate(220%) blur(5px) contrast(140%)';
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * tileSize;
      const y = row * tileSize;
      const txs = getBlockTransactions(block);
      if (!txs || txs.length === 0) continue;
      // Dominant tx type color for this block
      const typeCount = {};
      txs.forEach(t => { typeCount[t.type] = (typeCount[t.type]||0)+1; });
      const dominantTx = Object.keys(typeCount).reduce((a,b)=>typeCount[a]>typeCount[b]?a:b);
      const color = PALETTES[currentPalette][dominantTx] || PALETTES[currentPalette]['default'];
      ctx.fillStyle = color;
      // Draw with generous overlap so blur fuses the borders
      ctx.fillRect(x - 4, y - 4, tileSize + 8, tileSize + 8);
    }
    ctx.restore();
    
    // Luxurious vignette frame
    ctx.save();
    const vig = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width * 0.3, canvas.width/2, canvas.height/2, canvas.width * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    requestAnimationFrame(draw);
    return; // Skip normal grid drawing
  }"""
js = art_draw_old.sub(art_draw_new, js)

# ============================================================
# 2. FIX triggerArtisticSynthesis — keep actual playback blocks
# ============================================================
synth_old = re.compile(
    r"function triggerArtisticSynthesis\(day, dayBlocks\) \{.*?document\.body\.appendChild\(artOverlay\);",
    re.DOTALL
)
synth_check = """function triggerArtisticSynthesis(day, dayBlocks) {"""
if synth_check in js:
    # Only patch the blocks assignment part
    blocks_assign_old = """  if (dayBlocks && dayBlocks.length > 0) {
    blocks = [...dayBlocks];
  } else {
    blocks = generateMockHistoryForDate(`2026-07-${day < 10 ? '0'+day:day}`).slice(0, 1000);
  }"""
    blocks_assign_new = """  // Use the blocks exactly as they were during playback — same data, same shape
  if (dayBlocks && dayBlocks.length > 0) {
    blocks = [...dayBlocks];
  } else {
    // Fallback: generate if no playback blocks provided
    blocks = generateMockHistoryForDate('2026-07-' + (day < 10 ? '0'+day : String(day))).slice(0, maxTiles);
  }"""
    js = js.replace(blocks_assign_old, blocks_assign_new)

# ============================================================
# 3. REMOVE the "Return to Live Grid" onclick=location.reload() 
# Replace with proper event-based return that restores LIVE mode
# ============================================================
reload_btn_old = """<button style="pointer-events: auto; padding: 12px 30px; background: #fff; color: #000; border: none; border-radius: 30px; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; cursor: pointer; letter-spacing: 0.1em; transition: transform 0.2s; box-shadow: 0 8px 24px rgba(0,0,0,0.4);" onclick="location.reload()">Return to Live Grid</button>"""
reload_btn_new = """<button id="art-return-btn" style="pointer-events: auto; padding: 12px 30px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 30px; font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 600; text-transform: uppercase; cursor: pointer; letter-spacing: 0.12em; backdrop-filter: blur(10px);">Return to Live Grid</button>"""
js = js.replace(reload_btn_old, reload_btn_new)

# ============================================================
# 4. Wire the return button (add after artOverlay is appended)
# ============================================================
after_append_old = """document.body.appendChild(artOverlay);"""
after_append_new = """document.body.appendChild(artOverlay);
    setTimeout(() => {
      const retBtn = document.getElementById('art-return-btn');
      if (retBtn) {
        retBtn.addEventListener('click', () => {
          artOverlay.style.display = 'none';
          if (typeof returnToLive === 'function') returnToLive();
          else if (document.getElementById('return-live-btn')) document.getElementById('return-live-btn').click();
        });
      }
    }, 100);"""
js = js.replace(after_append_old, after_append_new)

# ============================================================
# 5. Fix portrait button hook — pass the actual current blocks
# ============================================================
portrait_btn_hook_old = """const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.addEventListener('click', () => {
      triggerArtisticSynthesis(historicalDayNumber, playbackFullList);
    });
  }"""
portrait_btn_hook_new = """const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.addEventListener('click', () => {
      // Pass ALL the blocks loaded for this day (complete picture)
      const dayData = playbackFullList && playbackFullList.length > 0 ? playbackFullList : blocks;
      triggerArtisticSynthesis(historicalDayNumber, dayData);
    });
  }"""
js = js.replace(portrait_btn_hook_old, portrait_btn_hook_new)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("master_fix.py: done.")
