import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("xrCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);", "xrCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);\n  xrScene.add(xrCamera);")

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added xrCamera to xrScene!")
