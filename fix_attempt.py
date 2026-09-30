import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"\}\)\.catch\(e => console\.error\('ETH RPC Error:', e\)\);\n\s*\}\n\s*if \(\!window\.simIntervalId\) \{"
repl = r"if (!window.simIntervalId) {"
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed attemptNextConnection syntax!")
