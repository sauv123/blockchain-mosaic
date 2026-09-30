import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """  historicalDayNumber = dayNum;
  
  const category = getCategoryForDay(dayNum);"""

good = """  historicalDayNumber = dayNum;
  renderScale = 'MICRO'; // Always start day playback in subpixel view
  
  const category = getCategoryForDay(dayNum);"""

if bad in js:
    js = js.replace(bad, good)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Historical reset fixed")
