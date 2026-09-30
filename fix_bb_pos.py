import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("window.xrBillboard.position.set(5, 2, -2); // Front-Right", "window.xrBillboard.position.set(3.5, 2.0, -2.5); // Inside right")

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Adjusted billboard position to not clip the screen!")
