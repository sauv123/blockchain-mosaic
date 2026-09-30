import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Strip it from the broken scoped location
js = js.replace("let currentSession = null;\nwindow.xrActiveBlocks = [];\nlet xrHighlightMesh;", "let currentSession = null;\nwindow.xrActiveBlocks = [];")

# Add it to the TRUE global scope at the top of the file alongside the tooltip variables
js = js.replace("let vrTooltipMesh, vrTooltipCtx, vrTooltipTex;", "let vrTooltipMesh, vrTooltipCtx, vrTooltipTex;\nlet xrHighlightMesh;")

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Moved xrHighlightMesh to true global scope!")
