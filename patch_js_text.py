import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = "const numColor = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';"
good = "const numColor = '#ffffff';" # Always white for max contrast against the new dark radial background

js = js.replace(bad, good)

# Also fix the text shadows inside the innerHTML string!
bad2 = "text-shadow: 0 0 16px rgba(255,255,255,0.3);"
good2 = "text-shadow: 0 4px 16px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2);"

js = js.replace(bad2, good2)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("JS text patched")
