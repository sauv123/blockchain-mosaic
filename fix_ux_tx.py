import re

with open('display/vr.html', 'r', encoding='utf-8') as f:
    html = f.read()

target_tx = '<button id="close-tx-inspector" class="close-tx-inspector">&times;</button>'
repl_tx = '<button id="close-tx-inspector" class="close-tx-inspector" style="padding: 10px 20px; font-weight: bold; background: #00ff88; color: #000; border: none; border-radius: 4px; cursor: pointer;">&larr; GO BACK</button>'
html = html.replace(target_tx, repl_tx)

with open('display/vr.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed TX UX!")
