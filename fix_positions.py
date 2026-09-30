import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Billboard Fix
js = js.replace("const bbGeo = new THREE.PlaneGeometry(6, 3); // Massive 6m x 3m billboard", "const bbGeo = new THREE.PlaneGeometry(3, 1.5); // Tidy billboard")
js = js.replace("window.xrBillboard.position.set(4.5, 1.6, -3.5); // Right side // Far Left side", "window.xrBillboard.position.set(3.5, 1.6, -1.5); // Right side, closer")
js = js.replace("window.xrBillboard.rotation.y = -Math.PI/6;", "window.xrBillboard.rotation.y = -Math.PI/4;")

# 2. Block Slide Fix
js = js.replace("physicalBlock.position.set(5.0, 1.8, -4.0);", "physicalBlock.position.set(3.5, 1.6, -1.5);")
js = js.replace("startX: 5.0,", "startX: 3.5,")
js = js.replace("targetZ: -5.0,", "targetZ: -4.8,")
js = js.replace("anim.progress += 0.015;", "anim.progress += 0.02;") # slightly faster

# 3. Simulator Speed Fix
js = js.replace("window.simIntervalId = setInterval(generateSimulatedBlock, 12000);", "window.simIntervalId = setInterval(generateSimulatedBlock, 2500);")
js = js.replace("window.simIntervalId = setInterval(generateSimulatedBlock, 3000);", "window.simIntervalId = setInterval(generateSimulatedBlock, 2500);")

# 4. Floor Grid Fix
js = js.replace("const gridHelper = new THREE.GridHelper(100, 100, 0x00ff88, 0x002211);", "const gridHelper = new THREE.GridHelper(40, 40, 0x00ff88, 0x002211);")
js = js.replace("window.xrGridHelper.position.z += 0.015;", "window.xrGridHelper.position.z -= 0.03;")
js = js.replace("if (window.xrGridHelper.position.z > 1.0) window.xrGridHelper.position.z -= 1.0;", "if (window.xrGridHelper.position.z < -1.0) window.xrGridHelper.position.z += 1.0;")

# 5. Fix Particle Animation to ensure they fall faster and more visibly
js = js.replace("positions[i] -= 0.05; // fall down", "positions[i] -= 0.15; // fall down faster")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied strict spatial and speed fixes!")
