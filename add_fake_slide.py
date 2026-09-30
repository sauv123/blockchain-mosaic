import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """          window.showVRNotification('VR SYSTEMS ONLINE', false);
      }
      
      // Removed fake welcome block as requested."""

repl = """          window.showVRNotification('VR SYSTEMS ONLINE', false);
      }
      
      // ELEGANT DEMO SLIDE SO THEY IMMEDIATELY SEE THE ANIMATION WORKING
      if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
          const fakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
          fakeBlock.position.set(0, -3.0, -6.0);
          xrScene.add(fakeBlock);
          gsap.to(fakeBlock.position, {
              y: 1.6, z: -6.0, duration: 2.0, ease: 'power2.out', 
              onComplete: () => { xrScene.remove(fakeBlock); }
          });
      }"""

js = js.replace(target, repl)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added fake slide to welcome!")
