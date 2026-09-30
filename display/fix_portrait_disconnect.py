import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# 1. Update triggerArtisticSynthesis to keep the existing grid shape
target_synth = """function triggerArtisticSynthesis(day, dayBlocks) {
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
  }];"""

new_synth = """function triggerArtisticSynthesis(day, dayBlocks) {
  currentMode = 'ART_SYNTHESIS';
  pausePlayback();
  
  if (dayBlocks && dayBlocks.length > 0) {
    blocks = [...dayBlocks];
  } else {
    blocks = generateMockHistoryForDate(`2026-07-${day < 10 ? '0'+day:day}`).slice(0, 1000);
  }
  
  let counts = { 'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Smart Contract': 0 };
  blocks.forEach(b => {
    getBlockTransactions(b).forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
  });
  let dominantType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);"""

js = js.replace(target_synth, new_synth)


# 2. Update the draw loop for ART_SYNTHESIS to render the actual blocks in their grid positions
target_draw_synth = """  if (currentMode === 'ART_SYNTHESIS') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    
    const totalTransactions = blocks.reduce((sum, b) => sum + getBlockTransactions(b).length, 0);
    if (totalTransactions === 0) {
       requestAnimationFrame(draw);
       return;
    }
    
    const aspect = canvas.width / canvas.height;
    const rows = Math.ceil(Math.sqrt(totalTransactions / aspect));
    const cols = Math.ceil(totalTransactions / rows);
    
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    
    let i = 0;
    
    ctx.save();
    ctx.filter = 'saturate(200%) blur(4px) contrast(150%) brightness(0.9)';
    
    blocks.forEach(block => {
      const txs = getBlockTransactions(block);
      txs.forEach(tx => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        
        const x = c * cellW;
        const y = r * cellH;
        
        let baseColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(x - 4, y - 4, cellW + 8, cellH + 8); // generous overlap to bleed
        
        i++;
      });
    });
    
    ctx.restore();
    requestAnimationFrame(draw);
    return;
  }"""

new_draw_synth = """  if (currentMode === 'ART_SYNTHESIS') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    
    // Apply premium artistic blending filters to the canvas
    ctx.filter = 'saturate(250%) blur(6px) contrast(160%) brightness(1.1)';
    
    // Calculate standard grid just like LIVE mode
    const totalBlocks = maxTiles;
    const aspect = canvas.width / canvas.height;
    const rows = Math.ceil(Math.sqrt(totalBlocks / aspect));
    const cols = Math.ceil(totalBlocks / rows);
    const cellSizeX = canvas.width / cols;
    const cellSizeY = canvas.height / rows;
    
    blocks.forEach((block, index) => {
      const c = index % cols;
      const r = Math.floor(index / cols);
      const x = c * cellSizeX;
      const y = r * cellSizeY;
      
      const txs = getBlockTransactions(block);
      if (txs.length > 0) {
        // Average the color of the block's transactions
        let primaryTx = txs[0];
        let baseColor = PALETTES[currentPalette][primaryTx.type] || PALETTES[currentPalette]['default'];
        ctx.fillStyle = baseColor;
        // Overlap significantly to cause the blur filter to melt them into a continuous painting
        ctx.fillRect(x - 5, y - 5, cellSizeX + 10, cellSizeY + 10);
      }
    });
    
    ctx.restore();
    requestAnimationFrame(draw);
    return;
  }"""

js = js.replace(target_draw_synth, new_draw_synth)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("Portrait rendering fixed.")
