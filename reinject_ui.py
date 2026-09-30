import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Inject the missing MACRO toggle button in the header
header_bad = """      <button id="archive-toggle-btn" aria-expanded="false" aria-controls="archive-drawer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>
        Settings & Archives
      </button>"""

header_good = """      <button id="scale-toggle-btn" style="margin-right: 15px; width: 220px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
        <span id="scale-btn-text">VIEW: INDIVIDUAL PAYMENTS</span>
      </button>

      <button id="archive-toggle-btn" aria-expanded="false" aria-controls="archive-drawer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>
        Settings & Archives
      </button>"""

if 'scale-toggle-btn' not in html:
    html = html.replace(header_bad, header_good)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("UI elements re-injected")
