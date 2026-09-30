import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove ambient layer call in draw()
js = re.sub(r'const circadianState = getCircadianState\(\);\s*applyCircadianAmbientLayer\(ctx, canvas\.width, canvas\.height, circadianState\);', '', js)

# 2. Revert sortedBlocksToRender back to blocks
# Find the temporal sorting logic in draw()
temporal_injection = r'// Apply Temporal Sorting to physically change the portrait\'s data layout\s*const cStateForSort = getCircadianState\(\);\s*const sortedBlocksToRender = getTemporalSortedBlocks\(blocks, cStateForSort\);'
js = re.sub(temporal_injection, '', js)

# 3. Replace sortedBlocksToRender iteration with blocks iteration
js = js.replace('for (let index = 0; index < sortedBlocksToRender.length; index++) {', 'for (let index = 0; index < blocks.length; index++) {')
js = js.replace('const block = sortedBlocksToRender[index];', 'const block = blocks[index];')
js = js.replace('const prevBlock = index > 0 ? sortedBlocksToRender[index - 1] : null;', 'const prevBlock = index > 0 ? blocks[index - 1] : null;')
js = js.replace('const idx = sortedBlocksToRender.indexOf(hoveredBlock);', 'const idx = blocks.indexOf(hoveredBlock);')

# 4. Remove circadian brightness dampening in drawTile()
night_dimming = r'// Circadian brightness dampening\s*const cState = getCircadianState\(\);\s*if \(cState === \'NIGHT\' && currentTheme === \'charcoal\'\) \{\s*alpha \*= 0\.40;[^\}]+\}\s*else if \(cState === \'MORNING\' && currentTheme === \'charcoal\'\) \{\s*alpha \*= 1\.3;[^\}]+\}'
js = re.sub(night_dimming, '', js)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Circadian engine and temporal sorting removed.")
