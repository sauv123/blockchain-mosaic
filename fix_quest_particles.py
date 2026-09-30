import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """    // ALWAYS MATCH PARTICLES TO GLOBAL THEME (using CSS variables)
    if (window.xrParticles) {
        const style = getComputedStyle(document.body);
        const accent = style.getPropertyValue('--accent-color').trim() || '#00ff88';"""

repl = """    // ALWAYS MATCH PARTICLES TO GLOBAL THEME
    if (window.xrParticles) {
        let accent = '#00ff88';
        if (window.currentThemeObj && window.currentThemeObj.accent) {
            accent = window.currentThemeObj.accent;
        } else if (typeof THEMES !== 'undefined' && typeof currentTheme !== 'undefined' && THEMES[currentTheme]) {
            accent = THEMES[currentTheme].accent;
        }"""
        
js = js.replace(target, repl)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Quest.js now reads global theme object perfectly!")
