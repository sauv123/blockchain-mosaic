import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make charcoal default
js = js.replace("let currentTheme = 'warmGray';", "let currentTheme = 'charcoal';")

# Remove the warmGray theme dictionary if we want, or just leave it unused.
# Remove Theme Select from settings drawer
theme_select_regex = r'// Inject a Theme \(Light/Dark\) selector into the settings drawer.*?}\);.*?}\)'
js = re.sub(theme_select_regex, '', js, flags=re.DOTALL)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
