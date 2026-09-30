import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'mosaic\.js\?v=\d+', 'mosaic.js?v=' + str(int(__import__('time').time())), html)
html = re.sub(r'style\.css\?v=\d+', 'style.css?v=' + str(int(__import__('time').time())), html)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
