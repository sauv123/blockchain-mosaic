import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix warmGray -> Stark White
old_warm = """  warmGray: {
    bg: '#c8c6c0',
    tileBg: '#bdbcba',
    accent: 'hsl(220, 75%, 45%)',
    text: '#222220',
    gridLine: 'rgba(34, 34, 32, 0.12)',
    accentLight: '#ffffff',
    graphNode: '#3b6fd4',
    graphText: '#222220'
  }"""
new_warm = """  warmGray: {
    bg: '#ffffff',
    tileBg: '#f2f2f7',
    accent: 'hsl(220, 85%, 50%)',
    text: '#1c1c1e',
    gridLine: 'rgba(0, 0, 0, 0.05)',
    accentLight: '#ffffff',
    graphNode: '#007aff',
    graphText: '#1c1c1e'
  }"""
js = js.replace(old_warm, new_warm)

# Fix electricBlue -> Make it pop (assuming it exists in PALETTES)
# We need to find the electric blue palette in PALETTES constant
if "'electricBlue'" in js:
    # It might be in PALETTES
    pass

# Let's dynamically find and replace Electric Blue colors if they exist in PALETTES
blue_palette = """
  'electricBlue': {
    'Plain Transfer': 'hsl(210, 100%, 55%)',
    'Token Swap': 'hsl(190, 100%, 50%)',
    'NFT Mint': 'hsl(230, 100%, 65%)',
    'Smart Contract': 'hsl(200, 100%, 45%)',
    'default': 'hsl(210, 100%, 50%)'
  }
"""
# If the user has a palette called electricBlue, let's just forcefully inject/override it in PALETTES
if "const PALETTES = {" in js:
    # Just to be safe, replace an existing electricBlue or add it
    if "'electricBlue': {" in js:
        js = re.sub(r"'electricBlue': \{[^\}]+\}", blue_palette.strip(), js)
    else:
        js = js.replace("const PALETTES = {", "const PALETTES = {\n" + blue_palette)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Palettes fixed.")
