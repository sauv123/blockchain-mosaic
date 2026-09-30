import sys

with open('mosaic.html', 'r') as f:
    html = f.read()

# Remove the redundant audio controls at the bottom if they exist
audio_controls = """<div class="audio-controls" id="audio-controls">
      <span class="audio-icon" id="audio-toggle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      </span>
    </div>"""

if audio_controls in html:
    html = html.replace(audio_controls, "")
else:
    print("Audio controls not found (maybe they were already removed or different).")

# Inject Monthly Summaries into Archive
archive_header = """<div class="drawer-header">
      <h2>Network Archives</h2>
      <button class="close-drawer-btn" id="close-archive-btn" aria-label="Close archives">&times;</button>
    </div>
    
    <div class="drawer-content">"""

monthly_summary = """<div class="drawer-header">
      <h2>Network Archives</h2>
      <button class="close-drawer-btn" id="close-archive-btn" aria-label="Close archives">&times;</button>
    </div>
    
    <div class="drawer-content">
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
if archive_header in html:
    html = html.replace(archive_header, monthly_summary)
else:
    print("Archive header not found.")

with open('mosaic.html', 'w') as f:
    f.write(html)
print("HTML modified.")
