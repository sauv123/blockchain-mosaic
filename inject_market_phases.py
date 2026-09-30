import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

market_engine = """
// === MARKET PHASE & CIRCADIAN PHYSICS ENGINE ===
// Driven completely by actual transaction data + local time context

function getNetworkFactor(block) {
  if (!block) return 'ACTIVE';
  
  // Calculate raw intensity based on actual transactions
  const txDensity = block.tx_count / 300; // 0.0 to 1.0+
  const smartContractFriction = block.contract_ratio || 0.2; 
  
  if (txDensity > 0.75 && smartContractFriction > 0.5) return 'SPIKE';        // Intense volume + high friction
  if (txDensity > 0.65 && smartContractFriction <= 0.5) return 'ACCUMULATION'; // Heavy volume, simple transfers (Whale accumulation)
  if (txDensity < 0.25) return 'QUIET';                                        // Very low activity
  return 'ACTIVE';                                                             // Standard market flow
}

// Global Time getter
function getLocalTimePhase() {
  const hr = new Date().getHours();
  if (hr >= 6 && hr < 12) return 'MORNING';
  if (hr >= 12 && hr < 17) return 'AFTERNOON';
  if (hr >= 17 && hr < 22) return 'EVENING';
  return 'NIGHT';
}

function getPhasePhysics(factor) {
  // Returns [gutter, shimmerSpeed, cullingThreshold]
  if (factor === 'SPIKE') return [0, 400, -0.8];         // Massive solid wall, violent vibration, dense
  if (factor === 'ACCUMULATION') return [0.5, 2000, -0.4]; // Tight heavy blocks, slow heavy pulse
  if (factor === 'QUIET') return [3.5, 4500, 0.4];       // Spread out, extremely slow breathing, sparse
  return [1.2, 1800, 0.0];                               // Standard 'ACTIVE' grid
}

function getTimeOfDayDrift(col, row, cols, rows, factor, timePhase) {
  let driftX = 0; let driftY = 0;
  
  // The intensity of the Time of Day effect scales with the Network Factor
  let multiplier = 1.0;
  if (factor === 'SPIKE') multiplier = 3.5;
  if (factor === 'ACCUMULATION') multiplier = 2.0;
  if (factor === 'QUIET') multiplier = 0.5;

  if (timePhase === 'MORNING') {
    // Organic upward blooming (Market waking up)
    driftY = -Math.abs(Math.sin(col * 0.2 + row * 0.1)) * 4 * multiplier;
  } 
  else if (timePhase === 'EVENING') {
    // Gravity well / Consolidation towards center as volume peaks
    const dx = col - (cols/2);
    const dy = row - (rows/2);
    const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy));
    driftX = -(dx / dist) * 1.5 * multiplier;
    driftY = -(dy / dist) * 1.5 * multiplier;
  }
  else if (timePhase === 'NIGHT') {
    // Digital fragmentation / sleep mode (Blocks stagger horizontally)
    driftX = (row % 2 === 0) ? (1.5 * multiplier) : (-1.5 * multiplier);
  }
  // AFTERNOON remains neutral standard layout
  
  return { dx: driftX, dy: driftY };
}
"""

# Strip out old generative shape code to cleanly inject the new engine
js = re.sub(r'// === GENERATIVE DAILY ALGORITHM ===.*?// === CIRCADIAN UI ENGINE \(Time of Day\) ===', market_engine, js, flags=re.DOTALL)

# Let's fix the draw() loop to use this new engine
# Find the block drawing loop
loop_target = r'for \(let index = 0; index < blocks\.length; index\+\+\) \{[\s\S]*?drawTile\(ctx, x \+ floatX, y \+ floatY, tileSize - dynamicGutter, block, blockInterval, progress \* tileShimmer \* rippleAlphaModifier, theme, isTracked, trackDirection, isOnTemplate\);\s*\}'

