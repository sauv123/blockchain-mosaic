import re

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_btn = '<button id="archive-toggle-btn">'
new_btn = '<button id="scale-toggle-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.18); color: rgba(255,255,255,0.7); font-family: \'Space Mono\', monospace; font-size: 10px; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 4px; cursor: pointer; text-transform: uppercase; margin-right: 8px;">Grid: Micro</button>\n      <button id="archive-toggle-btn">'

if 'id="scale-toggle-btn"' not in html:
    html = html.replace(old_btn, new_btn)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
