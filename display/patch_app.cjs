const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// 1. Fix Simulator for Ethereum & Prefill
const genSimTarget = "if (currentMode !== 'LIVE' || currentChain === 'ethereum') return;";
const genSimReplace = "if (currentMode !== 'LIVE') return;";
js = js.replace(genSimTarget, genSimReplace);

const attemptNextTarget = `
    if (currentIndex >= candidateUrls.length) {
      setTimeout(connectRelay, 5000);
      return;
    }
`;
const attemptNextReplace = `
    if (currentIndex >= candidateUrls.length) {
      console.warn("WebSocket failed to connect. Falling back to simulated blocks.");
      if (currentMode === 'LIVE') {
        if (!window.simIntervalId) {
          window.simIntervalId = setInterval(generateSimulatedBlock, 12000); // 12 seconds for Ethereum
          
          // Prefill the grid perfectly
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
    }
`;
js = js.replace(attemptNextTarget, attemptNextReplace);

fs.writeFileSync('app.js', js);
console.log("Patched fallback");
