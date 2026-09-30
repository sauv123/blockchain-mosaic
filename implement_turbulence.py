import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Locate tileShimmer calculation
old_shimmer = "const tileShimmer = Math.sin(Date.now() / 1800 + phaseShift) * 0.03 + 0.97;"

new_shimmer = """
    // Turbulence/Animation Idea based on Intensity
    let shimmerSpeed = 1800; // Moderate
    if (currentMode === 'HISTORICAL') {
       const intensity = getDailyIntensity(historicalDayNumber);
       if (intensity === 'HEAVY') shimmerSpeed = 400;   // Rapid, aggressive vibration
       if (intensity === 'LIGHT') shimmerSpeed = 4500;  // Extremely slow, calm breathing
    }
    const tileShimmer = Math.sin(Date.now() / shimmerSpeed + phaseShift) * 0.03 + 0.97;
"""

if "shimmerSpeed" not in js:
    js = js.replace(old_shimmer, new_shimmer)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Turbulence injected.")
