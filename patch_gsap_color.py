import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """            elCount.style.color = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';
            elUsd.style.color = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';"""

good = """            elCount.style.color = '#ffffff';
            elUsd.style.color = '#ffffff';"""

js = js.replace(bad, good)
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("GSAP color patched")
