import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = """    // Shape Culling (only for historical generative shapes)
    let isOnTemplate = true;
    if (currentMode === 'HISTORICAL') {
       const frequency = 0.1 + (historicalDayNumber % 15) * 0.015;
       const px = Math.sin(row * frequency + historicalDayNumber);
       const py = Math.cos(col * frequency - historicalDayNumber);
       isOnTemplate = (Math.sin(px + py) * Math.cos(px - py)) > cullThreshold;
    }"""

good = """    // Shape Culling (only for historical generative shapes and portraits)
    let isOnTemplate = true;
    if (currentMode === 'HISTORICAL' || currentMode === 'ART_SYNTHESIS') {
       const category = getCategoryForDay(historicalDayNumber);
       isOnTemplate = getDailyMaskAlignment(col, row, category);
    }"""

js = js.replace(bad, good)
with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Template logic patched")
