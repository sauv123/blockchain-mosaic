import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the wrapper with a simple unconditional execution
target = r"if \(typeof window\.updateBillboard === 'function'\) \{"
repl = "if (true) {"
js = js.replace(target, repl)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed logic scoping by removing the undefined function check!")
