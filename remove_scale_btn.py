import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = """      <button id="scale-toggle-btn" style="margin-right: 15px; width: 220px; font-weight: 600; color: #00ff88; border-color: rgba(0,255,136,0.3); background: rgba(0,255,136,0.05);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
        <span id="scale-btn-text">VIEW: SOLID PORTRAIT</span>
      </button>"""

if bad in html:
    html = html.replace(bad, "")
    with open('display/mosaic.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Scale button removed")
else:
    print("Not found")
