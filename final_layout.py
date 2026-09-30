import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Main Grid: IN FRONT! (Rotation = 0, z = -2 offset)
js = js.replace("xrMesh.position.set(0, 1.6, 0);\n  xrMesh.rotation.y = Math.PI; // Rotated to be behind the user (+z)", "xrMesh.position.set(0, 1.6, -1.0);\n  xrMesh.rotation.y = 0; // Directly in front!")

# 2. Billboard: LEFT SIDE with spacing
js = js.replace("window.xrBillboard.position.set(4.5, 2.0, 3.5); // Inside right of the BACK grid\n  window.xrBillboard.rotation.y = Math.PI + Math.PI/4; // Facing the user from the back-right", "window.xrBillboard.position.set(-4.5, 1.6, -3.0); // Far Left side\n  window.xrBillboard.rotation.y = Math.PI/6; // Angled inward from the left")

# 3. Notification HUD: Put it directly ABOVE the Live Stats panel!
target_hud = """  window.xrNotifHUD.position.set(0, -0.2, -1.5); // 1.5 meters directly in front of face, slightly down
  // Make it subtle and small
  window.xrNotifHUD.scale.set(0.5, 0.5, 0.5);
  xrCamera.add(window.xrNotifHUD); // Attach to camera so it follows gaze!"""
repl_hud = """  window.xrNotifHUD.position.set(-4.5, 2.7, -3.0); // Hovering directly above the Live Stats panel
  window.xrNotifHUD.rotation.y = Math.PI/6; // Same angle as stats panel
  xrScene.add(window.xrNotifHUD);"""
js = js.replace(target_hud, repl_hud)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Layout strictly set to FRONT and LEFT!")
