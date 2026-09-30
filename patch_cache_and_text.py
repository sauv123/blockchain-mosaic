import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Bust cache
html = html.replace('src="mosaic.js"', 'src="mosaic.js?v=' + str(int(__import__('time').time())) + '"')
html = html.replace('href="style.css"', 'href="style.css?v=' + str(int(__import__('time').time())) + '"')
html = html.replace('href="refined_theme.css"', 'href="refined_theme.css?v=' + str(int(__import__('time').time())) + '"')

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Cache busted")
