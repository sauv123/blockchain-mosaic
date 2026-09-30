import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'mosaic\.js\?v=\d+', 'mosaic.js?v=' + str(int(__import__('time').time())), html)
if 'mosaic.js"' in html:
    html = html.replace('mosaic.js"', 'mosaic.js?v=' + str(int(__import__('time').time())) + '"')

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
