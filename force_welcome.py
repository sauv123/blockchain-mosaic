import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target_welcome = """          window.showVRNotification('VR SYSTEMS ONLINE', false);
      }
      if (typeof gsap !== 'undefined' && window.xrGridHelper) {"""

repl_welcome = """          window.showVRNotification('VR SYSTEMS ONLINE', false);
      }
      
      // FIRE A FAKE 3D BLOCK SMASH SO THEY DEFINITELY SEE THE EFFECTS!
      if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
          const fakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
          fakeBlock.position.set(0, -3.0, -1.0);
          xrScene.add(fakeBlock);
          gsap.to(fakeBlock.position, {
              y: 1.6, z: -1.0, duration: 1.2, ease: 'back.out(1.5)', 
              onComplete: () => {
                  xrScene.remove(fakeBlock);
                  if (xrScene.background && xrScene.background.setHex) {
                      xrScene.background.setHex(0x00ff88);
                      setTimeout(() => { xrScene.background.setHex(0x000308); }, 150);
                  }
              }
          });
          gsap.to(fakeBlock.rotation, { x: Math.PI * 2, y: Math.PI * 2, duration: 1.2, ease: 'power2.inOut' });
      }
      
      if (typeof gsap !== 'undefined' && window.xrGridHelper) {"""
js = js.replace(target_welcome, repl_welcome)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected Fake Smash into Welcome Animation!")
