const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

// 1. Hook up the Calendar Days UI
const calendarTarget = "function initUI() {";
const calendarLogic = `
  const calendarGrid = document.getElementById('calendar-days-grid');
  if (calendarGrid) {
    for (let i = 1; i <= 31; i++) {
      const btn = document.createElement('button');
      btn.className = 'calendar-day';
      if (i > 17) btn.classList.add('empty-day'); // Future days
      btn.textContent = i;
      
      if (i <= 17) {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('active-selected'));
          btn.classList.add('active-selected');
          triggerArtisticSynthesis(i);
        });
      }
      calendarGrid.appendChild(btn);
    }
  }
`;

js = js.replace(calendarTarget, calendarTarget + '\n' + calendarLogic);

// 2. Add the Artistic Synthesis Render Logic
const drawTarget = "function draw() {";
const synthesisLogic = `
  if (currentMode === 'ART_SYNTHESIS') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    
    const totalTransactions = blocks.reduce((sum, b) => sum + getBlockTransactions(b).length, 0);
    if (totalTransactions === 0) return;
    
    const aspect = canvas.width / canvas.height;
    const rows = Math.ceil(Math.sqrt(totalTransactions / aspect));
    const cols = Math.ceil(totalTransactions / rows);
    
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    
    let i = 0;
    
    ctx.save();
    ctx.filter = 'saturate(180%) blur(4px) contrast(140%) brightness(0.9)';
    
    blocks.forEach(block => {
      const txs = getBlockTransactions(block);
      txs.forEach(tx => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        
        const x = c * cellW;
        const y = r * cellH;
        
        let baseColor = PALETTES[currentPalette][tx.type] || PALETTES[currentPalette]['default'];
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(x - 2, y - 2, cellW + 4, cellH + 4); // generous overlap to bleed
        
        i++;
      });
    });
    
    ctx.restore();
    return; // Skip normal grid drawing
  }
`;

js = js.replace(drawTarget, drawTarget + '\n' + synthesisLogic);

const globalLogic = `
function triggerArtisticSynthesis(day) {
  currentMode = 'ART_SYNTHESIS';
  
  blocks = [];
  for (let i = 0; i < 200; i++) {
    blocks.push(generateMockBlock(i));
  }
  
  document.getElementById('massive-dashboard-stats').style.display = 'none';
  document.getElementById('archive-drawer').classList.remove('open');
  document.querySelector('.canvas-container').classList.remove('sidebar-open');
  
  let artOverlay = document.getElementById('art-synthesis-overlay');
  if (!artOverlay) {
    artOverlay = document.createElement('div');
    artOverlay.id = 'art-synthesis-overlay';
    artOverlay.style.position = 'absolute';
    artOverlay.style.bottom = '100px';
    artOverlay.style.left = '50%';
    artOverlay.style.transform = 'translateX(-50%)';
    artOverlay.style.zIndex = '9000';
    artOverlay.style.textAlign = 'center';
    artOverlay.style.color = '#fff';
    artOverlay.style.pointerEvents = 'none';
    
    artOverlay.innerHTML = \`
      <div style="font-family: 'Space Mono', monospace; font-size: 14px; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">Synthesis Complete</div>
      <div style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 20px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">PORTRAIT OF JULY \${day}, 2026</div>
      <button style="pointer-events: auto; padding: 12px 30px; background: #fff; color: #000; border: none; border-radius: 30px; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; cursor: pointer; letter-spacing: 0.1em; transition: transform 0.2s; box-shadow: 0 8px 24px rgba(0,0,0,0.4);" onclick="location.reload()">Return to Live Grid</button>
    \`;
    document.body.appendChild(artOverlay);
  } else {
    artOverlay.style.display = 'block';
    artOverlay.querySelector('div:nth-child(2)').textContent = \`PORTRAIT OF JULY \${day}, 2026\`;
  }
  
  // Force one draw call
  draw();
}
`;

js += '\n' + globalLogic;
fs.writeFileSync('mosaic.js', js);
console.log("Calendar logic injected.");
