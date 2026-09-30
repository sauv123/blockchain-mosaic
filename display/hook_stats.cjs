const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const target = "function updateStats() {";
const replacement = `function updateStats() {
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
    if (totalUsd > 1000000000) {
      giantUsdEl.textContent = '$' + (totalUsd / 1000000000).toFixed(1) + 'B';
    } else if (totalUsd > 1000000) {
      giantUsdEl.textContent = '$' + (totalUsd / 1000000).toFixed(1) + 'M';
    } else {
      giantUsdEl.textContent = '$' + totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    giantPaymentsEl.textContent = totalPayments.toLocaleString();
  }
`;

js = js.replace(target, replacement);
fs.writeFileSync('mosaic.js', js);
console.log("Hooked safely");
