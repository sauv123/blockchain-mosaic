import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = """      let count = 0;
      blocks.slice(-maxTiles).forEach(b => {
        getBlockTransactions(b).forEach(t => {
          if (t.type === typeKey) count++;
        });
      });
      
      filterCountTooltip.innerHTML = `<div style="font-size: 16px; font-weight: bold; color: ${PALETTES.classic[typeKey]};">${count.toLocaleString()} ${typeKey}s</div>`;"""

replacement = """      let count = 0;
      let totalUsd = 0;
      let explanation = "";
      let titleName = "";
      
      if (typeKey === 'Plain Transfer') {
        titleName = "Direct Payments";
        explanation = "Simple wallet-to-wallet transfers. These represent the everyday economy of people sending money to one another.";
      } else if (typeKey === 'Token Swap') {
        titleName = "Trading Coins";
        explanation = "People actively swapping different cryptocurrencies on decentralized exchanges. High activity here usually means the market is volatile.";
      } else if (typeKey === 'NFT Mint') {
        titleName = "Digital Art & NFTs";
        explanation = "The creation and trading of unique digital assets, collectibles, and artwork permanently recorded on the network.";
      }

      blocks.slice(-maxTiles).forEach(b => {
        getBlockTransactions(b).forEach(t => {
          if (t.type === typeKey) {
            count++;
            totalUsd += t.valueUsd || 0;
          }
        });
      });
      
      const usdString = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 });

      filterCountTooltip.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; font-size: 13px; max-width: 260px; text-align: left; line-height: 1.5; padding: 4px;">
          <div style="font-size: 13px; font-weight: bold; color: ${PALETTES.classic[typeKey]}; margin-bottom: 8px; font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${PALETTES.classic[typeKey]}; box-shadow: 0 0 8px ${PALETTES.classic[typeKey]};"></span>
            ${titleName}
          </div>
          <div style="color: rgba(255,255,255,0.85); margin-bottom: 12px; font-weight: 300;">
            ${explanation}
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; font-family: 'Space Mono', monospace; font-size: 11px;">
            <span style="color: #00ff88;">${count.toLocaleString()} LIVE ACTIONS</span>
            <span style="color: rgba(255,255,255,0.5);">${usdString} MOVED</span>
          </div>
        </div>
      `;"""

if target in js:
    js = js.replace(target, replacement)
    print("Ledger upgraded successfully.")
else:
    print("Target not found. Let's debug.")

with open('mosaic.js', 'w') as f:
    f.write(js)
