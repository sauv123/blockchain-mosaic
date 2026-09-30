import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = "document.getElementById('massive-dashboard-stats').style.display = 'none';"
new = """const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) weatherLine.style.display = 'none';"""

if target in js:
    js = js.replace(target, new)
    print("Fixed art crash.")
else:
    print("Target not found")

with open('mosaic.js', 'w') as f:
    f.write(js)
