import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "let xrScene, xrCamera, xrRenderer;"
repl = "let xrScene, xrCamera, xrRenderer;\nlet vrTooltipMesh, vrTooltipCtx, vrTooltipTex;"
js = js.replace(target, repl)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Declared vrTooltipMesh globally!")
