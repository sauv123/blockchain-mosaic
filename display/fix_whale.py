import re
with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_whale = """    if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
    } else {"""

new_whale = """    if (block.whale_flag === 1 && (idx === whaleIndex1 || idx === whaleIndex2)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffffff';
      ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
    } else {"""

js = js.replace(old_whale, new_whale)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed whale transactions rendering.")
