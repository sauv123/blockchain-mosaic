import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"if \(window\.xrParticles\) \{.*?needsUpdate = true;\n\s+\}"
repl = """if (window.xrRainMeshes && window.currentThemeObj) {
      window.xrRainMeshes.forEach(mesh => {
          const color = new THREE.Color();
          for (let i = 0; i < mesh.count; i++) {
              mesh.getColorAt(i, color);
              // Only tint the colored ones, leave white ones white
              if (color.r !== 1.0 || color.g !== 1.0 || color.b !== 1.0) {
                  color.setStyle(window.currentThemeObj.accent);
                  mesh.setColorAt(i, color);
              }
          }
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
  }"""
js = re.sub(target, repl, js, flags=re.DOTALL)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed theme sync for rain!")
