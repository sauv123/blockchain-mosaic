import re

with open('display/trace_vr.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace vr.js with trace_vr.js
html = re.sub(r'vr\.js(\?v=\d+)?', 'trace_vr.js?v=999', html)
with open('display/trace_vr.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    mjs = f.read()

mjs = mjs.replace("'vr.html'", "'trace_vr.html'")
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(mjs)

print("Renamed to trace_vr!")
