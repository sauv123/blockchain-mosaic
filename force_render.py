import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove it from updateXRInteraction
js = js.replace("  xrRenderer.render(xrScene, xrCamera);\n}\n\nsetTimeout(initWebXR", "}\n\nsetTimeout(initWebXR")

# 2. Put it cleanly in the main draw loop where it belongs
target = '  if (typeof updateXRInteraction === "function") updateXRInteraction();\n}'
new_target = '  if (typeof updateXRInteraction === "function") updateXRInteraction();\n  if (typeof xrRenderer !== "undefined" && xrRenderer.xr.isPresenting) { xrRenderer.render(xrScene, xrCamera); }\n}'
js = js.replace(target, new_target)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Forced render into main draw loop!")
