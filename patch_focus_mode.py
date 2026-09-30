import re
with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

bad = """body.focus-mode .app-header,
body.focus-mode .app-footer,
body.focus-mode #historical-banner,
body.focus-mode .archive-drawer,
body.focus-mode .details-sidebar {"""

good = """body.focus-mode .app-header,
body.focus-mode .app-footer,
body.focus-mode #historical-banner,
body.focus-mode .archive-drawer,
body.focus-mode .details-sidebar,
body.focus-mode .playback-controls,
body.focus-mode #art-synthesis-overlay {"""

if bad in css:
    css = css.replace(bad, good)
    with open('display/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Focus mode patched")
else:
    print("Focus mode not found")
