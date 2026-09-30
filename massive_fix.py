import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the duplicate broken electricBlue
bad_eb = r"  electricBlue: \{\s*'Plain Transfer': 'hsl\(220, 75%, 45%\)',[\s\S]*?'default': 'hsl\(220, 75%, 45%\)'\s*\}"
js = re.sub(bad_eb, "", js)

# 2. Fix MACRO mode counts array
macro_broken = r"const counts = \{'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Contract Creation': 0, 'Staking': 0\};"
macro_fixed = "const counts = {'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Contract Call': 0, 'Staking': 0};"
js = js.replace(macro_broken, macro_fixed)

# 3. Fix the opacity issue. When MACRO mode draws solid colors, maskModifier can be 0.05.
# But solid colors should be fully visible if they survive the cull. 
# In MACRO, we WANT it to be a beautiful solid color portrait. If maskModifier is 0.05, they turn gray!
alpha_broken = r"const maskModifier = isOnTemplate \? 1\.0 : 0\.05;\s*ctx\.globalAlpha = maskModifier \* \(isDimmed \? 0\.1 : 1\.0\);"
alpha_fixed = "const maskModifier = isOnTemplate ? 1.0 : 0.05;\n    ctx.globalAlpha = maskModifier * (isDimmed ? 0.1 : 1.0);\n    if (!isOnTemplate) { ctx.restore(); return; } // Completely hide culled blocks in MACRO for a sharp portrait shape\n    ctx.globalAlpha = isDimmed ? 0.1 : 1.0;"
js = re.sub(alpha_broken, alpha_fixed, js)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 4. Remove the massive annoying cinematic text overlay
html = html.replace('<div id="cinematic-weather-line"', '<div id="cinematic-weather-line" style="display: none !important;"')

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Massive fixes applied")
