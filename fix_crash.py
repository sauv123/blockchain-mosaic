import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the crashing Object3D.add
broken_block = """    if (i === 0) {
      window.xrMonoliths = new THREE.Group();
      const monoGeo = new THREE.BoxGeometry(1, 10, 1);
      const monoMat = new THREE.MeshBasicMaterial({ color: 0x002211, wireframe: true, transparent: true, opacity: 0.3 });
      for(let m=0; m<15; m++) {
        const mono = new THREE.Mesh(monoGeo, monoMat);
        const mRad = 15 + Math.random() * 20;
        const mTheta = Math.random() * Math.PI * 2;
        mono.position.set(mRad * Math.cos(mTheta), (Math.random()-0.5)*20, mRad * Math.sin(mTheta));
        mono.rotation.y = Math.random() * Math.PI;
        mono.rotation.x = (Math.random()-0.5) * 0.2;
        window.xrMonoliths.add(mono);
      }
      xrScene.add(window.xrParticles); // add particles
      xrScene.add(window.xrMonoliths); // add monoliths
    }"""

# Remove it from the loop
js = js.replace(broken_block, "")

# Add it safely after window.xrParticles is actually created
safe_block = """  window.xrParticles = new THREE.Points(particlesGeo, particlesMat);
  xrScene.add(window.xrParticles);
  
  window.xrMonoliths = new THREE.Group();
  const monoGeo = new THREE.BoxGeometry(1, 10, 1);
  const monoMat = new THREE.MeshBasicMaterial({ color: 0x002211, wireframe: true, transparent: true, opacity: 0.3 });
  for(let m=0; m<15; m++) {
    const mono = new THREE.Mesh(monoGeo, monoMat);
    const mRad = 15 + Math.random() * 20;
    const mTheta = Math.random() * Math.PI * 2;
    mono.position.set(mRad * Math.cos(mTheta), (Math.random()-0.5)*20, mRad * Math.sin(mTheta));
    mono.rotation.y = Math.random() * Math.PI;
    mono.rotation.x = (Math.random()-0.5) * 0.2;
    window.xrMonoliths.add(mono);
  }
  xrScene.add(window.xrMonoliths);
"""
js = js.replace("  window.xrParticles = new THREE.Points(particlesGeo, particlesMat);\n  xrScene.add(window.xrParticles);", safe_block)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed the WebXR crash!")
