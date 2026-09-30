import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make the floor material color explicitly white/grey
js = js.replace("color: 0x00ff88,", "color: 0xffffff, // Force white tiles")

# Remove the theme logic that overrides the floor color
target_floor_color = """      if (window.currentThemeObj && window.currentThemeObj.accent) {
          window.xrGridHelper.material.color.setStyle(window.currentThemeObj.accent).multiplyScalar(intensity);
      }"""
repl_floor_color = """      // Keep floor white/grey for better contrast, only pulsing brightness
      window.xrGridHelper.material.color.setHex(0xffffff).multiplyScalar(intensity * 1.5);"""
js = js.replace(target_floor_color, repl_floor_color)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied white floor!")
