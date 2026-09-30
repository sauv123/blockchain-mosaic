with open('mosaic.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_block = """  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    if (typeof window.sessionTotalTx === 'undefined') {
      window.sessionTotalTx = 0;
      window.sessionTotalUsd = 0;
      window.sessionDirectCount = 0;
      window.tickerProxy = { count: 0, usd: 0 };
    }
    
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
        elProse.textContent = `The network weather is ${weatherCondition}.`;
        
        // Wall Street Flip Animation
        gsap.timeline()
          .to([elCount, elUsd], { rotateX: 90, opacity: 0.5, duration: 0.25, ease: 'power2.in' })
          .to([elCount, elUsd], { rotateX: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
        
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
  }\n"""

# Find the start and end indices dynamically
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "const weatherLine = document.getElementById('cinematic-weather-line');" in line:
        if start_idx == -1:
            start_idx = i
    if "if (blocks.length === 0) return;" in line and start_idx != -1:
        # We know this is after the weather line block
        # We need to trace back to the closing brace of `if (weatherLine)`
        end_idx = i - 2
        break

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx+1] = [new_block]
    with open('mosaic.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Replaced weather line logic successfully.")
else:
    print(f"Failed to find indices. Start: {start_idx}, End: {end_idx}")

