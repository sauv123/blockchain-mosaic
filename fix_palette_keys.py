import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = "'Smart Contract': 'hsl(200, 100%, 45%)',"
good = "'Contract Call': 'hsl(200, 100%, 45%)',"

if bad in js:
    js = js.replace(bad, good)
    
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Palette keys fixed")
