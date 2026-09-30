with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add renderScale globally if it doesn't exist
if "let renderScale = 'MICRO';" not in js:
    js = "let renderScale = 'MICRO';\n" + js

# Fix the audio bug
js = js.replace("if (typeof audio !== 'undefined') audio.playUIHoverTick();", "if (typeof AudioEngine !== 'undefined') AudioEngine.playUIHoverTick();")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed renderScale and audio!")
