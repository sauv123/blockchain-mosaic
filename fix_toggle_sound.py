with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the button logic
js = js.replace("if (typeof AudioEngine !== 'undefined') AudioEngine.playUIHoverTick();", "// Sound omitted")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Removed bad sound call!")
