import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = '<option value="monochrome" selected>Classic Electric Blue</option>'
good = '<option value="electricBlue" selected>Classic Electric Blue</option>'

if bad in html:
    html = html.replace(bad, good)
    with open('display/mosaic.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Theme crash fixed")
else:
    print("Not found")
