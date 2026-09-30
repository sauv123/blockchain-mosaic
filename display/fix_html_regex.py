import re

with open('mosaic.html', 'r') as f:
    html = f.read()

# Replace massive stats div
pattern = re.compile(r'<div id="massive-dashboard-stats".*?</div>\s*</div>\s*</div>\s*</div>', re.DOTALL)
new_stats = """<div id="cinematic-weather-line" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.05em; max-width: 600px; line-height: 1.6; text-shadow: 0 4px 20px rgba(0,0,0,0.8); pointer-events: none;">
  <!-- JS will inject the poetic summary here -->
</div>"""

html = pattern.sub(new_stats, html)

with open('mosaic.html', 'w') as f:
    f.write(html)
print("Replaced stats via regex.")
