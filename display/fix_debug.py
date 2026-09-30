with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("""  console.log("parseUrlParameters: theme param is", theme);""", "")
js = js.replace("""    console.log("parseUrlParameters: set currentTheme to", currentTheme);""", "")

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
