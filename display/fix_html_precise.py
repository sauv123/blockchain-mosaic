import sys

with open('mosaic.html', 'r') as f:
    html = f.read()

# 1. Replace Massive Stats
old_stats = """<div id="massive-dashboard-stats" class="massive-stats-overlay">
      <div class="massive-stat-group"><div class="massive-val" id="massive-tx">0</div><div class="massive-label">LIVE TRANSACTIONS</div></div>
      <div class="massive-stat-group"><div class="massive-val" id="massive-vol">$0</div><div class="massive-label">VOLUME TRANSFERRED</div></div>
      <div class="massive-stat-group"><div class="massive-val" id="massive-direct">0</div><div class="massive-label">DIRECT PAYMENTS</div></div>
    </div>"""

if old_stats in html:
    html = html.replace(old_stats, '<div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: \'Outfit\', sans-serif; font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.05em; max-width: 600px; line-height: 1.6; text-shadow: 0 4px 20px rgba(0,0,0,0.8); pointer-events: none;"></div>')
else:
    print("WARNING: Massive Stats Not found perfectly.")
    
# 2. Replace Audio Toggle
old_audio = """<button id="audio-toggle-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        Enable Audio
      </button>"""
if old_audio in html:
    html = html.replace(old_audio, '<button id="audio-toggle-btn" title="Toggle Sonification" style="background: transparent; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 8px; margin-right: 8px; transition: color 0.2s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg></button>')
else:
    print("WARNING: Audio toggle not found perfectly.")

# 3. Replace Playback Controls
old_play = """<div id="playback-controls" class="playback-controls">
      <button id="playback-play-btn" class="playback-btn">Play</button>
      <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history">
      <span id="playback-counter" class="playback-counter">0 / 0 Blocks</span>
    </div>"""
if old_play in html:
    html = html.replace(old_play, """<div id="playback-controls" class="playback-controls">
      <button id="playback-play-btn" class="playback-btn">Play</button>
      <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history">
      <span id="playback-counter" class="playback-counter">0 / 0 Blocks</span>
      <button id="generate-portrait-btn" class="playback-btn" style="margin-left: 12px; background: rgba(0, 255, 136, 0.15); border-color: #00ff88;">View Portrait</button>
    </div>""")
else:
    print("WARNING: Playback controls not found.")

with open('mosaic.html', 'w') as f:
    f.write(html)
print("Replaced precisely.")
