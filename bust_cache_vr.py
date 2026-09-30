import re
import time

with open('display/vr.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Make sure vr.js uses cache busting
if "vr.js?v=" in html:
    html = re.sub(r'vr\.js\?v=\d+', f'vr.js?v={int(time.time())}', html)
else:
    html = html.replace('vr.js', f'vr.js?v={int(time.time())}')

with open('display/vr.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Busted cache for vr.html!")
