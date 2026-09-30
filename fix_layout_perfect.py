import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. FIX HUD PLACEMENT (Attach to Camera!)
target_hud = """  window.xrNotifHUD.position.set(0, 2.5, -3); 
  xrScene.add(window.xrNotifHUD);"""
repl_hud = """  window.xrNotifHUD.position.set(0, -0.2, -1.5); // 1.5 meters directly in front of face, slightly down
  // Make it subtle and small
  window.xrNotifHUD.scale.set(0.5, 0.5, 0.5);
  xrCamera.add(window.xrNotifHUD); // Attach to camera so it follows gaze!"""
js = js.replace(target_hud, repl_hud)

# HUD Vanish ASAP
target_hud_vanish = """gsap.to(window.xrNotifHUD.scale, {x: 0, y: 0, duration: 0.3, delay: 3.5, ease: 'power2.in'});"""
repl_hud_vanish = """gsap.to(window.xrNotifHUD.scale, {x: 0, y: 0, duration: 0.3, delay: 1.5, ease: 'power2.in'}); // Vanish ASAP"""
js = js.replace(target_hud_vanish, repl_hud_vanish)

# 2. FIX GRID AND BILLBOARD LAYOUT
# User wants DOM overlay in front, Grid behind.
# DOM Overlay is natively at -z. So Grid must be at +z.
target_grid = """xrMesh.position.set(0, 1.6, 0);
  xrMesh.rotation.y = 0; // Front"""
repl_grid = """xrMesh.position.set(0, 1.6, 0);
  xrMesh.rotation.y = Math.PI; // Rotated to be behind the user (+z)"""
js = js.replace(target_grid, repl_grid)

target_bb = """window.xrBillboard.position.set(3.5, 2.0, -2.5); // Inside right
  window.xrBillboard.rotation.y = -Math.PI/4;"""
repl_bb = """window.xrBillboard.position.set(4.5, 2.0, 3.5); // Inside right of the BACK grid
  window.xrBillboard.rotation.y = Math.PI + Math.PI/4; // Facing the user from the back-right"""
js = js.replace(target_bb, repl_bb)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Attached HUD to Camera and fixed Grid/Billboard layout!")
