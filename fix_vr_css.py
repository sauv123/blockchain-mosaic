import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "/* Make sure the Archive Drawer is front and center in VR, not off to the side */"
replacement = """/* Make the Blend selector large and visible */
      .blend-selector {
        transform: scale(1.4) translateY(-50%) !important;
        right: 40px !important;
        z-index: 999999 !important;
      }
      
      /* Make sure the Archive Drawer is front and center in VR, not off to the side */"""

js = js.replace(target, replacement)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed VR CSS for blend selector!")
