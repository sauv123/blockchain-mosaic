import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the custom cursor logic
if "initCustomCursor();" in js:
    js = js.replace("initCustomCursor();", "// initCustomCursor(); removed by user request")
    
# 2. Add the intense glow back to hoveredBlock
old_hover = """      // Removed hard outer outline; relying on internal subpixel glow
      // We can add a very subtle overall glass reflection
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, size, size);
      ctx.restore();"""

new_hover = """      ctx.save();
      // Restored the intense hover glow effect
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, size, size);
      ctx.restore();"""

if old_hover in js:
    js = js.replace(old_hover, new_hover)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

# 3. Remove custom cursor CSS from style.css
with open('display/style.css', 'r', encoding='utf-8') as css_f:
    css = css_f.read()
    
# We will just force body cursor to default if it was overridden, 
# and make sure #custom-cursor is hidden in case it was injected
css += "\\nbody { cursor: auto !important; }\\n#custom-cursor { display: none !important; }\\n"

with open('display/style.css', 'w', encoding='utf-8') as css_f:
    css_f.write(css)

print("Cursor removed and hover glow restored.")
