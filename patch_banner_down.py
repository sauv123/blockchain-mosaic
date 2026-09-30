import re
with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

bad = """.historical-banner {
  position: absolute;
  top: 90px;"""
good = """.historical-banner {
  position: absolute;
  top: 120px;"""

css = css.replace(bad, good)
with open('display/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
