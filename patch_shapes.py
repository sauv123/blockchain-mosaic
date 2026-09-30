import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """function getDailyMaskAlignment(col, row, category) {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const dx = Math.abs(col - cx);
  const dy = Math.abs(row - cy);

  switch (category) {
    case 'dragon':
      return row >= cy - 2 && dx <= (rows - 1 - row) * 0.75;
    case 'diamond':
      return dy < rows * 0.4 && dx < (rows * 0.4 - dy) * 0.8;
    case 'shield':
      return dy < rows * 0.35 && dx < cols * 0.2 && (row <= cy || dx < cols * 0.15 - (row - cy) * 0.1);
    case 'wave':
      const targetRow = cy + Math.round(Math.sin((col / cols) * Math.PI * 2) * (rows * 0.25));
      return Math.abs(row - targetRow) < 2;
    case 'zen':
      const dist = Math.sqrt(dx * dx + dy * dy);
      return Math.round(dist) % 4 === 0 || Math.round(dist) % 4 === 1;
  }
  return true;
}"""

good = """function getDailyMaskAlignment(col, row, category) {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const dx = Math.abs(col - cx);
  const dy = Math.abs(row - cy);

  switch (category) {
    case 'dragon':
      // A massive, distinct pyramid/triangle shape pointing upwards
      return dx <= (rows - row) * 1.5;
    case 'diamond':
      // A thick, massive geometric diamond taking up the center
      return (dx / cols) + (dy / rows) < 0.35;
    case 'shield':
      // A wide, blocky shield
      return dx < cols * 0.3 && (row <= cy || dx < (rows - row) * 1.2);
    case 'wave':
      // A very thick, rolling sine wave
      const targetRow = cy + Math.round(Math.sin((col / cols) * Math.PI * 2) * (rows * 0.35));
      return Math.abs(row - targetRow) < 4;
    case 'zen':
      // Two distinct, massive concentric rings
      const dist = Math.sqrt(dx * dx + dy * dy);
      return (dist > 2 && dist < 5) || (dist > 8 && dist < 12);
  }
  return true;
}"""

js = js.replace(bad, good)
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Shapes patched")
