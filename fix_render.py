import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add the render call to the end of updateXRInteraction
if "xrRenderer.render(xrScene, xrCamera);" not in js:
    old_code = "if (audioBtn) audioBtn.click();\n       }\n    }\n  });"
    new_code = "if (audioBtn) audioBtn.click();\n       }\n    }\n  });\n\n  xrRenderer.render(xrScene, xrCamera);"
    js = js.replace(old_code, new_code)
    
with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added render call!")
