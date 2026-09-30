import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add Easing Functions and Particle Systems
utils_code = """// ==========================================
// AWARD-WINNING MATH & FX ENGINE
// ==========================================
function easeOutQuart(x) { return 1 - Math.pow(1 - x, 4); }
function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
function easeOutBack(x) { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

window.xrTrails = [];
window.xrRipples = [];

function spawnImpactRipple(x, y, z, colorStr) {
    const geo = new THREE.RingGeometry(0.1, 0.2, 32);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setStyle(colorStr), transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const ripple = new THREE.Mesh(geo, mat);
    ripple.position.set(x, y, z);
    ripple.lookAt(0, 1.6, 0); // Face user
    xrScene.add(ripple);
    window.xrRipples.push({ mesh: ripple, scale: 1, opacity: 0.8 });
}

function spawnTrailSpark(x, y, z, colorStr) {
    const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setStyle(colorStr), transparent: true, opacity: 0.6 });
    const spark = new THREE.Mesh(geo, mat);
    spark.position.set(x + (Math.random()-0.5)*0.2, y + (Math.random()-0.5)*0.2, z + (Math.random()-0.5)*0.2);
    xrScene.add(spark);
    window.xrTrails.push({ mesh: spark, life: 1.0 });
}
"""
if "AWARD-WINNING MATH & FX ENGINE" not in js:
    js = utils_code + js

# 2. Update the Spawn Logic for the "Tile" look instead of a random block
spawn_target = r"const h = 0\.4 \+ Math\.random\(\) \* 0\.8;\s*const blockGeo = new THREE\.BoxGeometry\(0\.6, h, 0\.6\);\s*const blockMat = new THREE\.MeshBasicMaterial\(\{ color: smashColor \}\);\s*const physicalBlock = new THREE\.Mesh\(blockGeo, blockMat\);\s*// EXPERIENTIAL JUMP: Starts from floor and leaps into the wall\s*physicalBlock\.position\.set\(0\.0, -0\.5, -1\.5\); // Start on the floor, close to user\s*xrScene\.add\(physicalBlock\);"
spawn_repl = """// AWARD-WINNING: Tile Design
                      const blockGeo = new THREE.BoxGeometry(0.5, 0.5, 0.04); // Thin, sleek tile
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor, transparent: true, opacity: 0.9 });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      
                      // Glowing Edge Wireframe
                      const edges = new THREE.EdgesGeometry(blockGeo);
                      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
                      const wireframe = new THREE.LineSegments(edges, lineMat);
                      physicalBlock.add(wireframe);
                      
                      // EXPERIENTIAL GSAP-STYLE LIFT: Starts perfectly flat on the floor
                      physicalBlock.position.set(0.0, -0.6, -2.0); // Exact floor height
                      physicalBlock.rotation.set(-Math.PI / 2, 0, 0); // Flat on ground
                      xrScene.add(physicalBlock);"""
js = re.sub(spawn_target, spawn_repl, js)

# Update pushing to xrActiveBlocks to include rotation targets and color
push_target = r"if\(\!window\.xrActiveBlocks\) window\.xrActiveBlocks = \[\];\s*window\.xrActiveBlocks\.push\(\{\s*block: newBlock,\s*mesh: physicalBlock,\s*notif: notifMesh,\s*startX: 0\.0,\s*startY: -0\.5,\s*startZ: -1\.5,\s*targetX: 0\.0,\s*targetY: 1\.8,\s*targetZ: -4\.8,\s*progress: 0\s*\}\);"
push_repl = """if(!window.xrActiveBlocks) window.xrActiveBlocks = [];
                      window.xrActiveBlocks.push({
                          block: newBlock,
                          mesh: physicalBlock, 
                          notif: notifMesh,
                          color: colorStr,
                          startX: 0.0, startY: -0.6, startZ: -2.0,
                          startRotX: -Math.PI / 2, startRotY: 0, startRotZ: 0,
                          targetX: (Math.random() - 0.5) * 4.0, // Land somewhere on the curved screen naturally
                          targetY: 1.0 + Math.random() * 2.0, 
                          targetZ: -4.8, 
                          targetRotX: 0, targetRotY: 0, targetRotZ: 0,
                          progress: 0
                      });"""
js = re.sub(push_target, push_repl, js)

