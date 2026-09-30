import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the broken dynamicGutter injections
js = re.sub(r'let dynamicGutter = gutter;\s*if \(currentMode === \'HISTORICAL\'\) \{\s*dynamicGutter = getDynamicGutter\(getDailyIntensity\(historicalDayNumber\)\);\s*\}', '', js)
js = re.sub(r'let dynamicGutter = gutter;\s*if \(currentMode === \'HISTORICAL\'\) \{\s*dynamicGutter = getDynamicGutter\(getDailyIntensity\(historicalDayNumber\)\);\s*\}', '', js) # Just in case

# Fix any stray tileSize - dynamicGutter in exportSVG
js = js.replace('tileSize - dynamicGutter', 'tileSize - gutter')

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Calendar crash fixed.")
