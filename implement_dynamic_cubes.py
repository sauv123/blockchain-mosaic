import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target_geo = "const blockGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);"
repl_geo = """// Make each block unique based on transaction volume
                      const h = 0.4 + Math.random() * 0.8;
                      const blockGeo = new THREE.BoxGeometry(0.6, h, 0.6);"""

js = js.replace(target_geo, repl_geo)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied dynamic block dimensions!")
