import re

with open('vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix the particles to respect material.color
js = js.replace("size: 0.04, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending", 
                "size: 0.04, vertexColors: false, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending")

# 2. Fix the sliding block animation to "join up" with the main grid
target_slide = """                      gsap.to(physicalBlock.position, {
                          y: 1.8, z: -4.8, duration: 2.0, ease: 'power2.out', 
                          onComplete: () => {
                              xrScene.remove(physicalBlock);
                              physicalBlock.geometry.dispose();
                              physicalBlock.material.dispose();
                          }
                      });"""

repl_slide = """                      // Slide up and join into the grid
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
                      });"""

# Replace all instances of the slide animation (there are two: in generateSimulatedBlock and the welcome demo)
js = js.replace(target_slide, repl_slide)

# Also fix the Welcome Demo one specifically just in case it uses different spacing
target_welcome = """          gsap.to(fakeBlock.position, {
              y: 1.8, z: -4.8, duration: 2.0, ease: 'power2.out', 
              onComplete: () => { xrScene.remove(fakeBlock); }
          });"""
          
repl_welcome = """          gsap.to(fakeBlock.position, {
              y: 1.8, z: -5.0, duration: 1.5, ease: 'power2.out'
          });
          gsap.to(fakeBlock.scale, {
              x: 0, y: 0, z: 0, duration: 0.5, delay: 1.0, ease: 'power1.in',
              onComplete: () => { if (xrScene) xrScene.remove(fakeBlock); }
          });"""
js = js.replace(target_welcome, repl_welcome)

with open('vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed particles and slide animation!")
