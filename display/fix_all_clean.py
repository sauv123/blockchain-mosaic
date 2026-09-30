import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# 1. Undo hijack
old_hijack = """async function loadHistoricalPortrait(dateStr, dayNum) {
  // HIJACKED FOR ART SYNTHESIS
  triggerArtisticSynthesis(dayNum);
  return;"""
new_hijack = """async function loadHistoricalPortrait(dateStr, dayNum) {
  lastInteractionTime = Date.now();
  archiveDrawer.classList.remove('open');
  pausePlayback();"""
js = js.replace(old_hijack, new_hijack)

# 2. Hook up button
old_btn = "const playbackPlayBtn = document.getElementById('playback-play-btn');"
new_btn = """const playbackPlayBtn = document.getElementById('playback-play-btn');
  const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.addEventListener('click', () => {
      triggerArtisticSynthesis(historicalDayNumber, playbackFullList);
    });
  }"""
js = js.replace(old_btn, new_btn)

# 3. Fix updateStats
old_stats = """const giantTxEl = document.getElementById('giant-tx-count');
  const giantUsdEl = document.getElementById('giant-usd-amount');
  const giantPaymentsEl = document.getElementById('giant-payments-count');

  if (giantTxEl && giantUsdEl && giantPaymentsEl) {
    let totalTx = 0;
    let totalUsd = 0;
    let totalPayments = 0;
    
    blocks.forEach(b => {
      totalTx += b.tx_count;
      const txs = getBlockTransactions(b);
      txs.forEach(t => {
        totalUsd += t.valueUsd;
        if (t.type === 'Plain Transfer') totalPayments++;
      });
    });
    
    giantTxEl.textContent = totalTx.toLocaleString();
    if (totalUsd > 1000000000) {
      giantUsdEl.textContent = '$' + (totalUsd / 1000000000).toFixed(2) + 'B';
    } else if (totalUsd > 1000000) {
      giantUsdEl.textContent = '$' + (totalUsd / 1000000).toFixed(2) + 'M';
    } else {
      giantUsdEl.textContent = '$' + totalUsd.toLocaleString();
    }
    giantPaymentsEl.textContent = totalPayments.toLocaleString();
  }"""

new_stats = """const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    let totalTx = 0;
    let totalUsd = 0;
    let directCount = 0;
    
    blocks.forEach(b => {
      totalTx += b.tx_count;
      const txs = getBlockTransactions(b);
      txs.forEach(t => {
        totalUsd += t.valueUsd;
        if (t.type === 'Plain Transfer') directCount++;
      });
    });

    let weatherCondition = "calm and quiet";
    if (totalUsd > 5000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (totalTx > 500) weatherCondition = "highly congested and expensive";
    else if (directCount > totalTx * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    weatherLine.innerHTML = `<span style="color: #000; text-shadow: none; font-weight: 500; font-size: 24px; padding: 20px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: inline-block;">Today, <strong>${directCount.toLocaleString()}</strong> human payments moved <strong>${volStr}</strong>.<br>The network weather is ${weatherCondition}.</span>`;
  }"""
js = js.replace(old_stats, new_stats)

# 4. Fix audio trigger button in initUI
old_audio = """audioBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Audio Live';
      audioBtn.style.color = '#00ff88';
      audioBtn.style.borderColor = 'rgba(0,255,136,0.3)';
      audioBtn.style.background = 'rgba(0,255,136,0.05)';
    } else {
      audio.ctx.suspend();
      audio.enabled = false;
      audioBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Enable Audio';
      audioBtn.style.color = 'rgba(255,255,255,0.7)';
      audioBtn.style.borderColor = 'rgba(255,255,255,0.18)';
      audioBtn.style.background = 'transparent';"""

new_audio = """audioBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
      audioBtn.style.color = '#00ff88';
    } else {
      audio.ctx.suspend();
      audio.enabled = false;
      audioBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
      audioBtn.style.color = 'rgba(255,255,255,0.5)';"""
js = js.replace(old_audio, new_audio)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("Clean fixes applied")
