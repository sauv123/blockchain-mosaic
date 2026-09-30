import re

with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace updateStats logic
old_update_stats = """function updateStats() {
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    // Use global session counters so it feels truly "live" and ever-growing
    if (typeof window.sessionTotalTx === 'undefined') {
      window.sessionTotalTx = 0;
      window.sessionTotalUsd = 0;
      window.sessionDirectCount = 0;
    }
    
    // Only add the NEWEST block to the counter
    const newestBlock = blocks[blocks.length - 1];
    if (newestBlock && !newestBlock._counted) {
      window.sessionTotalTx += newestBlock.tx_count;
      const txs = getBlockTransactions(newestBlock);
      txs.forEach(t => {
        window.sessionTotalUsd += t.valueUsd || 0;
        if (t.type === 'Plain Transfer') window.sessionDirectCount++;
      });
      newestBlock._counted = true;
    }
    
    let totalTx = window.sessionTotalTx;
    let totalUsd = window.sessionTotalUsd;
    let directCount = window.sessionDirectCount;
    

    let weatherCondition = "calm and quiet";
    if (totalUsd > 5000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (totalTx > 500) weatherCondition = "highly congested and expensive";
    else if (directCount > totalTx * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    
    // Get accent color for numbers based on theme
    const numColor = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';
    
    const newHtml = `
      <div style="font-family: 'Outfit', sans-serif; font-weight: 300; font-size: clamp(22px, 3vw, 36px); letter-spacing: -0.01em; line-height: 1.3; margin-bottom: 4px;">
        Today, <span style="font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 0 12px rgba(255,255,255,0.2); letter-spacing: 0;">${directCount.toLocaleString()}</span> human payments moved <span style="font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 0 12px rgba(255,255,255,0.2); letter-spacing: 0;">${volStr}</span>.
      </div>
      <div style="font-family: 'Outfit', sans-serif; font-size: clamp(14px, 1.8vw, 20px); font-style: italic; font-weight: 300; opacity: 0.6; letter-spacing: 0.05em;">
        The network weather is ${weatherCondition}.
      </div>
    `;
    
    weatherLine.innerHTML = newHtml;
  }"""

new_update_stats = """function updateStats() {
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    // Initialize global tracking
    if (typeof window.sessionTotalTx === 'undefined') {
      window.sessionTotalTx = 0;
      window.sessionTotalUsd = 0;
      window.sessionDirectCount = 0;
      window.tickerProxy = { count: 0, usd: 0 };
    }
    
    // Seed initial blocks so we don't start at 0!
    let changed = false;
    blocks.forEach(b => {
      if (!b._counted) {
        window.sessionTotalTx += b.tx_count;
        const txs = getBlockTransactions(b);
        txs.forEach(t => {
          window.sessionTotalUsd += t.valueUsd || 0;
          if (t.type === 'Plain Transfer') window.sessionDirectCount++;
        });
        b._counted = true;
        changed = true;
      }
    });
    
    let totalTx = window.sessionTotalTx;
    let totalUsd = window.sessionTotalUsd;
    let directCount = window.sessionDirectCount;

    let weatherCondition = "calm and quiet";
    if (totalUsd > 10000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (totalTx > 1000) weatherCondition = "highly congested and expensive";
    else if (directCount > totalTx * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const numColor = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';
    
    // Create the structure only once to preserve DOM elements for GSAP animations
    if (!weatherLine.hasAttribute('data-initialized')) {
      weatherLine.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; font-weight: 200; font-size: clamp(32px, 4vw, 54px); letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 8px;">
          Today, 
          <div style="display: inline-block; perspective: 400px; vertical-align: bottom;">
            <span id="ticker-count" style="display: inline-block; font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 0 16px rgba(255,255,255,0.3); transform-style: preserve-3d; will-change: transform;">0</span>
          </div> 
          human payments moved 
          <div style="display: inline-block; perspective: 400px; vertical-align: bottom;">
            <span id="ticker-usd" style="display: inline-block; font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 0 16px rgba(255,255,255,0.3); transform-style: preserve-3d; will-change: transform;">$0</span>
          </div>.
        </div>
        <div id="ticker-prose" style="font-family: 'Outfit', sans-serif; font-size: clamp(16px, 2vw, 24px); font-style: italic; font-weight: 300; opacity: 0.6; letter-spacing: 0.05em; transition: opacity 0.5s;">
          The network weather is ${weatherCondition}.
        </div>
      `;
      weatherLine.setAttribute('data-initialized', 'true');
    }

    if (changed && typeof gsap !== 'undefined') {
      const elCount = document.getElementById('ticker-count');
      const elUsd = document.getElementById('ticker-usd');
      const elProse = document.getElementById('ticker-prose');
      
      if (elCount && elUsd && elProse) {
        // Update the prose softly
        elProse.textContent = `The network weather is ${weatherCondition}.`;
        
        // Wall Street Flip Animation!
        // 1. Visually flip the spans out and in
        gsap.timeline()
          .to([elCount, elUsd], { rotateX: 90, opacity: 0.5, duration: 0.25, ease: 'power2.in' })
          .to([elCount, elUsd], { rotateX: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
        
        // 2. Tween the actual values rapidly while they are flipping
        gsap.to(window.tickerProxy, {
          count: directCount,
          usd: totalUsd,
          duration: 0.75,
          ease: 'power2.out',
          onUpdate: () => {
            const vUsd = window.tickerProxy.usd;
            const volStr = vUsd > 1000000 ? '$' + (vUsd / 1000000).toFixed(2) + 'M' : '$' + Math.floor(vUsd).toLocaleString();
            elCount.textContent = Math.floor(window.tickerProxy.count).toLocaleString();
            elUsd.textContent = volStr;
            elCount.style.color = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';
            elUsd.style.color = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';
          }
        });
      }
    }
  }"""

if old_update_stats in js:
    js = js.replace(old_update_stats, new_update_stats)
    with open('mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Ticker replaced successfully.")
else:
    print("Could not find the old block. It might have been altered.")

