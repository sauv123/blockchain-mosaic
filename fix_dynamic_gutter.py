import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace all broken dynamicGutter let declarations
js = re.sub(r'let isOnTemplate = true;\s*let dynamicGutter = gutter;\s*if \(currentMode === \'HISTORICAL\'\) \{\s*const intensity = getDailyIntensity\(historicalDayNumber\);\s*isOnTemplate = getGenerativeDailyShape\(col, row, historicalDayNumber, intensity\);\s*dynamicGutter = getDynamicGutter\(intensity\);\s*\} else \{\s*dynamicGutter = gutter;\s*\}', 
            "const isOnTemplate = currentMode === 'HISTORICAL' ? getGenerativeDailyShape(col, row, historicalDayNumber, getDailyIntensity(historicalDayNumber)) : true;", js)

# We have `dynamicGutter` used everywhere, let's just make it a globally accessible var or calculate it in draw()
# Actually, the simplest fix is to calculate it ONCE at the top of the draw() loop and exportSVG function.

inject_gutter = """
  // Calculate dynamic gutter for the whole frame
  let dynamicGutter = gutter;
  if (currentMode === 'HISTORICAL') {
    dynamicGutter = getDynamicGutter(getDailyIntensity(historicalDayNumber));
  }
"""

if "let dynamicGutter = gutter;" not in js[:2000]: # avoid matching inner loops if they exist
    # Inject into draw()
    js = js.replace("function draw() {", "function draw() {\n" + inject_gutter)
    # Inject into exportSVG()
    js = js.replace("function exportSVG() {", "function exportSVG() {\n" + inject_gutter)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed dynamicGutter scoping issue.")
