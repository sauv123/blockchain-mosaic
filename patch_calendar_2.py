import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = '<div class="calendar-grid" id="calendar-days-grid">'
good = """      <div class="archive-header" style="text-align: center; margin: 16px 0;">
        <h3 style="font-family: 'Space Mono', monospace; color: #fff; text-transform: uppercase; letter-spacing: 0.2em; font-size: 14px; margin: 0;"></h3>
      </div>
      <div class="calendar-grid" id="calendar-days-grid">"""

if bad in html:
    html = html.replace(bad, good)
    with open('display/mosaic.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Month label added")
else:
    print("Not found")
