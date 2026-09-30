import re

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add the Hour display to the playback controls
old_controls = r'<div class="playback-controls">([\s\S]*?)<input type="range" id="playback-progress"'
new_controls = r'<div class="playback-controls">\1<span id="playback-hour-display" style="font-family: \'Space Mono\', monospace; font-size: 11px; color: #00ff88; margin-right: 15px; font-weight: bold; width: 80px; display: inline-block;">00:00</span>\n        <input type="range" id="playback-progress"'

if 'playback-hour-display' not in html:
    html = re.sub(old_controls, new_controls, html)
    with open('display/mosaic.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
print("UI patched")
