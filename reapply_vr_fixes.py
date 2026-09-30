import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Particles fix
js = js.replace("vertexColors: true", "vertexColors: false")

# 2. Geometry fix (Z = -5)
js = js.replace("const geometry = new THREE.CylinderGeometry(5, 5, 4.5, 80, 1, true, -Math.PI / 2, Math.PI);",
                "const geometry = new THREE.CylinderGeometry(5, 5, 4.5, 80, 1, true, Math.PI / 2, Math.PI);")
js = js.replace("map: xrTexture, transparent: true }", "map: xrTexture, transparent: true, side: THREE.DoubleSide }")

# 3. Billboard position (inside cylinder, left side)
js = js.replace("window.xrBillboard.position.set(-4.5, 1.6, -3.0);", "window.xrBillboard.position.set(-3.5, 1.6, -3.5);")

# 4. Global Variables
js = js.replace("let currentSession = null;", "let currentSession = null;\nwindow.xrActiveBlocks = [];\nlet xrHighlightMesh;")

# 5. Highlight Mesh Init
js = js.replace("xrMesh.add(window.xrHoverSound);", """xrMesh.add(window.xrHoverSound);
  const hlGeo = new THREE.PlaneGeometry(0.3, 0.3);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  xrHighlightMesh = new THREE.Mesh(hlGeo, hlMat);
  xrHighlightMesh.visible = false;
  xrScene.add(xrHighlightMesh);""")

# 6. WebXR-safe animation loop and floor animation
js = js.replace("  if (window.xrParticles) {", """
  if (window.xrActiveBlocks) {
      for (let i = window.xrActiveBlocks.length - 1; i >= 0; i--) {
          const anim = window.xrActiveBlocks[i];
          anim.progress += 0.015;
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.08;
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.08;
          anim.mesh.rotation.y += 0.05; anim.mesh.rotation.x += 0.03;
          if (anim.progress > 1.0) {
              anim.mesh.scale.multiplyScalar(0.9);
              if (anim.mesh.scale.x < 0.05) {
                  xrScene.remove(anim.mesh);
                  if (anim.mesh.geometry) anim.mesh.geometry.dispose();
                  if (anim.mesh.material) anim.mesh.material.dispose();
                  window.xrActiveBlocks.splice(i, 1);
              }
          }
      }
  }
  if (window.xrGridHelper) {
      window.xrGridHelper.position.z = (window.xrGridHelper.position.z + 0.02) % 1;
      const intensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.2;
      if (window.currentThemeObj && window.currentThemeObj.accent) {
          window.xrGridHelper.material.color.setStyle(window.currentThemeObj.accent).multiplyScalar(intensity);
      }
  }
  if (window.xrParticles) {""")

# 7. Highlight Raycaster Logic
js = js.replace("         const syntheticEvent = new MouseEvent('mousemove', {", """
         if (xrHighlightMesh) {
             xrHighlightMesh.visible = true;
             xrHighlightMesh.position.copy(hits[0].point);
             xrHighlightMesh.position.multiplyScalar(0.98); 
             xrHighlightMesh.lookAt(xrCamera.position);
             xrHighlightMesh.material.opacity = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
             if (window.currentThemeObj && window.currentThemeObj.accent) {
                 xrHighlightMesh.material.color.setStyle(window.currentThemeObj.accent);
             }
         }
         const syntheticEvent = new MouseEvent('mousemove', {""")

# 8. Hide Highlight Mesh
js = js.replace("  if (!intersected) {\n    if (typeof vrTooltipMesh !== 'undefined' && vrTooltipMesh) vrTooltipMesh.visible = false;\n  }",
                "  if (!intersected) {\n    if (typeof vrTooltipMesh !== 'undefined' && vrTooltipMesh) vrTooltipMesh.visible = false;\n    if (typeof xrHighlightMesh !== 'undefined' && xrHighlightMesh) xrHighlightMesh.visible = false;\n  }")

# 9. Manually strip out the GSAP slide animations using regex carefully
# The blocks we want to replace look like this:
# if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
# ... to the end of the block }

js = re.sub(
    r'if \(typeof THREE !== \'undefined\' && typeof xrScene !== \'undefined\' && typeof gsap !== \'undefined\'\) \{.*?\}\);.*?\}',
    r'''if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)';
                      if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      const blockGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      physicalBlock.position.set(0, -3.0, -4.5);
                      xrScene.add(physicalBlock);
                      window.xrActiveBlocks.push({mesh: physicalBlock, targetY: 1.8, targetZ: -4.8, progress: 0});
                  }''',
    js,
    flags=re.DOTALL
)

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied fixes to vr.js!")
