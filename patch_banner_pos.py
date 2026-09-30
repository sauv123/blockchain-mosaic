import re
with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

bad = """  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;"""

good = """  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  border-radius: 30px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  padding: 8px 16px;
  z-index: 1000;"""

if '.historical-banner {' in css:
    css = css.replace(bad, good)
    with open('display/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Banner position patched")
