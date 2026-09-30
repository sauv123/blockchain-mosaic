with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the missing comma
js = js.replace("'default': 'hsl(210, 100%, 50%)'\n  }\n  'spectrum':", "'default': 'hsl(210, 100%, 50%)'\n  },\n  'spectrum':")

# Just in case it was injected before another key
js = js.replace("  }\n  '", "  },\n  '")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Comma fixed.")
