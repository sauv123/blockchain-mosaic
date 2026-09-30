import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"window\.xrBillboard\.position\.set\(.*?\);\s*window\.xrBillboard\.lookAt\(0, 1\.6, 0\);"
repl = """window.xrBillboard.position.set(7.5, 1.6, -1.0); 
  window.xrBillboard.lookAt(0, 1.6, 0);"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Moved billboard IN FRONT of the 10m cylinder radius!")
