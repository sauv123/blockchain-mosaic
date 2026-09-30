import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<h1>/trace</h1>', '<h1 style="text-transform: lowercase !important;">/trace</h1>')

html = re.sub(r'mosaic\.js\?v=\d+', 'mosaic.js?v=' + str(int(__import__('time').time())), html)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Lowercase forced")
