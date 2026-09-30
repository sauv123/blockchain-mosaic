const fs = require('fs');

// 1. UPDATE STYLE.CSS
let css = fs.readFileSync('style.css', 'utf8');

const massiveStatsCSS = `
/* MASSIVE DASHBOARD STATS */
.massive-stats-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1; /* Below the canvas interactions but visible */
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  width: 100%;
  opacity: 0.15; /* Subtle background presence */
  mix-blend-mode: overlay;
  transition: opacity 0.5s ease;
}

.canvas-container:hover .massive-stats-overlay {
  opacity: 0.05; /* Fade out slightly when inspecting */
}

.giant-stat-group {
  text-align: center;
}

.giant-val {
  font-family: 'Space Mono', monospace;
  font-size: clamp(3rem, 7vw, 7rem);
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -0.05em;
  display: block;
}

.giant-label {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1rem, 1.5vw, 1.5rem);
  color: #ffffff;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  margin-top: 10px;
  display: block;
  font-weight: 300;
}

/* Ensure legend is completely visible */
.app-footer {
  z-index: 9999 !important;
  position: relative !important;
}
.legend {
  z-index: 9999 !important;
}
`;

css += '\n' + massiveStatsCSS;
fs.writeFileSync('style.css', css);

// 2. UPDATE MOSAIC.HTML
let html = fs.readFileSync('mosaic.html', 'utf8');
const overlayHTML = `
  <!-- Massive Minimalistic Dashboard Stats -->
  <div id="massive-dashboard-stats" class="massive-stats-overlay">
    <div class="giant-stat-group">
      <span class="giant-val" id="giant-tx-count">0</span>
      <span class="giant-label">Live Transactions</span>
    </div>
    <div class="giant-stat-group">
      <span class="giant-val" id="giant-usd-amount">$0</span>
      <span class="giant-label">Volume Transferred</span>
    </div>
    <div class="giant-stat-group">
      <span class="giant-val" id="giant-payments-count">0</span>
      <span class="giant-label">Direct Payments</span>
    </div>
  </div>
`;

// Insert it inside main canvas-container
html = html.replace('<canvas id="mosaic-canvas"></canvas>', '<canvas id="mosaic-canvas"></canvas>\n' + overlayHTML);
fs.writeFileSync('mosaic.html', html);

// 3. UPDATE MOSAIC.JS to update those numbers dynamically
let js = fs.readFileSync('mosaic.js', 'utf8');

const updateStatsTarget = "updateStats();";
const updateStatsNew = `
updateStats();

// Update massive background stats
const giantTxEl = document.getElementById('giant-tx-count');
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
  
  if (totalUsd > 1000000) {
    giantUsdEl.textContent = '$' + (totalUsd / 1000000).toFixed(1) + 'M';
  } else {
    giantUsdEl.textContent = '$' + totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  
  giantPaymentsEl.textContent = totalPayments.toLocaleString();
}
`;

js = js.replace(/updateStats\(\);/g, updateStatsNew);

fs.writeFileSync('mosaic.js', js);
console.log("Dashboard fix injected!");
