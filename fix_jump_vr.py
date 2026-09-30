import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update the spawning logic for the Parabolic Jump and Notification Rotation
target_spawn = r"// EXPERIENTIAL RISE: Slower and more visible.*?progress: 0\n\s+\}\);"
repl_spawn = """// EXPERIENTIAL JUMP: Starts from floor and leaps into the wall
                      physicalBlock.position.set(0.0, -0.5, -1.5); // Start on the floor, close to user
                      xrScene.add(physicalBlock);
                      
                      // VANISHING NOTIFICATION
                      const notifCvs = document.createElement('canvas');
                      notifCvs.width = 512; notifCvs.height = 128;
                      const nCtx = notifCvs.getContext('2d');
                      nCtx.fillStyle = 'rgba(0, 255, 136, 0.2)';
                      nCtx.fillRect(0,0,512,128);
                      nCtx.strokeStyle = '#00ff88'; nCtx.lineWidth = 4; nCtx.strokeRect(2,2,508,124);
                      nCtx.fillStyle = '#ffffff'; nCtx.font = '36px "Space Mono", monospace'; nCtx.textAlign = 'center';
                      nCtx.fillText(`NEW BLOCK #${newBlock.block_number || newBlock.id || 'LIVE'}`, 256, 50);
                      nCtx.font = '24px "Outfit", sans-serif';
                      nCtx.fillText(`${txCount} Payments • $${Math.round(val).toLocaleString()} Moved`, 256, 90);
                      
                      const notifTex = new THREE.CanvasTexture(notifCvs);
                      notifTex.needsUpdate = true;
                      const notifMat = new THREE.MeshBasicMaterial({ map: notifTex, transparent: true, opacity: 1.0, depthTest: false, side: THREE.DoubleSide });
                      const notifMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), notifMat);
                      notifMesh.position.set(0, 1.5, -1.5); // Float exactly at eye level
                      notifMesh.lookAt(0, 1.6, 0); // FACE THE USER DIRECTLY
                      xrScene.add(notifMesh);
                      
                      if(!window.xrActiveBlocks) window.xrActiveBlocks = [];
                      window.xrActiveBlocks.push({
                          block: newBlock,
                          mesh: physicalBlock, 
                          notif: notifMesh,
                          startX: 0.0,
                          startY: -0.5,
                          startZ: -1.5,
                          targetX: 0.0,
                          targetY: 1.8, 
                          targetZ: -4.8, 
                          progress: 0
                      });"""

js = re.sub(target_spawn, repl_spawn, js, flags=re.DOTALL)


# 2. Update the Animation Loop to execute the Parabola
target_anim = r"// Majestic slow-motion curving path.*?if \(anim\.progress > 1\.0\) \{"
repl_anim = """// Majestic Parabolic Jump
          anim.progress += 0.012; // Complete in ~1.4 seconds
          const p = Math.min(anim.progress, 1.0);
          
          anim.mesh.position.x = anim.startX + (anim.targetX - anim.startX) * p;
          anim.mesh.position.z = anim.startZ + (anim.targetZ - anim.startZ) * p;
          // Sine wave adds a 2.5-meter vertical jump to the linear path!
          anim.mesh.position.y = anim.startY + (anim.targetY - anim.startY) * p + Math.sin(p * Math.PI) * 2.5; 
          
          anim.mesh.rotation.y += 0.05; anim.mesh.rotation.x += 0.08; // Spin wildly in the air
          
          if (anim.notif) {
             anim.notif.position.y += 0.01; // Float upwards faster
             if (anim.progress > 0.5) { // Fade out during the second half of the jump
                 anim.notif.material.opacity = (1.0 - anim.progress) / 0.5;
             }
          }
          
          if (anim.progress >= 1.0) {"""
          
js = re.sub(target_anim, repl_anim, js, flags=re.DOTALL)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied Parabolic Jump and Fixed Notification Facing!")
