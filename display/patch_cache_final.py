import re
with open('mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('1789641052', str(int(__import__('time').time())))

with open('mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
