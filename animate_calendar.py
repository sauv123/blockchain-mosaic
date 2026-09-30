import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "async function loadHistoricalPortrait(dateStr, dayNum) {"
replacement = """async function loadHistoricalPortrait(dateStr, dayNum) {
  // Beautiful scatter animation for blocks!
  if (typeof gsap !== 'undefined') {
      const cvsCont = document.getElementById('canvas-container');
      
      // Flash and blur the container
      gsap.to(cvsCont, { 
          filter: 'blur(20px) brightness(2)',
          scale: 0.9,
          duration: 0.4,
          ease: 'power2.in'
      });
      
      // In 3D VR, explode the cubes outwards
      if (window.xrBlockMesh) {
          gsap.to(window.xrBlockMesh.position, {
              z: 5,
              y: -2,
              duration: 0.4,
              ease: 'power2.in'
          });
      }
      
      await new Promise(r => setTimeout(r, 450));
      
      // Restore gracefully
      gsap.to(cvsCont, { 
          filter: 'blur(0px) brightness(1)',
          scale: 1.0,
          duration: 1.2,
          ease: 'expo.out'
      });
      
      if (window.xrBlockMesh) {
          window.xrBlockMesh.position.set(0, 1.6, 0); // snap back
          // Add a bounce to the cubes' scale by triggering a global 'minted' flag
          if (blocks) {
             blocks.forEach(b => b._liveMintedTime = Date.now() + Math.random() * 500);
          }
      }
  }
"""
js = js.replace(target, replacement)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added beautiful calendar scatter transition!")
