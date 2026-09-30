import re

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Revert HTML
html = re.sub(r'<!-- Import maps polyfill for WebXR -->.*?</script>', '', html, flags=re.DOTALL)
html = html.replace('</head>', '</head>') # just clean up if needed

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Revert JS
js = js.replace("import * as THREE from 'three';\nimport { VRButton } from 'three/addons/webxr/VRButton.js';\nimport { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';\n\n", "")

xr_logic_pattern = r'// ============================================================================\n// META QUEST WEBXR COMPATIBILITY ENGINE.*?// === RENDER LOOP ==='
js = re.sub(xr_logic_pattern, '// === RENDER LOOP ===', js, flags=re.DOTALL)

js = js.replace('resizeCanvas();\n  window.addEventListener(\'resize\', resizeCanvas);\n  setTimeout(initWebXR, 500);', 'resizeCanvas();\n  window.addEventListener(\'resize\', resizeCanvas);')

js = js.replace('requestAnimationFrame(draw);\n  if (typeof updateXRInteraction === "function") updateXRInteraction();\n}', 'requestAnimationFrame(draw);\n}')

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Reverted mosaic.js and mosaic.html to pure 2D.")
