import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. 3D BLOCK SMASH ANIMATION & THEMED PARTICLES
# We'll inject this inside the websocket 'blocks.push(newBlock)' block!

target_ws = """              if (typeof window.showVRNotification === 'function') {
                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : 0;"""

repl_ws = """              if (typeof window.showVRNotification === 'function') {
                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : 0;
                  
                  // ==========================================
                  // 3D PHYSICAL BLOCK SMASH ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)'; // default
                      if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      
                      // Update Falling Particles to match the network theme!
                      if (window.xrParticles) {
                          const colors = window.xrParticles.geometry.attributes.color.array;
                          for(let c=0; c<colors.length; c+=3) {
                              colors[c] = smashColor.r;
                              colors[c+1] = smashColor.g;
                              colors[c+2] = smashColor.b;
                          }
                          window.xrParticles.geometry.attributes.color.needsUpdate = true;
                      }
                      
                      // Create a physical glowing block
                      const blockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      
                      // Start it underground below the main panel
                      physicalBlock.position.set(0, -3.0, -1.0); 
                      xrScene.add(physicalBlock);
                      
                      if (typeof gsap !== 'undefined') {
                          // Animate it flying UP and SMASHING into the panel
                          gsap.to(physicalBlock.position, {
                              y: 1.6, z: -1.0, duration: 1.2, ease: 'back.out(1.5)', 
                              onComplete: () => {
                                  // Destroy physical block and let 2D canvas shockwave take over!
                                  xrScene.remove(physicalBlock);
                                  physicalBlock.geometry.dispose();
                                  physicalBlock.material.dispose();
                                  
                                  // Flash the entire void slightly with the block's color
                                  const originalHex = xrScene.background ? xrScene.background.getHex() : 0x000308;
                                  if (xrScene.background && xrScene.background.setHex) {
                                      xrScene.background.copy(smashColor);
                                      setTimeout(() => { xrScene.background.setHex(originalHex); }, 150);
                                  }
                              }
                          });
                          gsap.to(physicalBlock.rotation, {
                              x: Math.PI * 2, y: Math.PI * 2, duration: 1.2, ease: 'power2.inOut'
                          });
                      }
                  }
"""
js = js.replace(target_ws, repl_ws)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected 3D block smash animations and dynamic falling particle theming!")
