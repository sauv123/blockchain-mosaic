import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix the main grid geometry to properly sit at -Z (in front of the user)
target_geo = "const geometry = new THREE.CylinderGeometry(5, 5, 4.5, 80, 1, true, -Math.PI / 2, Math.PI);"
repl_geo = "const geometry = new THREE.CylinderGeometry(5, 5, 4.5, 80, 1, true, Math.PI / 2, Math.PI);"
js = js.replace(target_geo, repl_geo)

# 2. Add DoubleSide to material to guarantee visibility from inside the curve
target_mat = "const material = new THREE.MeshBasicMaterial({ map: xrTexture, transparent: true });"
repl_mat = "const material = new THREE.MeshBasicMaterial({ map: xrTexture, transparent: true, side: THREE.DoubleSide });"
js = js.replace(target_mat, repl_mat)

# 3. Position the Billboard on the far left, perfectly aligned with the grid
# The grid is at z = -5.0. Let's put the billboard at x = -5.5, z = -4.5 and angle it in
target_bb = "window.xrBillboard.position.set(-4.5, 1.6, -3.0); // Far Left side"
repl_bb = "window.xrBillboard.position.set(-5.5, 1.6, -4.0); // Far Left side, slightly forward from the grid"
js = js.replace(target_bb, repl_bb)

# 4. Ensure slide animation matches the new geometry (slides up at z = -4.8 so it's slightly in front of the -5.0 screen)
js = js.replace("physicalBlock.position.set(0, -3.0, -4.5);", "physicalBlock.position.set(0, -3.0, -4.8);")
js = js.replace("y: 1.8, z: -4.5,", "y: 1.8, z: -4.8,")

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Overhauled VR layout!")
