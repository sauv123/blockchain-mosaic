import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = """      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');
        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }
    ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    ctx.shadowBlur = 0;"""

new_code = """      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.shadowBlur = 0;
        ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
      } else {
        const parsedColor = baseColor.replace(')', `, ${finalOpacity})`).replace('hsl', 'hsla');
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 0;
        ctx.fillRect(x + cell.col * subSize + 1.5, y + cell.row * subSize + 1.5, subSize - 1, subSize - 1);

        ctx.fillStyle = parsedColor;
        if (isBlockHovered || isFilteredMatch) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 16;
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
        } else {
          ctx.shadowBlur = 2;
          ctx.shadowColor = baseColor;
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
        }
      }
    }
    ctx.shadowBlur = 0;"""

idx1 = js.find("if (isDimmed) {")
if idx1 != -1:
    idx2 = js.find("ctx.shadowBlur = 0;", idx1)
    idx3 = js.find("ctx.shadowBlur = 0;", idx2 + 1)
    idx4 = js.find("ctx.shadowBlur = 0;", idx3 + 1) + len("ctx.shadowBlur = 0;")
    
    js = js[:idx1] + new_code[6:] + js[idx4:]
    print("Element glow enhanced.")
else:
    print("Failed to replace element glow.")

with open('mosaic.js', 'w') as f:
    f.write(js)
