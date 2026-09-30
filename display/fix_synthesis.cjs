const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const drawTarget = "function draw(timestamp) {";
const synthesisLogic = `
  if (currentMode === 'ART_SYNTHESIS') {
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
    
    // Draw a luxurious overlay frame
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    requestAnimationFrame(draw);
    return; // Skip normal grid drawing
  }
`;

if (!js.includes("currentMode === 'ART_SYNTHESIS'")) {
    js = js.replace(drawTarget, drawTarget + '\n' + synthesisLogic);
    fs.writeFileSync('mosaic.js', js);
    console.log("Synthesis loop injected.");
} else {
    console.log("Already exists?");
}
