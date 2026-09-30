import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Change default render scale
js = re.sub(r"let renderScale = 'MICRO';", "let renderScale = 'MACRO';", js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Set default mode to MACRO (Portrait)!")
