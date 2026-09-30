import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the broken scoped declaration
js = js.replace("let currentSession = null;\nlet vrTooltipMesh, vrTooltipCtx, vrTooltipTex;", "let currentSession = null;")

# Add it to the VERY TOP of the file
js = "let vrTooltipMesh, vrTooltipCtx, vrTooltipTex;\n" + js

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Moved vrTooltipMesh to TRUE global scope!")
