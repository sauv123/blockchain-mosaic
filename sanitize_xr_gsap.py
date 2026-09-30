import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_until = None

for i, line in enumerate(lines):
    # If it's a GSAP call operating on an xr object, we neutralize it
    if "gsap" in line and ("window.xrGridHelper" in line or "xrScene" in line or "window.xrNotifHUD" in line or "xrBlockMesh" in line):
        # We can just comment it out
        new_lines.append("// [SANITIZED GSAP FOR WEBXR]: " + line.strip() + "\n")
        
        # If it's the start of a multi-line GSAP call, we need to comment out the rest too
        # But this is hard without a full parser. A simpler way is to just do a blanket regex on the string.
        pass
    else:
        new_lines.append(line)

# Wait, regex is safer for multi-line replacements. Let's do it on the full string.
