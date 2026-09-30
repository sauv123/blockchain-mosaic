import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the spawn coordinates to be directly in their line of sight!
js = js.replace("physicalBlock.position.set(0.0, -1.0, -2.5); // Start closer to eye level, just below floor", "physicalBlock.position.set(0.0, 0.5, -2.0); // Start at chest level, dead center")
js = js.replace("notifMesh.position.set(0, 2.5, -2.5); // Float above the spawning block", "notifMesh.position.set(0, 1.5, -2.0); // Float exactly at eye level")

# Fix the notification fade out to last much longer so they definitely see it
js = js.replace("if (anim.progress > 0.6) { // Fade out near the end", "if (anim.progress > 0.8) { // Keep visible for much longer")
js = js.replace("anim.notif.material.opacity = (1.0 - anim.progress) / 0.4;", "anim.notif.material.opacity = (1.0 - anim.progress) / 0.2;")

# Also, double check that window.xrActiveBlocks exists when we push
js = js.replace("window.xrActiveBlocks.push({", "if(!window.xrActiveBlocks) window.xrActiveBlocks = []; window.xrActiveBlocks.push({")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed block animation coordinates!")
