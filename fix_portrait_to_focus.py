import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Revert MACRO back to MICRO
js = re.sub(r"let renderScale = 'MACRO';", "let renderScale = 'MICRO';", js)

# 2. Add enterFocusMode on startup
# We find the end of the file or the init block and append it.
js += "\n\n// Start in Focus Mode by default as requested\nsetTimeout(() => { if(typeof enterFocusMode === 'function') enterFocusMode(); }, 1500);\n"

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Reverted to MICRO and enabled Focus Mode by default!")
