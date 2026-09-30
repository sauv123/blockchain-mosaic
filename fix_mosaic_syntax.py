import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the broken comment!
js = js.replace("window.THEMES = THEMES;\n/*", "window.THEMES = THEMES;")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Removed syntax error from mosaic.js!")
