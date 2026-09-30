import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "      // In 3D VR, explode the cubes outwards\n      if (window.xrBlockMesh) {\n          gsap.to(window.xrBlockMesh.position, {"
replacement = """      // Cinematic Calendar Transition: Color Shift and Lights!
      if (typeof xrScene !== 'undefined') {
          // Flash the entire void into a neon synthwave sunset
          gsap.to(xrScene.background, { r: 1.0, g: 0.0, b: 0.6, duration: 0.5, ease: 'power2.out' });
          gsap.to(xrScene.fog.color, { r: 1.0, g: 0.0, b: 0.6, duration: 0.5, ease: 'power2.out' });
      }

      // In 3D VR, explode the cubes outwards
      if (window.xrBlockMesh) {
          gsap.to(window.xrBlockMesh.position, {"""
js = js.replace(target, replacement)

target2 = "      if (window.xrBlockMesh) {\n          window.xrBlockMesh.position.set(0, 1.6, 0); // snap back"
replacement2 = """      if (typeof xrScene !== 'undefined') {
          // Restore the deep void
          gsap.to(xrScene.background, { r: 0.0, g: 0.012, b: 0.031, duration: 1.5, ease: 'power2.in' });
          gsap.to(xrScene.fog.color, { r: 0.0, g: 0.012, b: 0.031, duration: 1.5, ease: 'power2.in' });
      }
      
      if (window.xrBlockMesh) {
          window.xrBlockMesh.position.set(0, 1.6, 0); // snap back"""
js = js.replace(target2, replacement2)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added cinematic synthwave light explosion to Calendar view!")
