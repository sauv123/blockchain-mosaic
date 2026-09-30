import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = "artOverlay.style.bottom = '80px';"
good = "artOverlay.style.bottom = '180px';"
js = js.replace(bad, good)

bad_z = "artOverlay.style.zIndex = '9000';"
good_z = "artOverlay.style.zIndex = '9000';\n    artOverlay.style.background = 'radial-gradient(circle, rgba(10,12,16,0.6) 0%, rgba(10,12,16,0) 60%)';\n    artOverlay.style.padding = '40px';"
js = js.replace(bad_z, good_z)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Overlay patched")
