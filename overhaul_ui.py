import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Replace the flat tile background with a sleek 3D glass pane
old_bg = """  ctx.fillStyle = isOnTemplate ? theme.tileBg : theme.bg;
  ctx.fillRect(x, y, size, size);"""

new_bg = """  // === PREMIUM 3D GLASS PANE BACKGROUND ===
  const radius = size > 20 ? 8 : 2;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  
  // Inner gradient for glass depth
  const gradBg = ctx.createLinearGradient(x, y, x, y + size);
  gradBg.addColorStop(0, isOnTemplate ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)');
  gradBg.addColorStop(1, 'rgba(0,0,0,0.2)');
  
  ctx.fillStyle = gradBg;
  ctx.fill();
  
  // Subtle outer glass rim (eliminates the "flat outline" look)
  ctx.lineWidth = 1;
  ctx.strokeStyle = isOnTemplate ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';
  ctx.stroke();"""

js = js.replace(old_bg, new_bg)

# 2. Overhaul the MACRO solid blocks to look like 3D physical jewels
old_macro = """    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillSize, fillSize, 4);
    ctx.fillStyle = baseColor;
    
    if (!isDimmed && intensity > 0.7) {"""

new_macro = """    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillSize, fillSize, radius - 1);
    
    // 3D Volumetric Gradient for Macro blocks
    const gradBlock = ctx.createLinearGradient(x, y, x + size, y + size);
    gradBlock.addColorStop(0, '#ffffff'); // bright top-left corner
    gradBlock.addColorStop(0.2, baseColor); // main color
    gradBlock.addColorStop(1, '#000000'); // deep shadow
    
    ctx.fillStyle = gradBlock;
    
    if (!isDimmed && intensity > 0.7) {"""

js = js.replace(old_macro, new_macro)

# 3. Overhaul the MICRO subpixels to be glowing orbs/LEDs instead of flat squares
old_micro = """      if (isBlockHovered && !isDimmed) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = baseColor;
      }

      ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    }
  });"""

new_micro = """      if (isBlockHovered && !isDimmed) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = baseColor;
      }

      // 3D Glowing Orbs instead of flat squares
      const spX = x + cell.col * subSize + (subSize / 2);
      const spY = y + cell.row * subSize + (subSize / 2);
      const spRadius = (subSize - 1) / 2;
      
      ctx.beginPath();
      ctx.arc(spX, spY, spRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Optional: Tiny core highlight for extreme depth on larger blocks
      if (subSize > 4 && !isDimmed) {
        ctx.beginPath();
        ctx.arc(spX - spRadius*0.2, spY - spRadius*0.2, spRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.fillStyle = finalColor; // restore
      }
    }
  });"""

js = js.replace(old_micro, new_micro)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Mosaic UI completely overhauled with 3D/Glassmorphism!")
