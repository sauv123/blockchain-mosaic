import sys

with open('mosaic.html', 'r') as f:
    html = f.read()

target = """<div class="calendar-container">"""
new_content = """<div class="calendar-container">
      <div style="display: flex; gap: 16px; margin-bottom: 24px; font-family: 'Space Mono', monospace; font-size: 11px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
        <div>
          <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; opacity: 0.7;">This Month (Live)</div>
          <div style="color: var(--text-primary); font-size: 14px; font-weight: bold;">14.2M Txs <span style="font-weight: 300; margin-left: 6px;">$18.4B</span></div>
        </div>
        <div style="border-left: 1px solid var(--border-color); padding-left: 16px;">
          <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; opacity: 0.7;">Last Month</div>
          <div style="color: var(--text-primary); font-size: 14px; font-weight: bold;">42.1M Txs <span style="font-weight: 300; margin-left: 6px;">$51.2B</span></div>
        </div>
      </div>"""

if target in html:
    html = html.replace(target, new_content)
    print("Injected monthly summary.")
else:
    print("Target not found.")

with open('mosaic.html', 'w') as f:
    f.write(html)
