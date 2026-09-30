import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. 8D Experiential Audio Engine
audio_engine = """
// ==========================================
// 8D EXPERIENTIAL AUDIO ENGINE
// ==========================================
let audioCtx, panner, osc1, osc2, lfo;
function init8DAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Binaural Panner for 8D effect
    panner = audioCtx.createStereoPanner();
    
    // Deep drone oscillators
    osc1 = audioCtx.createOscillator();
    osc2 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.value = 45; // Sub bass
    osc2.frequency.value = 90; // Harmonic
    
    // Filter for muffled experiential feel
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    // Master gain
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.3; // Gentle volume
    
    // LFO for 8D Panning (moves left to right)
    lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // 10 seconds to pan around head
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 1.0;
    
    // Connect graph
    lfo.connect(lfoGain);
    // In standard Web Audio, connecting to panner.pan requires an audio parameter
    lfoGain.connect(panner.pan);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    lfo.start();
}
"""
if "init8DAudio" not in js:
    js = audio_engine + js

# Call init8DAudio when entering VR
js = js.replace("xrRenderer.xr.isPresenting) { xrRenderer.render(xrScene, xrCamera); }", "xrRenderer.xr.isPresenting) { xrRenderer.render(xrScene, xrCamera); }\n  if (isVRActive && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();")
js = js.replace("isVRActive = true;", "isVRActive = true;\n    init8DAudio();")

# 2. Rebuild Rain into Colored Primitives (InstancedMesh)
rain_target = """  // IMMERSION: Ambient Particles (Digital Rain)
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 1500;
  const pPositions = new Float32Array(particleCount * 3);
  for(let i=0; i<particleCount*3; i++) {
    pPositions[i] = (Math.random() - 0.5) * 30; // Spread across 30m
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.05, transparent: true, opacity: 0.6 });
  window.xrParticles = new THREE.Points(particleGeo, particleMat);
  xrScene.add(window.xrParticles);"""

