import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = """    <div class="drawer-header">
      <h2>Settings & Archives</h2>
      <button id="close-drawer-btn" aria-label="Close settings drawer">&times;</button>
    </div>
    
    <div class="drawer-content">"""

good = """    <div class="drawer-header">
      <h2>Settings & Archives</h2>
      <button id="close-drawer-btn" aria-label="Close settings drawer">&times;</button>
    </div>
    
    <div class="drawer-content">
      <div class="archive-header" style="text-align: center; margin-bottom: 16px;">
        <h3 style="font-family: 'Space Mono', monospace; color: #fff; text-transform: uppercase; letter-spacing: 0.2em; font-size: 14px; margin: 0;"></h3>
      </div>"""

if bad in html:
    html = html.replace(bad, good)
    with open('display/mosaic.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Calendar month label added")
else:
    print("Not found")
