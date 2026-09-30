import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Locate the MACRO whale rendering in drawTile
# In drawTile, after `ctx.stroke();`, we can inject the whale animation.
# Let's find where drawTile handles whales in MACRO mode.

whale_macro_code = r"""
    if \(block\.whale_flag === 1\) \{
      ctx\.fillStyle = '#ffffff';
      ctx\.shadowColor = '#ffffff';
      ctx\.shadowBlur = 20;
    \}
"""

new_whale_macro = """
    // WHALE BLOCK SPECIAL EFFECTS
    let isWhale = (block.whale_flag === 1);
    if (isWhale) {
      // Base block becomes a deep, dark contrasting void to make the center pop
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fill();
      
      // Whale Animation: Expanding Shockwave Rings
      const t = (Date.now() % 2000) / 2000; // 0.0 to 1.0 every 2 seconds
      const maxRadius = size * 2.5;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, t * maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - t})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Secondary echo ring
      const t2 = (Date.now() % 2000 + 1000) % 2000 / 2000;
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, t2 * maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - t2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Center Diamond Core
      const pulseSize = size * 0.4 + Math.sin(Date.now() / 150) * (size * 0.1);
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      
      ctx.beginPath();
      ctx.moveTo(x + size/2, y + size/2 - pulseSize); // Top
      ctx.lineTo(x + size/2 + pulseSize, y + size/2); // Right
      ctx.lineTo(x + size/2, y + size/2 + pulseSize); // Bottom
      ctx.lineTo(x + size/2 - pulseSize, y + size/2); // Left
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
"""

js = re.sub(whale_macro_code, new_whale_macro, js, flags=re.DOTALL)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Whale animation injected.")
