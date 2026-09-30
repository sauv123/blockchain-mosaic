import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the massive universal whale animation
old_whale = r"// === UNIVERSAL WHALE ANIMATION ===.*?ctx\.restore\(\);\s*\}"

new_whale = """
  // === WHALE FLASH ANIMATION ===
  if (block.whale_flag === 1) {
      // Elegant pulsing flash instead of shockwaves/diamonds
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2; // 0.0 to 1.0 fast pulse
      
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15 + (pulse * 15); // Pulsing glow from 15px to 30px
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.6})`; // Pulsing opacity 0.4 to 1.0
      
      if (renderScale === 'MACRO') {
          ctx.fillRect(x, y, size, size);
      } else {
          // In MICRO, outline the micro-grid
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.4})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, size, size);
      }
      ctx.restore();
  }
"""

js = re.sub(old_whale, new_whale, js, flags=re.DOTALL)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Simple whale flash injected.")
