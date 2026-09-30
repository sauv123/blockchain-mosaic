import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "if (domTooltip && domTooltip.style.opacity > 0) {"
repl = "if (domTooltip && domTooltip.classList.contains('visible')) {"
js = js.replace(target, repl)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed tooltip visibility check!")
