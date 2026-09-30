import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Target the exact init block around line 4060
target_init = r"const particlesGeo = new THREE\.BufferGeometry\(\);.*?xrScene\.add\(window\.xrParticles\);"
repl_init = """// IMMERSION: 3D Primitive Rain (Different shapes and colors)
  const rainCount = 300;
  const rainGeos = [
      new THREE.BoxGeometry(0.06, 0.06, 0.06),
      new THREE.TetrahedronGeometry(0.06),
      new THREE.OctahedronGeometry(0.05)
  ];
  const rainMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  window.xrRainMeshes = [];
  
  for (let g = 0; g < rainGeos.length; g++) {
      const mesh = new THREE.InstancedMesh(rainGeos[g], rainMat.clone(), rainCount / 3);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      for (let i = 0; i < rainCount / 3; i++) {
          dummy.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
          dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          
          if (Math.random() > 0.6) {
              color.setHSL(Math.random(), 0.8, 0.6); // Random bright colors
          } else {
              color.setHex(0xffffff); // White
          }
          mesh.setColorAt(i, color);
      }
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      xrScene.add(mesh);
      window.xrRainMeshes.push(mesh);
  }"""
js = re.sub(target_init, repl_init, js, flags=re.DOTALL)

# Target the exact animation loops
target_anim = r"if \(window\.xrParticles\) \{.*?if \(window\.xrMonoliths\).*?\n\s+\}"
repl_anim = """if (window.xrRainMeshes) {
      const dummy = new THREE.Object3D();
      window.xrRainMeshes.forEach(mesh => {
          for (let i = 0; i < mesh.count; i++) {
              mesh.getMatrixAt(i, dummy.matrix);
              dummy.position.setFromMatrixPosition(dummy.matrix);
              dummy.rotation.setFromRotationMatrix(dummy.matrix);
              
              dummy.position.y -= 0.05; // Rain falls steadily
              dummy.rotation.x += 0.02;
              dummy.rotation.y += 0.03;
              
              if (dummy.position.y < -5) {
                  dummy.position.y = 15; // Wrap back to top
                  dummy.position.x = (Math.random() - 0.5) * 30;
              }
              
              dummy.updateMatrix();
              mesh.setMatrixAt(i, dummy.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
      });
  }"""
js = re.sub(target_anim, repl_anim, js, flags=re.DOTALL)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Forced rain initialization replacement!")
