import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update stats GSAP logic
bad_gsap = """  if (typeof gsap !== 'undefined') {
    gsap.to(elCount, { innerHTML: totalTx, duration: 0.3, snap: "innerHTML" });
    gsap.to(elVol, { innerHTML: "$" + (totalVol / 1000000).toFixed(2) + "M", duration: 0.3, snap: "innerHTML" });
  } else {
    elCount.textContent = totalTx;
    elVol.textContent = "$" + (totalVol / 1000000).toFixed(2) + "M";
  }"""
good_gsap = """  if (typeof gsap !== 'undefined') {
    gsap.to(elCount, { innerHTML: totalTx, duration: 0.3, snap: "innerHTML" });
    // Manually format the volume without suffix/prefix inside GSAP string to prevent NaN jitter
    const volObj = { val: parseFloat(elVol.textContent) || 0 };
    const targetVol = totalVol / 1000000;
    gsap.to(volObj, { 
      val: targetVol, 
      duration: 0.3, 
      onUpdate: () => { elVol.textContent = volObj.val.toFixed(2); } 
    });
  } else {
    elCount.textContent = totalTx;
    elVol.textContent = (totalVol / 1000000).toFixed(2);
  }"""
js = js.replace(bad_gsap, good_gsap)

# 2. Add 'P' shortcut logic
bad_shortcut = """  if (e.key === 'f' || e.key === 'F') {"""
good_shortcut = """  if (e.key === 'p' || e.key === 'P') {
    const genBtn = document.getElementById('generate-portrait-btn');
    if (genBtn && genBtn.offsetParent !== null) { // visible
      genBtn.click();
    }
  }
  if (e.key === 'f' || e.key === 'F') {"""
js = js.replace(bad_shortcut, good_shortcut)

# 3. Update Electric Blue Palette
bad_palette = """  electricBlue: {
    bg: '#000814',
    txStandard: '#00b4d8',
    txSwap: '#0077b6',
    txMint: '#90e0ef',
    txContract: '#03045e'
  },"""
good_palette = """  electricBlue: {
    bg: '#000814',
    txStandard: '#00d2ff', // Extremely bright cyan
    txSwap: '#0044ff',     // Deep royal blue
    txMint: '#8a2be2',     // Blue violet
    txContract: '#ffffff'  // Crisp white for high contrast
  },"""
js = js.replace(bad_palette, good_palette)

# 4. Tracked Wallet logic fix
# Actually wait, trackWallet exists, but it just sets trackedAddress
# In drawTile, it highlights it. Let's make the highlight stronger.
bad_highlight = """      if (block.isTracked) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }"""
good_highlight = """      if (block.isTracked) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
        // Add a soft glow
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + tileSize/2 - 2, y + tileSize/2 - 2, 4, 4);
        ctx.shadowBlur = 0;
      }"""
js = js.replace(bad_highlight, good_highlight)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("JS logic updated")
