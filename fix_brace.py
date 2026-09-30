import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add the missing brace right after ctx.restore(); inside MICRO
bad = "    });\n    ctx.restore();\n"
good = "    });\n    ctx.restore();\n  }\n"
js = js.replace(bad, good)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Brace fixed")
