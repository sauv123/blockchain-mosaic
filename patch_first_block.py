import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"window\.simIntervalId = setInterval\(generateSimulatedBlock, 12000\);"
repl = r"window.simIntervalId = setInterval(generateSimulatedBlock, 12000);\n        generateSimulatedBlock(); // Call immediately on boot"
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Forced immediate first block so they don't wait 12 seconds!")
