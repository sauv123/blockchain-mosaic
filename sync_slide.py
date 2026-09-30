import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """                  // Set notification text for the billboard
                  window.lastNotificationTime = Date.now();
                  if (newBlock.whale_flag === 1) {
                      window.lastNotificationText = `🚨 WHALE DETECTED: $${Math.round(val).toLocaleString()} 🚨`;
                  } else {
                      window.lastNotificationText = `NEW BLOCK: ${txCount} TRANSACTIONS`;
                  }
                  if (typeof window.showVRNotification === 'function') {
                      window.showVRNotification(window.lastNotificationText, newBlock.whale_flag === 1);
                  }
              }"""

repl = """                  // Set notification text for the billboard
                  window.lastNotificationTime = Date.now();
                  if (newBlock.whale_flag === 1) {
                      window.lastNotificationText = `🚨 WHALE DETECTED: $${Math.round(val).toLocaleString()} 🚨`;
                  } else {
                      window.lastNotificationText = `NEW BLOCK: ${txCount} TRANSACTIONS`;
                  }
                  if (typeof window.showVRNotification === 'function') {
                      window.showVRNotification(window.lastNotificationText, newBlock.whale_flag === 1);
                  }
                  
                  // ==========================================
                  // 3D ELEGANT SLIDE ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
                      let colorStr = 'hsl(210, 100%, 50%)'; // default
                      if (typeof PALETTES !== 'undefined' && typeof currentPalette !== 'undefined' && newBlock.dominant_type) {
                          colorStr = PALETTES[currentPalette][newBlock.dominant_type] || PALETTES[currentPalette]['default'] || colorStr;
                      }
                      const smashColor = new THREE.Color().setStyle(colorStr);
                      const blockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                      const blockMat = new THREE.MeshBasicMaterial({ color: smashColor });
                      const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                      physicalBlock.position.set(0, -3.0, -4.8);
                      xrScene.add(physicalBlock);
                      gsap.to(physicalBlock.position, {
                          y: 1.8, z: -4.8, duration: 2.0, ease: 'power2.out', 
                          onComplete: () => {
                              xrScene.remove(physicalBlock);
                              physicalBlock.geometry.dispose();
                              physicalBlock.material.dispose();
                          }
                      });
                  }
              }"""
js = js.replace(target, repl)

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Synchronized slide animation to all block handlers!")
