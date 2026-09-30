import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Inject Advanced VFX Initialization
init_vfx = """
  // =======================================================
  // AWARD-WINNING VFX: Data Clouds & Ambient Energy Motes
  // =======================================================
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 1024; cloudCanvas.height = 1024;
  const cCtx = cloudCanvas.getContext('2d');
  cCtx.fillStyle = 'rgba(0,0,0,0)'; cCtx.fillRect(0,0,1024,1024);
  cCtx.fillStyle = 'rgba(255,255,255,0.4)';
  cCtx.font = '16px "Space Mono", monospace';
  const hex = '0123456789ABCDEF01010101';
  for(let x = 0; x < 1024; x += 18) {
      for(let y = 0; y < 1024; y += 20) {
          if (Math.random() > 0.6) cCtx.fillText(hex[Math.floor(Math.random()*hex.length)], x, y);
      }
  }
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  cloudTex.wrapS = THREE.RepeatWrapping;
  cloudTex.wrapT = THREE.RepeatWrapping;
  const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  
  window.dataClouds = [];
  for(let i = 0; i < 3; i++) {
      const cloudGeo = new THREE.PlaneGeometry(40, 40);
      const cloud = new THREE.Mesh(cloudGeo, cloudMat.clone());
      cloud.rotation.x = Math.PI / 2; // Flat ceiling above head
      cloud.position.set(0, 4.5 + i * 1.5, 0); // Layered heights: y=4.5, 6.0, 7.5
      cloud.material.opacity = 0.08 - (i * 0.02); // Fade upper layers
      xrScene.add(cloud);
      window.dataClouds.push(cloud);
  }

  // Energy Motes (Floating ambient fireflies)
  const moteCount = 200;
  const motePos = new Float32Array(moteCount * 3);
  const moteVel = [];
  for(let i = 0; i < moteCount; i++) {
      motePos[i*3] = (Math.random() - 0.5) * 15;
      motePos[i*3+1] = Math.random() * 4; 
      motePos[i*3+2] = (Math.random() - 0.5) * 15;
      moteVel.push({ x: (Math.random()-0.5)*0.003, y: (Math.random()-0.5)*0.003, z: (Math.random()-0.5)*0.003 });
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.02, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
  window.energyMotes = new THREE.Points(moteGeo, moteMat);
  window.energyMotes.userData.velocities = moteVel;
  xrScene.add(window.energyMotes);
  // =======================================================
"""
js = js.replace("xrRaycaster = new THREE.Raycaster();", init_vfx + "\n  xrRaycaster = new THREE.Raycaster();")


# 2. Inject Animation Loop logic at the very end of updateXRInteraction
update_vfx = """
  // Update Data Clouds
  if (window.dataClouds) {
      window.dataClouds.forEach((cloud, idx) => {
          cloud.material.map.offset.x -= 0.00015 * (idx + 1); // Drift slowly left
          cloud.material.map.offset.y += 0.0001 * (idx + 1); // Drift slowly forward
          cloud.position.y += Math.sin(Date.now() * 0.001 + idx) * 0.0005; // Gentle breathing motion
      });
  }

  // Update Energy Motes
  if (window.energyMotes) {
      const positions = window.energyMotes.geometry.attributes.position.array;
      const vels = window.energyMotes.userData.velocities;
      for(let i = 0; i < positions.length / 3; i++) {
          positions[i*3] += vels[i].x;
          positions[i*3+1] += vels[i].y;
          positions[i*3+2] += vels[i].z;
          // Soft bounds bounce
          if (positions[i*3] > 7.5 || positions[i*3] < -7.5) vels[i].x *= -1;
          if (positions[i*3+1] > 4 || positions[i*3+1] < 0.1) vels[i].y *= -1;
          if (positions[i*3+2] > 7.5 || positions[i*3+2] < -7.5) vels[i].z *= -1;
      }
      window.energyMotes.geometry.attributes.position.needsUpdate = true;
  }
"""
# find the end of updateXRInteraction (it ends right before `function parseUrlParameters()`)
js = js.replace("requestAnimationFrame(updateXRInteraction);\n}", update_vfx + "\n  requestAnimationFrame(updateXRInteraction);\n}")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected ambient VFX successfully!")
