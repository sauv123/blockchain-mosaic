import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "vrTooltipCtx.roundRect(0, 0, 512, 256, 16);"
repl = "vrTooltipCtx.rect(0, 0, 512, 256);"
js = js.replace(target, repl)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Removed roundRect!")
