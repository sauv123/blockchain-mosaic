import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad = """  <div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: 'Outfit', sans-serif; font-weight: 300; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.05em; width: 100vw; padding: 0 20px; box-sizing: border-box; line-height: 1.6; text-shadow: 0 4px 20px rgba(0,0,0,0.8); pointer-events: none;">"""

good = """  <div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: 'Outfit', sans-serif; font-weight: 300; color: #ffffff; text-align: center; letter-spacing: 0.05em; width: 100vw; padding: 40px 20px; box-sizing: border-box; line-height: 1.6; text-shadow: 0 2px 10px rgba(0,0,0,0.9), 0 8px 30px rgba(0,0,0,0.9); pointer-events: none; background: radial-gradient(circle, rgba(10,12,16,0.7) 0%, rgba(10,12,16,0) 60%);">"""

html = html.replace(bad, good)
html = html.replace('  <div id="cinematic-weather-line" style="display: none !important;"></div>', '')

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Weather line patched")
