import re
with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

bad = """#tx-count, #tx-volume {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  display: inline-block;
}
#tx-count { min-width: 3.5ch; text-align: center; }
#tx-volume { min-width: 4.5ch; text-align: left; }"""

good = """#ticker-count, #ticker-usd, #tx-count, #tx-volume {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  display: inline-block;
}
#ticker-count { min-width: 3.5ch; text-align: center; }
#ticker-usd { min-width: 7.5ch; text-align: left; }
"""

if bad in css:
    css = css.replace(bad, good)
    with open('display/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Fixed CSS target for ticker")
else:
    with open('display/style.css', 'a', encoding='utf-8') as f:
        f.write("\\n" + good)
    print("Appended CSS target for ticker")