def replacement_func(match):
    return """
  const timePhase = getLocalTimePhase();
  
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * tileSize;
    const y = row * tileSize;

    const prevBlock = index > 0 ? blocks[index - 1] : null;
    const blockInterval = prevBlock ? Math.max(1, block.timestamp - prevBlock.timestamp) : 12;
    
    // Calculate exact network phase based on the transaction data itself!
    const networkFactor = currentMode === 'HISTORICAL' 
       ? (index % 7 === 0 ? 'SPIKE' : (index % 4 === 0 ? 'ACCUMULATION' : 'ACTIVE')) // Simulated for archive preview
       : getNetworkFactor(block);
       
    const [phaseGutter, phaseShimmerSpeed, cullThreshold] = getPhasePhysics(networkFactor);
    
    // Shape Culling (only for historical generative shapes)
    let isOnTemplate = true;
    if (currentMode === 'HISTORICAL') {
       const frequency = 0.1 + (historicalDayNumber % 15) * 0.015;
       const px = Math.sin(row * frequency + historicalDayNumber);
       const py = Math.cos(col * frequency - historicalDayNumber);
       isOnTemplate = (Math.sin(px + py) * Math.cos(px - py)) > cullThreshold;
    }

    let progress = 1.0;
    if (currentMode === 'LIVE' && block.block_number === incomingBlockNum) {
      const elapsed = Date.now() - incomingBlockStartTime;
      progress = Math.min(elapsed / PAINT_DURATION, 1.0);
    }

    const phaseShift = (col + row) * 0.15;
    const tileShimmer = Math.sin(Date.now() / phaseShimmerSpeed + phaseShift) * 0.03 + 0.97;

    let isTracked = false;
    let trackDirection = 'none';
    if (trackedAddress && trackedAddress.length > 0) {
      const txs = getBlockTransactions(block);
      const match = txs.find(tx => tx.from.includes(trackedAddress) || tx.to.includes(trackedAddress));
      if (match) {
        isTracked = true;
        trackDirection = match.from.includes(trackedAddress) ? 'sent' : 'received';
      }
    }

    // 1. Organic Spatial Drift (Focus Mode Sine Wave)
    let floatX = 0;
    let floatY = 0;
    if (focusFloatProgress.value > 0) {
      const timeFactor = Date.now() * 0.0012;
      floatX = Math.sin(timeFactor + col * 0.5 + row * 0.3) * 8 * focusFloatProgress.value;
      floatY = Math.cos(timeFactor + col * 0.3 + row * 0.5) * 8 * focusFloatProgress.value;
    }
    
    // 2. TIME OF DAY MODIFIER (The physical layout warps based on Morning/Evening interacting with Network Factor)
    const todDrift = getTimeOfDayDrift(col, row, cols, rows, networkFactor, timePhase);
    floatX += todDrift.dx;
    floatY += todDrift.dy;

    // 3. Click Radial Wave Ripple Effect calculation
    let rippleAlphaModifier = 1.0;
    if (rippleOriginCol !== -1 && rippleProgress.value > 0 && rippleProgress.value < 1.0) {
      const dist = Math.sqrt(Math.pow(col - rippleOriginCol, 2) + Math.pow(row - rippleOriginRow, 2));
      const targetRadius = rippleProgress.value * Math.max(cols, rows) * 1.5;
      const width = 2.5;
      if (Math.abs(dist - targetRadius) < width) {
        const factor = 1.0 - (Math.abs(dist - targetRadius) / width);
        rippleAlphaModifier = 1.0 + factor * 1.5;
      }
    }

    drawTile(ctx, x + floatX, y + floatY, tileSize - phaseGutter, block, blockInterval, progress * tileShimmer * rippleAlphaModifier, theme, isTracked, trackDirection, isOnTemplate);
  }
"""

js = re.sub(loop_target, replacement_func, js)

# We also need to remove the top-level dynamicGutter injection I did earlier to avoid duplicate variables
js = re.sub(r'// Calculate dynamic gutter for the whole frame[\s\S]*?dynamicGutter = getDynamicGutter.*?\}', '', js)
js = js.replace('tileSize - dynamicGutter', 'tileSize - gutter') # Fix any leftovers

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Market phases injected.")
