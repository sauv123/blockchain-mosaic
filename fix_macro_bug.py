import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the renderScale bug I accidentally introduced
js = js.replace("let renderScale = 'MACRO';", "let renderScale = 'MICRO';")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Render scale bug fixed")
