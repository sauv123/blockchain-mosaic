import re

with open('display/vr.html', 'r', encoding='utf-8') as f:
    html = f.read()

target_guide = '<button class="guide-close-btn" id="guide-close-btn" aria-label="Close Guide">&times;</button>'
repl_guide = '<button class="guide-close-btn" id="guide-close-btn" style="padding: 10px 20px; font-weight: bold; background: #00ff88; color: #000; border: none; border-radius: 4px; cursor: pointer;">&larr; BACK TO DASHBOARD</button>'
html = html.replace(target_guide, repl_guide)

with open('display/vr.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed UX!")
