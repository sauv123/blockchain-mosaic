import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Force color to white
target_color = r"let colorStr = 'hsl\(210, 100%, 50%\)'; // default\s*if \(typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock\.dominant_type\) \{\s*colorStr = PALETTES\[currentPalette\]\[newBlock\.dominant_type\] \|\| PALETTES\[currentPalette\]\['default'\] \|\| colorStr;\s*\}\s*const smashColor = new THREE\.Color\(\)\.setStyle\(colorStr\);"
repl_color = """let colorStr = '#ffffff'; // Force white as requested
                      const smashColor = new THREE.Color(0xffffff);"""
js = re.sub(target_color, repl_color, js)

# 2. Exaggerate panel size
# Original: const xrGeo = new THREE.CylinderGeometry(6, 6, 4, 64, 1, true, -Math.PI / 2.5, Math.PI / 1.25);
target_panel = r"const xrGeo = new THREE\.CylinderGeometry\(6, 6, 4, 64, 1, true, -Math\.PI / 2\.5, Math\.PI / 1\.25\);"
repl_panel = "const xrGeo = new THREE.CylinderGeometry(10, 10, 7, 80, 1, true, -Math.PI / 2.5, Math.PI / 1.25);"
js = re.sub(target_panel, repl_panel, js)

# 3. Update targetZ for animation since radius is now 10 instead of 6
# targetZ: -4.8 -> targetZ: -9.5 (roughly matches radius 10)
js = js.replace("targetZ: -4.8,", "targetZ: -9.5,")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Forced white block and exaggerated panel size!")