rain_repl = """  // IMMERSION: 3D Primitive Rain (Different shapes and colors)
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
          
          // Give color to SOME shapes (60% white, 40% neon)
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
js = js.replace(rain_target, rain_repl)

# Update Rain Animation
rain_anim_target = """  if (window.xrParticles) {
    const speed = (window.sessionDirectCount && window.sessionDirectCount > 500) ? 0.005 : 0.0005; 
    window.xrParticles.rotation.y += speed;
    window.xrParticles.rotation.x += speed * 0.1;
    // Digital rain effect
    const positions = window.xrParticles.geometry.attributes.position.array;
    for(let i=1; i<positions.length; i+=3) {
      positions[i] -= 0.15; // fall down faster
      if(positions[i] < -15) positions[i] = 15; // wrap around
    }
    window.xrParticles.geometry.attributes.position.needsUpdate = true;
    
    if (window.xrMonoliths) {
      window.xrMonoliths.rotation.y -= speed * 0.2; // slow counter-rotation
    }
  }"""
  
rain_anim_repl = """  if (window.xrRainMeshes) {
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
js = js.replace(rain_anim_target, rain_anim_repl)

# 3. New Block Animation - Make it much slower, majestic, and easily visible
# AND 4. Add Vanishing Summary Notification
block_spawn_target = """                      // EXPERIENTIAL RISE: Spawn directly beneath the floor
                      physicalBlock.position.set(0.0, -2.5, -3.0);
                      xrScene.add(physicalBlock);
                      
                      window.xrActiveBlocks.push({
                          block: newBlock,
                          mesh: physicalBlock, 
                          startX: 0.0,
                          targetX: 0.0,
                          targetY: 1.8, 
                          targetZ: -4.8, 
                          progress: 0
                      });"""

block_spawn_repl = """                      // EXPERIENTIAL RISE: Slower and more visible
                      physicalBlock.position.set(0.0, -1.0, -2.5); // Start closer to eye level, just below floor
                      xrScene.add(physicalBlock);
                      
                      // VANISHING NOTIFICATION
                      const notifCvs = document.createElement('canvas');
                      notifCvs.width = 512; notifCvs.height = 128;
                      const nCtx = notifCvs.getContext('2d');
                      nCtx.fillStyle = 'rgba(0, 255, 136, 0.2)';
                      nCtx.fillRect(0,0,512,128);
                      nCtx.strokeStyle = '#00ff88'; nCtx.lineWidth = 4; nCtx.strokeRect(2,2,508,124);
                      nCtx.fillStyle = '#ffffff'; nCtx.font = '36px "Space Mono", monospace'; nCtx.textAlign = 'center';
                      nCtx.fillText(`NEW BLOCK #${newBlock.block_number}`, 256, 50);
                      nCtx.font = '24px "Outfit", sans-serif';
                      nCtx.fillText(`${txCount} Payments • $${Math.round(val).toLocaleString()} Moved`, 256, 90);
                      
                      const notifTex = new THREE.CanvasTexture(notifCvs);
                      const notifMat = new THREE.MeshBasicMaterial({ map: notifTex, transparent: true, opacity: 1.0, depthTest: false });
                      const notifMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), notifMat);
                      notifMesh.position.set(0, 2.5, -2.5); // Float above the spawning block
                      xrScene.add(notifMesh);
                      
                      window.xrActiveBlocks.push({
                          block: newBlock,
                          mesh: physicalBlock, 
                          notif: notifMesh,
                          startX: 0.0,
                          targetX: 0.0,
                          targetY: 1.8, 
                          targetZ: -4.8, 
                          progress: 0
                      });"""
js = js.replace(block_spawn_target, block_spawn_repl)

# Update animation loop
lerp_target = """          // Elegant curving path from the floor
          anim.mesh.position.x += (anim.targetX - anim.mesh.position.x) * 0.06;
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.05; // Rises slightly slower for majesty
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.05;
          anim.mesh.rotation.y += 0.02; anim.mesh.rotation.x += 0.02;
          if (anim.progress > 1.0) {"""

lerp_repl = """          // Majestic slow-motion curving path
          anim.progress += 0.005; // SLOW DOWN massively (was 0.02)
          anim.mesh.position.x += (anim.targetX - anim.mesh.position.x) * 0.02;
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.02; 
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.015;
          anim.mesh.rotation.y += 0.01; anim.mesh.rotation.x += 0.01;
          
          if (anim.notif) {
             anim.notif.position.y += 0.005; // Float upwards
             if (anim.progress > 0.6) { // Fade out near the end
                 anim.notif.material.opacity = (1.0 - anim.progress) / 0.4;
             }
          }
          
          if (anim.progress > 1.0) {
              if (anim.notif) { xrScene.remove(anim.notif); anim.notif.material.dispose(); anim.notif.geometry.dispose(); }"""
js = js.replace("anim.progress += 0.02;", "") # Remove the old fast progress increment
js = js.replace(lerp_target, lerp_repl)

# 5. Right Billboard - Update to have dynamic description summary
billboard_draw_target = """      ctx.clearRect(0, 0, 1024, 512);
      
      // Cyberpunk background
      ctx.fillStyle = 'rgba(8, 9, 12, 0.9)';
      ctx.fillRect(0, 0, 1024, 512);
      
      // Neon Border
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 1004, 492);
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Space Mono", monospace';
      ctx.fillText("LIVE NETWORK HIGHLIGHTS", 80, 80);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '28px "Outfit", sans-serif';
      ctx.fillText(window.lastNotificationText || "WAITING FOR NETWORK", 80, 150);"""

billboard_draw_repl = """      ctx.clearRect(0, 0, 1024, 512);
      ctx.fillStyle = 'rgba(8, 9, 12, 0.9)'; ctx.fillRect(0, 0, 1024, 512);
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 4; ctx.strokeRect(10, 10, 1004, 492);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Space Mono", monospace';
      ctx.fillText("LIVE NETWORK HIGHLIGHTS", 80, 80);
      
      if (window.lastBillboardStats) {
          ctx.fillStyle = '#00ff88';
          ctx.font = '32px "Space Mono", monospace';
          ctx.fillText(`CURRENT PAYMENTS: ${window.lastBillboardStats.txCount}`, 80, 160);
          
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`AMOUNT MOVED: $${window.lastBillboardStats.val.toLocaleString()}`, 80, 220);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '24px "Outfit", sans-serif';
          let summary = "Network is stable. Standard transfer volume detected.";
          if (window.lastBillboardStats.txCount > 500) summary = "High volume activity detected! Congestion increasing.";
          if (window.lastBillboardStats.val > 50000) summary = "Massive capital migration detected. Whale activity likely.";
          ctx.fillText(`SUMMARY: ${summary}`, 80, 300);
      } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '28px "Outfit", sans-serif';
          ctx.fillText("WAITING FOR NETWORK...", 80, 160);
      }"""
js = js.replace(billboard_draw_target, billboard_draw_repl)

# Set the billboard stats variable
js = js.replace("window.lastNotificationText = `Payments: ${txCount} | Amount: $${Math.round(val).toLocaleString()}`;", "window.lastBillboardStats = { txCount, val: Math.round(val) };")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied immersion features: 8D audio, Instanced primitives, Slow majestic rise, Vanishing Notifications, and Billboard summary!")
