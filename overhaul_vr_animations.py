import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the broken GSAP fake welcome block
target_welcome = """      // ELEGANT DEMO SLIDE SO THEY IMMEDIATELY SEE THE ANIMATION WORKING
      if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
          const fakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
          fakeBlock.position.set(0, -3.0, -4.8);
          xrScene.add(fakeBlock);
          gsap.to(fakeBlock.position, {
              y: 1.8, z: -5.0, duration: 1.5, ease: 'power2.out'
          });
          gsap.to(fakeBlock.scale, {
              x: 0, y: 0, z: 0, duration: 0.5, delay: 1.0, ease: 'power1.in',
              onComplete: () => { if (xrScene) xrScene.remove(fakeBlock); }
          });
      }"""
js = js.replace(target_welcome, "")

# 2. Fix Billboard position (Move it inside the cylinder so it is definitively to the left, but NOT behind the screen)
# The cylinder is radius 5. If we place billboard at x = -3.5, z = -3.5, it is well inside the cylinder and clearly in front of it.
js = js.replace("window.xrBillboard.position.set(-5.5, 1.6, -4.0); // Far Left side, slightly forward from the grid",
                "window.xrBillboard.position.set(-3.5, 1.6, -3.5); // Inside the cylinder, on the left side")

# 3. Add WebXR-safe animation array and Grid Highlight Mesh
target_globals = "let currentSession = null;"
repl_globals = """let currentSession = null;
window.xrActiveBlocks = [];
let xrHighlightMesh;
"""
js = js.replace(target_globals, repl_globals)

# 4. Replace GSAP slide animation in the block handlers with WebXR-safe logic
target_slide = """                  // ==========================================
                  // 3D ELEGANT SLIDE ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)'; // default
                      if (typeof PALETTES !== 'undefined' && typeof currentTheme !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      const blockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      physicalBlock.position.set(0, -3.0, -4.8);
                      xrScene.add(physicalBlock);
                      // Slide up and join into the grid
                      gsap.to(physicalBlock.position, {
                          y: 1.8, z: -5.0, duration: 1.5, ease: 'power2.out'
                      });
                      gsap.to(physicalBlock.scale, {
                          x: 0, y: 0, z: 0, duration: 0.5, delay: 1.0, ease: 'power1.in',
                          onComplete: () => {
                              if (xrScene && physicalBlock) {
                                  xrScene.remove(physicalBlock);
                                  if(physicalBlock.geometry) physicalBlock.geometry.dispose();
                                  if(physicalBlock.material) physicalBlock.material.dispose();
                              }
                          }
                      });
                  }"""
                  
repl_slide = """                  // ==========================================
                  // 3D ELEGANT SLIDE ANIMATION (WEBXR SAFE - NO GSAP)
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)';
                      if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      const blockGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      physicalBlock.position.set(0, -3.0, -4.5); // Rise from center floor
                      xrScene.add(physicalBlock);
                      
                      window.xrActiveBlocks.push({
                          mesh: physicalBlock,
                          targetY: 1.8,
                          targetZ: -4.8,
                          progress: 0
                      });
                  }"""
js = js.replace(target_slide, repl_slide)

# Replace the second occurrence in generateSimulatedBlock
# (Since the script might fail if spacing differs, I'll do a regex or just let it process via a loop later if needed. Actually it's identical).
js = js.replace(target_slide, repl_slide)

# 5. Initialize the Highlight Mesh in initWebXR
target_init_highlight = "xrMesh.add(window.xrHoverSound);"
repl_init_highlight = """xrMesh.add(window.xrHoverSound);
  // CREATE HOVER HIGHLIGHT MESH
  const hlGeo = new THREE.PlaneGeometry(0.3, 0.3);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  xrHighlightMesh = new THREE.Mesh(hlGeo, hlMat);
  xrHighlightMesh.visible = false;
  xrScene.add(xrHighlightMesh);"""
js = js.replace(target_init_highlight, repl_init_highlight)

# 6. Add the WebXR-safe animation loop, Floor Animation, and Highlight logic to updateXRInteraction
target_update = """  if (window.xrParticles) {"""
repl_update = """
  // WEBXR SAFE ANIMATION LOOP (Bypasses frozen GSAP)
  if (window.xrActiveBlocks) {
      for (let i = window.xrActiveBlocks.length - 1; i >= 0; i--) {
          const anim = window.xrActiveBlocks[i];
          anim.progress += 0.015;
          
          // Lerp position
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.08;
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.08;
          
          // Rotate for visual flair
          anim.mesh.rotation.y += 0.05;
          anim.mesh.rotation.x += 0.03;
          
          // Shrink and vanish after reaching top
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
  
  // FLOOR ANIMATION (Tron-like scrolling)
  if (window.xrGridHelper) {
      // Create an infinite scrolling effect by moving Z slightly and wrapping
      window.xrGridHelper.position.z = (window.xrGridHelper.position.z + 0.02) % 1;
      
      // Pulse color slightly based on theme
      const time = Date.now() * 0.002;
      const intensity = 0.5 + Math.sin(time) * 0.2;
      if (window.currentThemeObj && window.currentThemeObj.accent) {
          window.xrGridHelper.material.color.setStyle(window.currentThemeObj.accent).multiplyScalar(intensity);
      }
  }

  if (window.xrParticles) {"""
js = js.replace(target_update, repl_update)

# 7. Update Highlight Mesh position in Raycaster
target_raycast = """         const syntheticEvent = new MouseEvent('mousemove', {"""
repl_raycast = """
         // SNAP HIGHLIGHT TO BLOCK
         if (xrHighlightMesh) {
             xrHighlightMesh.visible = true;
             xrHighlightMesh.position.copy(hits[0].point);
             // Push slightly towards center (0,0,0) to prevent Z-fighting
             xrHighlightMesh.position.multiplyScalar(0.98); 
             xrHighlightMesh.lookAt(xrCamera.position);
             
             // Pulse the highlight
             xrHighlightMesh.material.opacity = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
             if (window.currentThemeObj && window.currentThemeObj.accent) {
                 xrHighlightMesh.material.color.setStyle(window.currentThemeObj.accent);
             }
         }
         
         const syntheticEvent = new MouseEvent('mousemove', {"""
js = js.replace(target_raycast, repl_raycast)

# 8. Hide Highlight Mesh when not intersecting
target_hide = """  if (!intersected) {
    if (typeof vrTooltipMesh !== 'undefined' && vrTooltipMesh) vrTooltipMesh.visible = false;
  }"""
repl_hide = """  if (!intersected) {
    if (typeof vrTooltipMesh !== 'undefined' && vrTooltipMesh) vrTooltipMesh.visible = false;
    if (typeof xrHighlightMesh !== 'undefined' && xrHighlightMesh) xrHighlightMesh.visible = false;
  }"""
js = js.replace(target_hide, repl_hide)

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Overhaul complete!")
