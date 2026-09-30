import re
with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the outer white outline on hoveredBlock
outer_hover = """      ctx.save();
      // Crisp outer border only
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, size, size);
      ctx.restore();"""
new_outer_hover = """      // Removed hard outer outline; relying on internal subpixel glow
      // We can add a very subtle overall glass reflection
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, size, size);
      ctx.restore();"""
js = js.replace(outer_hover, new_outer_hover)

# 2. Remove the inner subpixel white outline and boost the glow
inner_hover = """        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 16;
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
        } else {"""
new_inner_hover = """        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 24; // Bigger, softer cinematic glow
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          // Added a bright core to the pixel without a hard outline
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(x + cell.col * subSize + 1.5, y + cell.row * subSize + 1.5, subSize - 3, subSize - 3);
        } else {"""
js = js.replace(inner_hover, new_inner_hover)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
