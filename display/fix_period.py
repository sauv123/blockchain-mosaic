with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("</div>.", "</div>")

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
