import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad_controls = 'class="playback-controls" style="justify-content: space-between; align-items: center; width: 600px; padding: 12px 24px; border-radius: 40px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.1);"'
good_controls = 'class="playback-controls" style="justify-content: center; align-items: center; width: auto; padding: 12px 24px; border-radius: 40px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.1); gap: 16px;"'

html = html.replace(bad_controls, good_controls)

bad_inner = 'style="display: flex; align-items: center; gap: 16px; flex: 1;"'
good_inner = 'style="display: flex; align-items: center; gap: 16px;"'
html = html.replace(bad_inner, good_inner)

bad_slider = 'style="flex: 1; margin: 0 10px;"'
good_slider = 'style="width: 200px; margin: 0 10px;"'
html = html.replace(bad_slider, good_slider)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Pill layout fixed")
