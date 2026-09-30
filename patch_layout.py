import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove the Historical Banner
bad_banner = """  <!-- Historical Banner Indicator -->
  <div id="historical-banner" class="historical-banner">
    <div class="banner-content">
      <span>Viewing Historical Portrait: <strong id="historical-date-label">July 4, 2026</strong></span>
      <button id="return-live-btn">Return to Live</button>
    </div>
  </div>"""
html = html.replace(bad_banner, "")

# 2. Fix the Playback Controls Pill
bad_pill = """    <div id="playback-controls" class="playback-controls" style="flex-direction: column; justify-content: center; align-items: center; width: auto; padding: 16px 28px; border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.1); gap: 16px;">
      <div style="display: flex; align-items: center; gap: 16px; width: 100%; justify-content: center;">
        <button id="playback-play-btn" class="playback-btn" style="width: 70px; display: flex; justify-content: center;">Play</button>
        <span id="playback-hour-display" style="font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #00ff88; letter-spacing: 0.1em; width: 45px; text-align: center;">00:00</span>
        <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history" style="width: 250px; margin: 0 10px;">
        <span id="playback-counter" class="playback-counter" style="min-width: 80px; text-align: right; opacity: 0.9; color: #ffffff; font-size: 12px; font-family: 'Space Mono', monospace; font-weight: 600;">0 / 0 Blocks</span>
      </div>
      <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.15);"></div>
      <button id="generate-portrait-btn" class="playback-btn" style="background: rgba(0, 255, 136, 0.12); border-color: rgba(0,255,136,0.4); color: #00ff88; font-weight:700; white-space: nowrap; padding: 8px 32px;">View Portrait</button>
    </div>"""

good_pill = """    <div id="playback-controls" class="playback-controls" style="flex-direction: column; justify-content: center; align-items: center; width: auto; padding: 16px 28px; border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.1); gap: 16px;">
      <div style="display: flex; align-items: center; width: 100%;">
        <div style="flex: 1; display: flex; align-items: center; gap: 16px; justify-content: flex-start;">
          <button id="playback-play-btn" class="playback-btn" style="width: 70px; display: flex; justify-content: center;">Play</button>
          <span id="playback-hour-display" style="font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #00ff88; letter-spacing: 0.1em; width: 45px; text-align: center;">00:00</span>
        </div>
        <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history" style="width: 250px; margin: 0 24px;">
        <div style="flex: 1; display: flex; align-items: center; justify-content: flex-end;">
          <span id="playback-counter" class="playback-counter" style="min-width: 80px; text-align: right; opacity: 0.9; color: #ffffff; font-size: 12px; font-family: 'Space Mono', monospace; font-weight: 600;">0 / 0 Blocks</span>
        </div>
      </div>
      <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.15);"></div>
      <div style="display: flex; gap: 16px; justify-content: center;">
        <button id="return-live-btn" class="playback-btn" style="background: rgba(255, 255, 255, 0.05); border-color: rgba(255,255,255,0.3); color: #fff; font-weight:600; white-space: nowrap; padding: 8px 32px;">Live Grid</button>
        <button id="generate-portrait-btn" class="playback-btn" style="background: rgba(0, 255, 136, 0.12); border-color: rgba(0,255,136,0.4); color: #00ff88; font-weight:700; white-space: nowrap; padding: 8px 32px;">View Portrait (P)</button>
      </div>
    </div>"""
html = html.replace(bad_pill, good_pill)

# 3. Fix the "M" in the transaction volume HTML
bad_stats = """          <span class="value" id="tx-volume">—</span>"""
good_stats = """          <span class="value" style="display:inline-block; min-width: 6ch; text-align: left;">$<span id="tx-volume">—</span>M</span>"""
html = html.replace(bad_stats, good_stats)

# 4. Remove the $ and M from the GSAP initialization if they exist
bad_stats_2 = """          <span class="value" id="tx-volume">—</span>""" # wait, I already replaced it
html = html.replace('>$<span id="tx-volume">', '><span id="tx-volume">') # Just to ensure no double $

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("HTML Layout Fixed")
