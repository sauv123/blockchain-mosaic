import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the entire window.xrGridHelper gsap block (it's repeated everywhere)
target_grid_gsap = r'gsap\.fromTo\(window\.xrGridHelper\.material\.color.*?ease: \'power2\.out\'\}\);'
js = re.sub(target_grid_gsap, '// Grid GSAP sanitized', js, flags=re.DOTALL)

target_grid_pos = r'gsap\.fromTo\(window\.xrGridHelper\.position.*?ease: \'elastic\.out\(1, 0\.3\)\'\}\n?\s*\);'
js = re.sub(target_grid_pos, '// Grid Position GSAP sanitized', js, flags=re.DOTALL)

# 2. Remove xrScene background / fog flashes
js = re.sub(r'gsap\.to\(xrScene\.background, \{.*?\}\);', '// xrScene background gsap sanitized', js)
js = re.sub(r'gsap\.to\(xrScene\.fog\.color, \{.*?\}\);', '// xrScene fog gsap sanitized', js)

# 3. Remove window.xrNotifHUD gsap
js = re.sub(r'gsap\.fromTo\(window\.xrNotifHUD\.scale, \{.*?\}\);', '// xrNotifHUD gsap sanitized', js)
js = re.sub(r'gsap\.to\(window\.xrNotifHUD\.scale, \{.*?\}\);', '// xrNotifHUD gsap sanitized', js)

# 4. Remove xrBlockMesh gsap
js = re.sub(r'gsap\.to\(window\.xrBlockMesh\.position, \{.*?\}\);', '// xrBlockMesh gsap sanitized', js, flags=re.DOTALL)

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Sanitized all VR-breaking GSAP animations!")
