import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace opacity: 0 with opacity: 0.001 to prevent the Quest Browser from culling the canvas render
old_css = "#mosaic-canvas { opacity: 0 !important; pointer-events: none !important; }"
new_css = "#mosaic-canvas { opacity: 0.001 !important; pointer-events: none !important; }"
js = js.replace(old_css, new_css)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed canvas culling!")
