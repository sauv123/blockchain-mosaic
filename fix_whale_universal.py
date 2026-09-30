import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the whale logic I just added inside the MACRO block
macro_whale = r"// WHALE BLOCK SPECIAL EFFECTS.*?ctx\.restore\(\);\s*\}"
js = re.sub(macro_whale, "", js, flags=re.DOTALL)

# 2. Add the universal Whale Shockwave at the very end of drawTile
universal_whale = """
  // === UNIVERSAL WHALE ANIMATION (Applies to both MACRO and MICRO) ===
  if (block.whale_flag === 1) {
      const t = (Date.now() % 2000) / 2000; 
      const maxRadius = size * (renderScale === 'MACRO' ? 2.5 : 4.0); // Bigger shockwave in micro mode
      
      ctx.save();
      
      // Expanding Shockwave Ring 1
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, t * maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - t})`;
      ctx.lineWidth = renderScale === 'MACRO' ? 2 : 1;
      ctx.stroke();
      
      // Expanding Shockwave Ring 2
      const t2 = (Date.now() % 2000 + 1000) % 2000 / 2000;
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, t2 * maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - t2})`;
      ctx.lineWidth = renderScale === 'MACRO' ? 1 : 0.5;
      ctx.stroke();
      
      // Center Diamond Core (Only for MACRO, since MICRO shows individual pixels)
      if (renderScale === 'MACRO') {
          // Dim the background of the block to make the diamond pop
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x, y, size, size);
          
          const pulseSize = size * 0.4 + Math.sin(Date.now() / 150) * (size * 0.1);
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#ffffff';
          
          ctx.beginPath();
          ctx.moveTo(x + size/2, y + size/2 - pulseSize);
          ctx.lineTo(x + size/2 + pulseSize, y + size/2);
          ctx.lineTo(x + size/2, y + size/2 + pulseSize);
          ctx.lineTo(x + size/2 - pulseSize, y + size/2);
          ctx.closePath();
          ctx.fill();
      } else {
          // In MICRO mode, draw a glowing white border around the entire micro-grid block
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, size, size);
      }
      
      ctx.restore();
  }
}
"""

# Replace the closing brace of drawTile
js = re.sub(r'\}\s*// Render tooltip overlay if active', universal_whale + '\n// Render tooltip overlay if active', js)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Universal whale animation injected.")
