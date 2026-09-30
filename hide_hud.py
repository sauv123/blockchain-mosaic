import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Hide the old xrNotifHUD completely so it doesn't pop up and annoy them
target_hud = """window.xrNotifHUD.position.set(-4.5, 2.7, -3.0);"""
repl_hud = """window.xrNotifHUD.position.set(0, -100, 0); // Hide the old HUD completely"""
js = js.replace(target_hud, repl_hud)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Old HUD hidden!")
