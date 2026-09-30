import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make the app header, archive drawer, and blend selector HUGE in VR
js = js.replace("transform: scale(1.2) translateY(20px) !important;", "transform: scale(2.0) translateY(40px) !important;")
js = js.replace("transform: scale(1.4) translateY(-50%) !important;", "transform: scale(2.5) translateY(-50%) !important;")

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Scaled UI to massive size!")
