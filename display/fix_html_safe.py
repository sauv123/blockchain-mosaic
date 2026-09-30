with open('mosaic.html', 'r') as f:
    html = f.read()

start = html.find('<div id="massive-dashboard-stats"')
if start != -1:
    end = html.find('</div>\n    </div>', start) + 17
    old_stats = html[start:end]
    new_stats = """<div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.05em; max-width: 600px; line-height: 1.6; text-shadow: 0 4px 20px rgba(0,0,0,0.8); pointer-events: none;"></div>"""
    html = html.replace(old_stats, new_stats)
else:
    print("Not found")

audio_btn_start = html.find('<button id="audio-toggle-btn">')
if audio_btn_start != -1:
    audio_btn_end = html.find('</button>', audio_btn_start) + 9
    old_audio = html[audio_btn_start:audio_btn_end]
    new_audio = """<button id="audio-toggle-btn" title="Toggle Sonification" style="background: transparent; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 8px; margin-right: 8px; transition: color 0.2s;">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
</button>"""
    html = html.replace(old_audio, new_audio)
    
# Playback controls
playback_start = html.find('<div id="playback-controls"')
if playback_start != -1:
    playback_end = html.find('</div>', playback_start) + 6
    old_play = html[playback_start:playback_end]
    new_play = """<div id="playback-controls" class="playback-controls">
      <button id="playback-play-btn" class="playback-btn">Play</button>
      <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history">
      <span id="playback-counter" class="playback-counter">0 / 0 Blocks</span>
      <button id="generate-portrait-btn" class="playback-btn" style="margin-left: 12px; background: rgba(0, 255, 136, 0.15); border-color: #00ff88;">View Portrait</button>
    </div>"""
    html = html.replace(old_play, new_play)

with open('mosaic.html', 'w') as f:
    f.write(html)
print("Safely replaced HTML.")
