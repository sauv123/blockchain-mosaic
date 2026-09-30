import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = 'id="playback-controls" class="playback-controls" style="display: none; justify-content: space-between;'
good = 'id="playback-controls" class="playback-controls" style="justify-content: space-between;'

html = html.replace(bad, good)
with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Inline display removed")
