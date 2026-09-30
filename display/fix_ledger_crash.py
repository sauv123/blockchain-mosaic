import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = "${PALETTES.classic[typeKey]}"
new_color = "${PALETTES[currentPalette][typeKey]}"

if target in js:
    js = js.replace(target, new_color)
    print("Fixed ledger tooltip crash.")
else:
    print("Not found.")

with open('mosaic.js', 'w') as f:
    f.write(js)
