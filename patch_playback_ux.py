import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = """    <div id="playback-controls" class="playback-controls">
      <button id="playback-play-btn" class="playback-btn">Play</button>
      <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history">
      <span id="playback-counter" class="playback-counter">0 / 0 Blocks</span>
      <div style="width:1px; height:20px; background:var(--border-color); opacity:0.4; margin:0 4px;"></div>
      <button id="generate-portrait-btn" class="playback-btn" style="background: rgba(0, 255, 136, 0.12); border-color: rgba(0,255,136,0.5); color: #00ff88; font-weight:600;">View Portrait</button>
    </div>"""

good = """    <div id="playback-controls" class="playback-controls" style="display: none; justify-content: space-between; align-items: center; width: 600px; padding: 12px 24px; border-radius: 40px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.1);">
      <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
        <button id="playback-play-btn" class="playback-btn" style="width: 70px; display: flex; justify-content: center;">Play</button>
        <span id="playback-hour-display" style="font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #00ff88; letter-spacing: 0.1em; width: 45px; text-align: center;">00:00</span>
        <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history" style="flex: 1; margin: 0 10px;">
        <span id="playback-counter" class="playback-counter" style="min-width: 80px; text-align: right; opacity: 0.6;">0 / 0 Blocks</span>
      </div>
      <div style="width:1px; height:24px; background: rgba(255,255,255,0.15); margin: 0 16px;"></div>
      <button id="generate-portrait-btn" class="playback-btn" style="background: rgba(0, 255, 136, 0.12); border-color: rgba(0,255,136,0.4); color: #00ff88; font-weight:700; white-space: nowrap; padding: 8px 16px;">View Portrait</button>
    </div>"""

if 'id="playback-controls"' in html:
    html = html.replace(bad, good)
    with open('display/mosaic.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("UX patched")
else:
    print("Not found")
