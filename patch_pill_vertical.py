import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = """<div id="playback-controls" class="playback-controls" style="justify-content: center; align-items: center; width: auto; padding: 12px 24px; border-radius: 40px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.1); gap: 16px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <button id="playback-play-btn" class="playback-btn" style="width: 70px; display: flex; justify-content: center;">Play</button>
        <span id="playback-hour-display" style="font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #00ff88; letter-spacing: 0.1em; width: 45px; text-align: center;">00:00</span>
        <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history" style="width: 200px; margin: 0 10px;">
        <span id="playback-counter" class="playback-counter" style="min-width: 80px; text-align: right; opacity: 0.9; color: #ffffff; font-size: 12px; font-family: 'Space Mono', monospace; font-weight: 600;">0 / 0 Blocks</span>
      </div>
      <div style="width:1px; height:24px; background: rgba(255,255,255,0.15); margin: 0 16px;"></div>
      <button id="generate-portrait-btn" class="playback-btn" style="background: rgba(0, 255, 136, 0.12); border-color: rgba(0,255,136,0.4); color: #00ff88; font-weight:700; white-space: nowrap; padding: 8px 16px;">View Portrait</button>
    </div>"""

good = """<div id="playback-controls" class="playback-controls" style="flex-direction: column; justify-content: center; align-items: center; width: auto; padding: 16px 28px; border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.1); gap: 16px;">
      <div style="display: flex; align-items: center; gap: 16px; width: 100%; justify-content: center;">
        <button id="playback-play-btn" class="playback-btn" style="width: 70px; display: flex; justify-content: center;">Play</button>
        <span id="playback-hour-display" style="font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #00ff88; letter-spacing: 0.1em; width: 45px; text-align: center;">00:00</span>
        <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history" style="width: 250px; margin: 0 10px;">
        <span id="playback-counter" class="playback-counter" style="min-width: 80px; text-align: right; opacity: 0.9; color: #ffffff; font-size: 12px; font-family: 'Space Mono', monospace; font-weight: 600;">0 / 0 Blocks</span>
      </div>
      <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.15);"></div>
      <button id="generate-portrait-btn" class="playback-btn" style="background: rgba(0, 255, 136, 0.12); border-color: rgba(0,255,136,0.4); color: #00ff88; font-weight:700; white-space: nowrap; padding: 8px 32px;">View Portrait</button>
    </div>"""

if bad in html:
    html = html.replace(bad, good)
    with open('display/mosaic.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Vertical pill layout applied")
else:
    print("Not found")
