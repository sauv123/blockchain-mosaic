import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("window.location.href = 'quest.html';", "window.location.href = 'vr.html';")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated mosaic.js to link to vr.html!")
