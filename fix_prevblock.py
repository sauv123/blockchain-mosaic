with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_code = "const prevBlock = index > 0 ? blocks[index - 1] : null;"
new_code = "const prevBlock = index > 0 ? sortedBlocksToRender[index - 1] : null;"
js = js.replace(old_code, new_code)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed prevBlock reference.")
