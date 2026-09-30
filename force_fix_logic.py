import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"if \(typeof window\.updateBillboard === 'function'\) \{"
repl = "if (true) {"
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Actually fixed logic scoping this time using re.sub!")
