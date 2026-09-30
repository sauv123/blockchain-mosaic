import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

universal_whale = """
  // === UNIVERSAL WHALE ANIMATION ===
  if (block.whale_flag === 1) {
      const t = (Date.now() % 2000) / 2000; 
      const maxRadius = size * (renderScale === 'MACRO' ? 2.5 : 4.0);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, t * maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - t})`;
      ctx.lineWidth = renderScale === 'MACRO' ? 2 : 1;
      ctx.stroke();
      
      const t2 = (Date.now() % 2000 + 1000) % 2000 / 2000;
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, t2 * maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - t2})`;
      ctx.lineWidth = renderScale === 'MACRO' ? 1 : 0.5;
      ctx.stroke();
      
      if (renderScale === 'MACRO') {
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
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, size, size);
      }
      ctx.restore();
  }
"""

js = js.replace("ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);\n  }\n}", "ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);\n  }\n" + universal_whale + "\n}")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected!")
