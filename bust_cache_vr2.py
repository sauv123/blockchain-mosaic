import re
import time

with open('display/vr.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'vr\.js\?v=\d+', f'vr.js?v={int(time.time())}', html)

with open('display/vr.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Busted cache for vr.html again!")
