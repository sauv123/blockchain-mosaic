import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """  'electricBlue': {
    'Plain Transfer': 'hsl(210, 100%, 55%)',
    'Token Swap': 'hsl(190, 100%, 50%)',
    'NFT Mint': 'hsl(230, 100%, 65%)',
    'Contract Call': 'hsl(200, 100%, 45%)',
    'default': 'hsl(210, 100%, 50%)'
  },"""

good = """  'electricBlue': {
    'Plain Transfer': '#00d2ff', // Bright Cyan
    'Token Swap': '#0044ff',     // Deep Royal Blue
    'NFT Mint': '#8a2be2',       // Purple / Blue Violet
    'Contract Call': '#ffffff',  // Crisp White
    'default': '#00b4d8'
  },"""

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Fixed electricBlue theme")
else:
    print("Not found")
