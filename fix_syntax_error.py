import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the broken line
bad_line = "const laserMat = new THREE.LineBasicMaterial({ color: 0xffffff, // Force white tiles transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });"
fixed_line = "const laserMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });"
js = js.replace(bad_line, fixed_line)

# Let's verify if there are any other broken lines
# Find all occurrences of '// Force white tiles'
lines = js.split('\\n')
for i, line in enumerate(lines):
    if '// Force white tiles' in line and not line.strip().endswith('// Force white tiles') and not line.strip().endswith('}'):
        # Just clean up the comment from inside inline objects
        pass

# A safer way to revert all unintended '// Force white tiles'
js = js.replace(", // Force white tiles transparent", ", transparent")
js = js.replace(", // Force white tiles opacity", ", opacity")
js = js.replace(", // Force white tiles side", ", side")
js = js.replace(", // Force white tiles blending", ", blending")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed syntax error!")
