import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad = "blocks = generateMockHistoryForDate('2026-07-' + (day < 10 ? '0'+day : String(day))).slice(0, maxTiles);"
good = "blocks = generateMockHistoryForDate(selectedHistoricalDate || new Date().toISOString().split('T')[0]).slice(0, maxTiles);"

if bad in js:
    js = js.replace(bad, good)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Mock history fixed")
else:
    print("Not found")
