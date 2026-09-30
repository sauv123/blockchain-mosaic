import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"window\.xrBillboard\.position\.set\(.*?\);\s*window\.xrBillboard\.rotation\.y = .*?;"
repl = """window.xrBillboard.position.set(8.0, 1.6, -1.5); 
  window.xrBillboard.lookAt(0, 1.6, 0);"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Forced billboard position and lookAt!")
