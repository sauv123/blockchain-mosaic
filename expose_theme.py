import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("let currentTheme = 'matrix';", "let currentTheme = 'matrix';\nwindow.currentTheme = currentTheme;")
js = js.replace("const THEMES = {", "const THEMES = {\n  matrix: { bg: '#000000', text: '#00ff00', gridLine: '#003300', accent: '#00ff88', glow: '#00ff88' },\n  charcoal: { bg: '#14140f', text: '#ffffff', gridLine: '#2b2b25', accent: '#3b6fd4', glow: '#3b6fd4' },\n  warmGray: { bg: '#dbdad5', text: '#222220', gridLine: '#c2c1bb', accent: '#c95e38', glow: '#c95e38' },\n  monochrome: { bg: '#ffffff', text: '#000000', gridLine: '#e0e0e0', accent: '#000000', glow: '#000000' }\n};\nwindow.THEMES = THEMES;\n/*")

# Wait, let's just append it to the end of mosaic.js to be absolutely safe!
# Actually, the theme toggle function:
target_toggle = """function applyThemeStyles() {"""
repl_toggle = """function applyThemeStyles() {
  window.currentTheme = currentTheme;
  window.currentThemeObj = THEMES[currentTheme];"""
js = js.replace(target_toggle, repl_toggle)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Exposed theme to window!")
