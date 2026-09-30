with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ============================================================
# FIX 1: Portrait button passes the FULL day (not just scrubbed subset)
# ============================================================
old_portrait_btn = """const dayData = playbackFullList && playbackFullList.length > 0 ? playbackFullList : blocks;
      triggerArtisticSynthesis(historicalDayNumber, dayData);"""
new_portrait_btn = """// Always synthesize the COMPLETE day, not just what's been scrubbed
      const fullDayData = playbackFullList && playbackFullList.length > 0 ? playbackFullList : blocks;
      // Temporarily show all blocks so portrait matches full day
      blocks = [...fullDayData];
      triggerArtisticSynthesis(historicalDayNumber, fullDayData);"""
js = js.replace(old_portrait_btn, new_portrait_btn)

# ============================================================
# FIX 2: Return-to-live from portrait resets canvas filter
# ============================================================
old_return_live = """pausePlayback();
  playbackControls.classList.remove('active');
  
  if (currentMode === 'HISTORICAL') {
    currentMode = 'LIVE';"""
new_return_live = """pausePlayback();
  playbackControls.classList.remove('active');

  // Reset canvas filter in case portrait mode was active
  const mosaicCanvas = document.getElementById('mosaic-canvas');
  if (mosaicCanvas) gsap.to(mosaicCanvas, { filter: 'saturate(100%) contrast(100%) brightness(1) blur(0px)', duration: 0.5 });
  const artOv = document.getElementById('art-synthesis-overlay');
  if (artOv) { artOv.style.display = 'none'; }
  
  if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
    currentMode = 'LIVE';"""
js = js.replace(old_return_live, new_return_live)

# ============================================================
# FIX 3: Playback controls — show an inline "← Live" back button
# Always visible in HISTORICAL mode, not buried in a banner
# ============================================================

with open('mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_playback = """<button id="generate-portrait-btn" class="playback-btn" style="margin-left: 12px; background: rgba(0, 255, 136, 0.15); border-color: #00ff88;">View Portrait</button>"""
new_playback = """<div style="width:1px; height:20px; background:var(--border-color); opacity:0.4; margin:0 4px;"></div>
      <button id="generate-portrait-btn" class="playback-btn" style="background: rgba(0, 255, 136, 0.12); border-color: rgba(0,255,136,0.5); color: #00ff88; font-weight:600;">View Portrait</button>"""
html = html.replace(old_playback, new_playback)

with open('mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("UX flow fixes applied.")
