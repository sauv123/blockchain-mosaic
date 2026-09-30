import re

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = html.replace('value="monochrome"', 'value="electricBlue"')
with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Rename monochrome in PALETTES
js = js.replace('monochrome: {', 'electricBlue: {')

# 2. Update the colors for electricBlue to be extremely vibrant/neon
old_monochrome_palette = r"'electricBlue': \{\s*'Plain Transfer': 'hsl\(220, 75%, 45%\)', [^\}]+\}"
new_electric_blue = """'electricBlue': {
    'Plain Transfer': 'hsl(215, 100%, 55%)', 
    'Token Swap': 'hsl(190, 100%, 50%)',
    'NFT Mint': 'hsl(230, 100%, 65%)',
    'Contract Call': 'hsl(200, 100%, 45%)',
    'Staking': 'hsl(215, 100%, 65%)',
    'default': 'hsl(215, 100%, 55%)'
  }"""
if re.search(old_monochrome_palette, js):
    js = re.sub(old_monochrome_palette, new_electric_blue, js)

# 3. Strip out the hardcoded monochrome overrides
js = re.sub(r'if \(currentPalette === \'monochrome\'\) \{\s*baseColor = theme\.accent;\s*\}', '', js)
js = re.sub(r'let baseColor = currentPalette === \'monochrome\' \? theme\.accent : PALETTES\[currentPalette\]\[domCat\];', "let baseColor = PALETTES[currentPalette][domCat];", js)
js = re.sub(r'if \(currentPalette === \'monochrome\'\) \{\s*const theme = THEMES\[currentTheme\];\s*syncBodyTheme\(\);\s*baseColor = theme\.accent;\s*\}', '', js)

# 4. In updateRatioBarColors
old_ratio = r"if \(currentPalette === 'monochrome'\) \{[\s\S]*?\} else \{"
new_ratio = "if (false) {\n} else {"
js = re.sub(old_ratio, new_ratio, js)

# 5. In updateLegend
old_legend = r"if \(currentPalette === 'monochrome'\) \{[\s\S]*?\} else \{"
new_legend = "if (false) {\n} else {"
js = re.sub(old_legend, new_legend, js)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Electric Blue fixed.")
