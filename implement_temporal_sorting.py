with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Inject the sorting function
sorting_funcs = """
// === TEMPORAL DATA ENGINE (Circadian Sorting) ===
// This physically changes the mathematical layout of the mosaic
function getTemporalSortedBlocks(blocksArray, cState) {
  // Always create a fresh shallow copy to sort without mutating the main feed
  const b = [...blocksArray];
  
  if (cState === 'MORNING') {
    // 1. Organic Growth / Category Islands
    // Sort purely by the block's dominant hue (category: NFTs, Swaps, Transfers)
    b.sort((x, y) => x.hue - y.hue);
  } else if (cState === 'AFTERNOON') {
    // 2. Chronological flow (High action, standard ticker)
    // Keep it exactly chronological
  } else if (cState === 'EVENING') {
    // 3. Value Gravity (Whales pull to the center/top)
    // Sort by Whale status and then by complexity (financial density)
    b.sort((x, y) => (y.whale_flag || 0) - (x.whale_flag || 0) || y.complexity - x.complexity);
  } else if (cState === 'NIGHT') {
    // 4. Harmonic Resonance (Gradient of complexity)
    // Sort mathematically by complexity to create a perfect, calming gradient
    b.sort((x, y) => x.complexity - y.complexity);
  }
  
  return b;
}
"""

if "function getTemporalSortedBlocks" not in js:
    js = js.replace("// === CIRCADIAN UI ENGINE (Time of Day) ===", sorting_funcs + "\n// === CIRCADIAN UI ENGINE (Time of Day) ===")


# 2. Inject the call right before the for loop
old_loop = "for (let index = 0; index < blocks.length; index++) {"
new_loop = """
  // Apply Temporal Sorting to physically change the portrait's data layout
  const cStateForSort = getCircadianState();
  const sortedBlocksToRender = getTemporalSortedBlocks(blocks, cStateForSort);

  for (let index = 0; index < sortedBlocksToRender.length; index++) {
    const block = sortedBlocksToRender[index];"""

if "sortedBlocksToRender" not in js:
    js = js.replace("for (let index = 0; index < blocks.length; index++) {\n    const block = blocks[index];", new_loop)

# 3. We also need to fix hoveredBlock lookups so tooltips don't break if the order changed.
# At line 1386 (now maybe shifted):
# const idx = blocks.indexOf(hoveredBlock);
# -> const idx = sortedBlocksToRender.indexOf(hoveredBlock);

js = js.replace("const idx = blocks.indexOf(hoveredBlock);", "const idx = sortedBlocksToRender.indexOf(hoveredBlock);")


with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Temporal Sorting Engine injected successfully.")
