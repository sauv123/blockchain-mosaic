import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """                      // Create a physical glowing block
                      const blockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      
                      // Start it underground below the main panel
                      physicalBlock.position.set(0, -3.0, -1.0); 
                      xrScene.add(physicalBlock);
                      
                      if (typeof gsap !== 'undefined') {
                          // ELEGANT SLIDE: from underneath the FRONT of the curved panel
                          physicalBlock.position.set(0, -3.0, -4.5); // Start below the giant screen
                          
                          gsap.to(physicalBlock.position, {
                              y: 1.8, z: -4.5, duration: 2.0, ease: 'power2.out', 
                              onComplete: () => {
                                  xrScene.remove(physicalBlock);
                                  physicalBlock.geometry.dispose();
                                  physicalBlock.material.dispose();
                              }
                          });
                      }"""

repl = """                      // Create a physical glowing block
                      const blockGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      
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

js = js.replace(target, repl)

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Replaced generateSimulatedBlock GSAP!")
