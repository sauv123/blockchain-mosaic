import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

inject = """
  let dynamicGutter = gutter;
  if (currentMode === 'HISTORICAL') {
    dynamicGutter = getDynamicGutter(getDailyIntensity(historicalDayNumber));
  }
"""

if "let dynamicGutter = gutter;" not in js.split("function draw(timestamp) {")[1][:200]:
    js = js.replace("function draw(timestamp) {", "function draw(timestamp) {\n" + inject)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed draw loop gutter injection")
