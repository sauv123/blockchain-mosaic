import sys

with open('mosaic.js', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if line.startswith("function triggerArtisticSynthesis(day) {"):
        start_idx = i
    if start_idx != -1 and line.startswith("}") and i > start_idx + 30:
        end_idx = i
        break

if start_idx == -1 or end_idx == -1:
    print("Could not find triggerArtisticSynthesis bounds")
    sys.exit(1)

new_func = """function triggerArtisticSynthesis(day, dayBlocks) {
  currentMode = 'ART_SYNTHESIS';
  pausePlayback();
  
  if (!dayBlocks || dayBlocks.length === 0) dayBlocks = generateMockHistoryForDate(`2026-07-${day < 10 ? '0'+day:day}`).slice(0, 1000);
  
  // ALGORITHM: Analyze the day's patterns to generate a beautiful, sorted picture
  let allTxs = [];
  let counts = { 'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Smart Contract': 0 };
  
  dayBlocks.forEach(b => {
    getBlockTransactions(b).forEach(t => {
      allTxs.push(t);
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
  });
  
  // Find dominant pattern
  let dominantType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  
  // Sort the transactions to create gradients/bands instead of noise
  allTxs.sort((a, b) => {
    // Primary sort by type to group colors
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    // Secondary sort by value to create intensity gradients within the color bands
    return (a.valueUsd || 0) - (b.valueUsd || 0);
  });
  
  // Re-pack into a single massive mock block so the draw loop renders them sequentially in the grid
  blocks = [{
    block_number: 'SYNTHESIS',
    transactions: allTxs
  }];
  
  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) weatherLine.style.display = 'none';
  document.getElementById('archive-drawer').classList.remove('open');
  document.querySelector('.canvas-container').classList.remove('sidebar-open');
  
  // Generate the story text
  let storyText = "A calm, balanced day on the network.";
  if (dominantType === 'Token Swap') {
    storyText = "The fiery orange and pink bands dominate the canvas, visualizing a day of extreme market volatility and heavy coin trading.";
  } else if (dominantType === 'Plain Transfer') {
    storyText = "Cool, sweeping gradients reflect a quiet day dominated by simple, peer-to-peer human payments.";
  } else if (dominantType === 'NFT Mint') {
    storyText = "Vivid, geometric clusters burst across the canvas, capturing a frenzy of digital art creation.";
  }
  
  let artOverlay = document.getElementById('art-synthesis-overlay');
  if (!artOverlay) {
    artOverlay = document.createElement('div');
    artOverlay.id = 'art-synthesis-overlay';
    artOverlay.style.position = 'absolute';
    artOverlay.style.bottom = '80px';
    artOverlay.style.left = '50%';
    artOverlay.style.transform = 'translateX(-50%)';
    artOverlay.style.zIndex = '9000';
    artOverlay.style.textAlign = 'center';
    artOverlay.style.color = '#fff';
    artOverlay.style.pointerEvents = 'none';
    
    artOverlay.innerHTML = `
      <div style="font-family: 'Space Mono', monospace; font-size: 14px; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">Synthesis Complete</div>
      <div id="art-portrait-title" style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">PORTRAIT OF JULY ${day}, 2026</div>
      <div id="art-portrait-story" style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 300; color: rgba(255,255,255,0.8); max-width: 600px; margin: 0 auto 24px auto; line-height: 1.5; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">${storyText}</div>
      <button style="pointer-events: auto; padding: 12px 30px; background: #fff; color: #000; border: none; border-radius: 30px; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; cursor: pointer; letter-spacing: 0.1em; transition: transform 0.2s; box-shadow: 0 8px 24px rgba(0,0,0,0.4);" onclick="location.reload()">Return to Live Grid</button>
    `;
    document.body.appendChild(artOverlay);
  } else {
    artOverlay.style.display = 'block';
    document.getElementById('art-portrait-title').textContent = `PORTRAIT OF JULY ${day}, 2026`;
    document.getElementById('art-portrait-story').textContent = storyText;
  }
}
"""

lines = lines[:start_idx] + [new_func] + lines[end_idx+1:]

with open('mosaic.js', 'w') as f:
    f.writelines(lines)

print("Algorithm replaced.")
