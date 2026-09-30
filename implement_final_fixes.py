import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the Ghost Aura Panel
js = re.sub(
    r'const auraMat =.*?xrScene\.add\(auraMesh\);',
    '// Removed Aura mesh per user request to remove the panel behind the main panel.',
    js,
    flags=re.DOTALL
)

# 2. Fix the Billboard Panel Position (Right side, completely separate)
js = js.replace("window.xrBillboard.position.set(-3.5, 1.6, -3.5);", "window.xrBillboard.position.set(4.5, 1.6, -3.5); // Right side")
js = js.replace("window.xrBillboard.rotation.y = Math.PI/6;", "window.xrBillboard.rotation.y = -Math.PI/6; // Face inward from the right")

# 3. Enhance Floor Animation
target_floor = """  if (window.xrGridHelper) {
      window.xrGridHelper.position.z = (window.xrGridHelper.position.z + 0.02) % 1;"""
repl_floor = """  if (window.xrGridHelper) {
      window.xrGridHelper.position.z += 0.015;
      if (window.xrGridHelper.position.z > 1.0) window.xrGridHelper.position.z -= 1.0;"""
js = js.replace(target_floor, repl_floor)

# 4. Fix Particles Theme Application
target_particles = """              if (window.currentThemeObj && window.currentThemeObj.accent) {
                 xrHighlightMesh.material.color.setStyle(window.currentThemeObj.accent);
             }"""
repl_particles = """              if (window.currentThemeObj && window.currentThemeObj.accent) {
                 xrHighlightMesh.material.color.setStyle(window.currentThemeObj.accent);
                 xrHighlightMesh.material.needsUpdate = true;
             }"""
js = js.replace(target_particles, repl_particles)

target_particles2 = """      const tColor = new THREE.Color().setStyle(accent);
      window.xrParticles.material.color = tColor;"""
repl_particles2 = """      const tColor = new THREE.Color().setStyle(accent);
      window.xrParticles.material.color = tColor;
      window.xrParticles.material.needsUpdate = true;"""
js = js.replace(target_particles2, repl_particles2)

# 5. Fix Horizontal Slide Animation
target_anim = """                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      physicalBlock.position.set(0, -3.0, -4.5);
                      xrScene.add(physicalBlock);
                      window.xrActiveBlocks.push({mesh: physicalBlock, targetY: 1.8, targetZ: -4.8, progress: 0});"""
                      
repl_anim = """                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      // Start horizontally on the far right
                      physicalBlock.position.set(5.0, 1.8, -4.0);
                      xrScene.add(physicalBlock);
                      window.xrActiveBlocks.push({
                          mesh: physicalBlock, 
                          startX: 5.0,
                          targetX: 0.0,
                          targetY: 1.8, 
                          targetZ: -5.0, 
                          progress: 0
                      });"""
js = js.replace(target_anim, repl_anim)

target_lerp = """          anim.progress += 0.015;
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.08;
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.08;"""
repl_lerp = """          anim.progress += 0.015;
          anim.mesh.position.x += (anim.targetX - anim.mesh.position.x) * 0.08;
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.08;
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.08;"""
js = js.replace(target_lerp, repl_lerp)

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied 3D fixes!")
