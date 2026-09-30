const fs = require('fs');

// 1. Fix mosaic.html
let html = fs.readFileSync('mosaic.html', 'utf8');

// Replace the massive stats with cinematic weather line
const oldStats = `<div id="massive-dashboard-stats" class="massive-stats-overlay">
      <div class="massive-stat-group"><div class="massive-val" id="massive-tx">0</div><div class="massive-label">LIVE TRANSACTIONS</div></div>
      <div class="massive-stat-group"><div class="massive-val" id="massive-vol">$0</div><div class="massive-label">VOLUME TRANSFERRED</div></div>
      <div class="massive-stat-group"><div class="massive-val" id="massive-direct">0</div><div class="massive-label">DIRECT PAYMENTS</div></div>
    </div>`;
const newStats = `<div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.05em; max-width: 600px; line-height: 1.6; text-shadow: 0 4px 20px rgba(0,0,0,0.8); pointer-events: none;">
  <!-- JS will inject the poetic summary here -->
</div>`;
html = html.replace(oldStats, newStats);

// Replace clunky audio button with elegant icon
const oldAudioBtn = `<button id="audio-toggle-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        Enable Audio
      </button>`;
const newAudioBtn = `<button id="audio-toggle-btn" title="Toggle Sonification" style="background: transparent; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 8px; margin-right: 8px; transition: color 0.2s;">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
</button>`;
html = html.replace(oldAudioBtn, newAudioBtn);

fs.writeFileSync('mosaic.html', html);

// 2. Fix mosaic.js updateStats
let js = fs.readFileSync('mosaic.js', 'utf8');

const jsOldStats = `
  const massiveTx = document.getElementById('massive-tx');
  const massiveVol = document.getElementById('massive-vol');
  const massiveDirect = document.getElementById('massive-direct');
  if (massiveTx) massiveTx.textContent = txCount.toLocaleString();
  if (massiveVol) massiveVol.textContent = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
  if (massiveDirect) massiveDirect.textContent = directCount.toLocaleString();
`;

const jsNewStats = `
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    let weatherCondition = "calm and quiet";
    if (totalUsd > 5000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (txCount > 500) weatherCondition = "highly congested and expensive";
    else if (directCount > txCount * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    weatherLine.innerHTML = \`Today, <strong>\${directCount.toLocaleString()}</strong> human payments moved <strong>\${volStr}</strong>.<br>The network weather is \${weatherCondition}.\`;
  }
`;
js = js.replace(jsOldStats, jsNewStats);

// 3. Fix audio button JS hook to use the new icon toggle
const jsOldAudioHook = `audioBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Audio Live';
      audioBtn.style.color = '#00ff88';
      audioBtn.style.borderColor = 'rgba(0,255,136,0.3)';
      audioBtn.style.background = 'rgba(0,255,136,0.05)';`;

const jsNewAudioHook = `
      if (!audio.enabled) {
        audio.init();
        audio.enabled = true;
        audioBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
        audioBtn.style.color = '#00ff88';
      } else {
        audio.ctx.suspend();
        audio.enabled = false;
        audioBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
        audioBtn.style.color = 'rgba(255,255,255,0.5)';
      }
`;
js = js.replace(jsOldAudioHook, jsNewAudioHook);

fs.writeFileSync('mosaic.js', js);
console.log("UI Fixed");
