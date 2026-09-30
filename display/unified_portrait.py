import re

with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ============================================================
# CORE INSIGHT: Remove ART_SYNTHESIS mode entirely.
# "View Portrait" = apply CSS filter to canvas. Same data. No disconnect.
# ============================================================

# 1. Remove the ART_SYNTHESIS draw branch completely
art_draw_pattern = re.compile(
    r"  if \(currentMode === 'ART_SYNTHESIS'\) \{.*?return; // Skip normal grid drawing\s*\}",
    re.DOTALL
)
js = art_draw_pattern.sub("  // ART_SYNTHESIS: canvas filter applied via CSS — no separate draw path needed", js)

# 2. Replace triggerArtisticSynthesis with a clean CSS-filter approach
synth_pattern = re.compile(
    r"function triggerArtisticSynthesis\(day, dayBlocks\) \{.*?\}\s*\n\n",
    re.DOTALL
)
new_synth = '''function triggerArtisticSynthesis(day, dayBlocks) {
  // Ensure we have the full day's blocks loaded
  if (dayBlocks && dayBlocks.length > 0) {
    blocks = [...dayBlocks];
  }

  // Count transaction types to understand the day's mood
  const counts = {};
  blocks.forEach(b => {
    getBlockTransactions(b).forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
  });
  const totalTxs = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
  const dominantType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Plain Transfer');

  // Build a rich, data-driven story
  const directPct = Math.round(((counts['Plain Transfer'] || 0) / totalTxs) * 100);
  const swapPct   = Math.round(((counts['Token Swap']    || 0) / totalTxs) * 100);
  const nftPct    = Math.round(((counts['NFT Mint']      || 0) / totalTxs) * 100);

  let storyText = "";
  if (dominantType === 'Token Swap') {
    storyText = `${swapPct}% of the day was pure trading — coins swapping hands in milliseconds. The warm oranges and pinks you see are market volatility, made visible.`;
  } else if (dominantType === 'Plain Transfer') {
    storyText = `A human day. ${directPct}% of all activity was simple payments — people sending money to one another. The cool blues washing across the canvas are the everyday economy.`;
  } else if (dominantType === 'NFT Mint') {
    storyText = `A creative surge — ${nftPct}% of the network was dedicated to minting digital art. The electric greens are creators; the golds are collectors.`;
  } else {
    storyText = `A balanced day: ${directPct}% payments, ${swapPct}% trading, ${nftPct}% digital art. The mosaic holds them all in equal tension.`;
  }

  const dateLabel = `PORTRAIT OF ${day < 10 ? 'JULY 0'+day : 'JULY '+day}, 2026`;

  // ── CSS-filter approach: the portrait IS the grid, just melted ──
  const canvas = document.getElementById('mosaic-canvas');
  currentMode = 'ART_SYNTHESIS'; // flag to prevent new blocks overwriting
  
  // Pause playback bar
  pausePlayback();
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) gsap.to(weatherLine, { opacity: 0, duration: 0.4 });
  const playbackControls = document.getElementById('playback-controls');
  if (playbackControls) gsap.to(playbackControls, { opacity: 0, y: 20, duration: 0.4 });

  // Apply artistic filter to canvas with GSAP
  gsap.to(canvas, {
    filter: 'saturate(240%) contrast(145%) brightness(1.05)',
    duration: 1.8,
    ease: 'power2.inOut',
    onComplete: () => {
      // Add blur as a second pass for the melt effect
      gsap.to(canvas, { filter: 'saturate(240%) contrast(145%) brightness(1.05) blur(4px)', duration: 0.8, ease: 'power2.out' });
    }
  });

  // Show or update overlay
  let artOverlay = document.getElementById('art-synthesis-overlay');
  if (!artOverlay) {
    artOverlay = document.createElement('div');
    artOverlay.id = 'art-synthesis-overlay';
    Object.assign(artOverlay.style, {
      position: 'absolute', inset: '0', zIndex: '8000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      paddingBottom: '140px', pointerEvents: 'none', opacity: '0'
    });
    document.querySelector('.canvas-container').appendChild(artOverlay);
  }

  artOverlay.innerHTML = `
    <div style="text-align:center; max-width: 680px; padding: 0 24px;">
      <div style="font-family:'Space Mono',monospace; font-size:10px; letter-spacing:0.35em; text-transform:uppercase; color:rgba(255,255,255,0.5); margin-bottom:10px;">Final Portrait</div>
      <div id="art-portrait-title" style="font-family:'Outfit',sans-serif; font-size:clamp(22px,3vw,38px); font-weight:300; color:#fff; letter-spacing:0.05em; margin-bottom:14px; text-shadow:0 4px 24px rgba(0,0,0,0.6);">${dateLabel}</div>
      <div id="art-portrait-story" style="font-family:'Outfit',sans-serif; font-size:15px; font-weight:300; color:rgba(255,255,255,0.75); line-height:1.65; text-shadow:0 2px 12px rgba(0,0,0,0.8); margin-bottom:28px;">${storyText}</div>
      <button id="art-exit-portrait-btn" style="pointer-events:auto; padding:11px 28px; background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.22); border-radius:24px; font-family:'Space Mono',monospace; font-size:10px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; backdrop-filter:blur(12px); transition: background 0.2s, border-color 0.2s;">Exit Portrait</button>
    </div>
  `;
  artOverlay.style.display = 'flex';
  gsap.fromTo(artOverlay, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.6, ease: 'power3.out' });

  // Wire the exit button
  setTimeout(() => {
    const exitBtn = document.getElementById('art-exit-portrait-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', exitPortrait);
      exitBtn.addEventListener('mouseenter', () => gsap.to(exitBtn, { background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.45)', duration: 0.2 }));
      exitBtn.addEventListener('mouseleave', () => gsap.to(exitBtn, { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.22)', duration: 0.2 }));
    }
  }, 100);
}

function exitPortrait() {
  const canvas = document.getElementById('mosaic-canvas');
  const artOverlay = document.getElementById('art-synthesis-overlay');
  const playbackControls = document.getElementById('playback-controls');
  const weatherLine = document.getElementById('cinematic-weather-line');

  // Reverse the melt
  gsap.to(canvas, { filter: 'saturate(100%) contrast(100%) brightness(1) blur(0px)', duration: 0.9, ease: 'power2.out' });
  if (artOverlay) gsap.to(artOverlay, { opacity: 0, y: 16, duration: 0.4, onComplete: () => { artOverlay.style.display = 'none'; } });
  if (playbackControls) gsap.to(playbackControls, { opacity: 1, y: 0, duration: 0.5, delay: 0.2 });
  if (weatherLine) gsap.to(weatherLine, { opacity: 1, duration: 0.5, delay: 0.3 });

  // Restore mode
  currentMode = 'HISTORICAL';
}

'''
js = synth_pattern.sub(new_synth, js)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("unified_portrait.py: done.")
