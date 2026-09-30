import re
import time

with open('display/trace_vr.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'trace_vr\.js\?v=\d+', f'trace_vr.js?v={int(time.time())}', html)

with open('display/trace_vr.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Busted cache for trace_vr.html one more time!")
