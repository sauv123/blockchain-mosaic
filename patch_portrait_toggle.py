import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """  const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.addEventListener('click', () => {
      // Pass ALL the blocks loaded for this day (complete picture)
      // Always synthesize the COMPLETE day, not just what's been scrubbed
      const fullDayData = playbackFullList && playbackFullList.length > 0 ? playbackFullList : blocks;
      // Temporarily show all blocks so portrait matches full day
      blocks = [...fullDayData];
      triggerArtisticSynthesis(historicalDayNumber, fullDayData);
    });
  }"""

good = """  const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.addEventListener('click', () => {
      if (currentMode === 'ART_SYNTHESIS') {
        // Toggle BACK to Individual Payments
        currentMode = 'HISTORICAL';
        renderScale = 'MICRO';
        genPortraitBtn.textContent = 'View Portrait';
        genPortraitBtn.style.color = '#00ff88';
        genPortraitBtn.style.borderColor = 'rgba(0,255,136,0.4)';
        genPortraitBtn.style.background = 'rgba(0,255,136,0.12)';
        
        // Hide the overlay text
        const artOv = document.getElementById('art-synthesis-overlay');
        if (artOv) { artOv.style.display = 'none'; }
        
        // Restore slider scrub state blocks
        blocks = playbackFullList.slice(0, playbackIndex);
        updateStats();
        
      } else {
        // Toggle TO Solid Portrait
        const fullDayData = playbackFullList && playbackFullList.length > 0 ? playbackFullList : blocks;
        blocks = [...fullDayData]; // Ensure full canvas is available for mask
        
        genPortraitBtn.textContent = 'View Individual Payments';
        genPortraitBtn.style.color = '#ffffff';
        genPortraitBtn.style.borderColor = 'rgba(255,255,255,0.4)';
        genPortraitBtn.style.background = 'rgba(255,255,255,0.1)';
        
        triggerArtisticSynthesis(historicalDayNumber, fullDayData);
      }
    });
  }"""

js = js.replace(bad, good)
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Toggle patched")