# 3. Update the Animation Loop in updateXRInteraction
anim_target = r"// Majestic Parabolic Jump.*?if \(anim\.mesh\.scale\.x < 0\.05\) \{.*?window\.xrActiveBlocks\.splice\(i, 1\);\s*\}\s*\}\s*\}"
anim_repl = """// AWARD-WINNING: GSAP-Style Ease Physics
          anim.progress += 0.008; // ~2 seconds for full majestic lift
          
          if (anim.progress <= 1.0) {
              const easeP = easeOutBack(anim.progress); // Overshoots slightly and settles
              const easeLift = easeInOutCubic(anim.progress);
              
              // Smoothly interpolate position
              anim.mesh.position.x = anim.startX + (anim.targetX - anim.startX) * easeP;
              anim.mesh.position.z = anim.startZ + (anim.targetZ - anim.startZ) * easeP;
              
              // Lift off floor gracefully, then arc into wall
              anim.mesh.position.y = anim.startY + (anim.targetY - anim.startY) * easeP + Math.sin(anim.progress * Math.PI) * 1.5; 
              
              // Smoothly rotate from flat-on-floor to upright-on-wall
              anim.mesh.rotation.x = anim.startRotX + (anim.targetRotX - anim.startRotX) * easeP;
              anim.mesh.rotation.y = anim.startRotY + (anim.targetRotY - anim.startRotY) * easeP;
              anim.mesh.rotation.z = anim.startRotZ + (anim.targetRotZ - anim.startRotZ) * easeP;
              
              // Emit trail sparks!
              if (Math.random() > 0.4) spawnTrailSpark(anim.mesh.position.x, anim.mesh.position.y, anim.mesh.position.z, anim.color);
              
              if (anim.notif) {
                 anim.notif.position.y += 0.005; // Float upwards softly
                 if (anim.progress > 0.7) { 
                     anim.notif.material.opacity = (1.0 - anim.progress) / 0.3;
                 }
              }
          } else {
              // IMPACT!
              if (anim.progress === 1.008) { // Just finished
                 spawnImpactRipple(anim.targetX, anim.targetY, anim.targetZ, anim.color);
              }
              
              if (anim.notif) { xrScene.remove(anim.notif); anim.notif.material.dispose(); anim.notif.geometry.dispose(); }
              
              // Melt smoothly into the wall
              anim.mesh.scale.multiplyScalar(0.85);
              if (anim.mesh.scale.x < 0.05) {
                  xrScene.remove(anim.mesh);
                  if (anim.mesh.geometry) anim.mesh.geometry.dispose();
                  if (anim.mesh.material) anim.mesh.material.dispose();
                  // Clean up wireframe
                  if (anim.mesh.children.length > 0) {
                      anim.mesh.children[0].geometry.dispose();
                      anim.mesh.children[0].material.dispose();
                  }
                  window.xrActiveBlocks.splice(i, 1);
              }
          }
      }"""
js = re.sub(anim_target, anim_repl, js, flags=re.DOTALL)

# Add Trail and Ripple Animation loops at the end of updateXRInteraction
trail_engine = """
  // Update Trails
  if (window.xrTrails) {
      for (let i = window.xrTrails.length - 1; i >= 0; i--) {
          const spark = window.xrTrails[i];
          spark.life -= 0.02;
          spark.mesh.position.y -= 0.01;
          spark.mesh.scale.multiplyScalar(0.9);
          spark.mesh.material.opacity = spark.life;
          if (spark.life <= 0) {
              xrScene.remove(spark.mesh);
              spark.mesh.geometry.dispose();
              spark.mesh.material.dispose();
              window.xrTrails.splice(i, 1);
          }
      }
  }
  
  // Update Ripples
  if (window.xrRipples) {
      for (let i = window.xrRipples.length - 1; i >= 0; i--) {
          const rip = window.xrRipples[i];
          rip.scale += 0.2;
          rip.opacity -= 0.04;
          rip.mesh.scale.set(rip.scale, rip.scale, 1);
          rip.mesh.material.opacity = rip.opacity;
          if (rip.opacity <= 0) {
              xrScene.remove(rip.mesh);
              rip.mesh.geometry.dispose();
              rip.mesh.material.dispose();
              window.xrRipples.splice(i, 1);
          }
      }
  }
"""
js = js.replace("if (window.xrFloorTex && window.xrGridHelper) {", trail_engine + "\n  if (window.xrFloorTex && window.xrGridHelper) {")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected Award-Winning GSAP Math, Tile Physics, Trails, and Ripples!")
