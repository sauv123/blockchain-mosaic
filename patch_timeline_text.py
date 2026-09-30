import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = """<span id="playback-counter" class="playback-counter" style="min-width: 80px; text-align: right; opacity: 0.6;">0 / 0 Blocks</span>"""
good = """<span id="playback-counter" class="playback-counter" style="min-width: 80px; text-align: right; opacity: 0.9; color: #ffffff; font-size: 12px; font-family: 'Space Mono', monospace; font-weight: 600;">0 / 0 Blocks</span>"""

html = html.replace(bad, good)
with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Timeline text patched")
