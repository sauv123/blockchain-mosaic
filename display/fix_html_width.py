with open('mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_div = """<div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.05em; max-width: 600px; line-height: 1.6; text-shadow: 0 4px 20px rgba(0,0,0,0.8); pointer-events: none;">"""
new_div = """<div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: 'Outfit', sans-serif; font-weight: 300; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.05em; width: 100vw; padding: 0 20px; box-sizing: border-box; line-height: 1.6; text-shadow: 0 4px 20px rgba(0,0,0,0.8); pointer-events: none;">"""

html = html.replace(old_div, new_div)

with open('mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed HTML max-width constraints.")
