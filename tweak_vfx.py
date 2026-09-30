import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make clouds more visible
js = js.replace("cloud.material.opacity = 0.08 - (i * 0.02);", "cloud.material.opacity = 0.25 - (i * 0.05);")
js = js.replace("cloud.position.set(0, 4.5 + i * 1.5, 0);", "cloud.position.set(0, 3.5 + i * 1.0, 0);")

# Make motes more visible
js = js.replace("size: 0.02, transparent: true, opacity: 0.5", "size: 0.04, transparent: true, opacity: 0.8")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("VFX tweaked for better visibility!")
