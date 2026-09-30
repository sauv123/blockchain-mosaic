import re
with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace the broken guide overlay CSS that I injected
broken = r"\.guide-overlay \{\s*background: rgba\(0,0,0,0\.97\) !important;\s*backdrop-filter: blur\(25px\) !important;\s*padding: 40px !important;\s*display: flex !important;\s*align-items: center !important;\s*justify-content: center !important;\s*\}"

fixed = """.guide-overlay {
  background: rgba(0,0,0,0.97) !important;
  backdrop-filter: blur(25px) !important;
  padding: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.3s !important;
}
.guide-overlay.open {
  opacity: 1 !important;
  pointer-events: auto !important;
}"""

if re.search(broken, css):
    css = re.sub(broken, fixed, css)
else:
    print("Could not find the broken CSS block!")

with open('display/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS guide fixed")
