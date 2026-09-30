import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Replace GridHelper with Custom Tile Floor
grid_init_target = """  // IMMERSION: Infinite Cyberpunk Floor Grid
  const gridHelper = new THREE.GridHelper(40, 40, 0x00ff88, 0x002211);
  window.xrGridHelper = gridHelper;
  gridHelper.position.y = 0; // Floor level
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.4;
  gridHelper.material.blending = THREE.AdditiveBlending;
  xrScene.add(gridHelper);"""

tile_init_repl = """  // IMMERSION: Custom Scrolling Tile Floor
  const floorCvs = document.createElement('canvas');
  floorCvs.width = 512; floorCvs.height = 512;
  const fCtx = floorCvs.getContext('2d');
  fCtx.fillStyle = '#000000'; fCtx.fillRect(0, 0, 512, 512);
  fCtx.strokeStyle = '#ffffff'; fCtx.lineWidth = 6;
  // Draw beautiful glowing tiles
  for (let i = 0; i <= 512; i += 128) {
      fCtx.beginPath(); fCtx.moveTo(i, 0); fCtx.lineTo(i, 512); fCtx.stroke();
      fCtx.beginPath(); fCtx.moveTo(0, i); fCtx.lineTo(512, i); fCtx.stroke();
  }
  // Subtle checkerboard fill for experiential depth
  fCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let x = 0; x < 512; x += 128) {
      for (let y = 0; y < 512; y += 128) {
          if ((x / 128 + y / 128) % 2 === 0) fCtx.fillRect(x, y, 128, 128);
      }
  }
  window.xrFloorTex = new THREE.CanvasTexture(floorCvs);
  window.xrFloorTex.wrapS = THREE.RepeatWrapping;
  window.xrFloorTex.wrapT = THREE.RepeatWrapping;
  window.xrFloorTex.repeat.set(25, 25);
  
  const floorGeo = new THREE.PlaneGeometry(100, 100);
  floorGeo.rotateX(-Math.PI / 2); // Lay flat
  const floorMat = new THREE.MeshBasicMaterial({ 
      map: window.xrFloorTex, 
      color: 0x00ff88, 
      transparent: true, 
      opacity: 0.5, 
      blending: THREE.AdditiveBlending 
  });
  window.xrGridHelper = new THREE.Mesh(floorGeo, floorMat);
  window.xrGridHelper.position.y = 0;
  xrScene.add(window.xrGridHelper);"""
js = js.replace(grid_init_target, tile_init_repl)

# 2. Revert block timer to 12 seconds
js = js.replace("setInterval(generateSimulatedBlock, 2500)", "setInterval(generateSimulatedBlock, 12000)")

# 3. Modify Block Animation Logic (Rise from beneath floor)
# In generateSimulatedBlock
block_spawn_target = """                      // Start horizontally on the far right
                      physicalBlock.position.set(3.5, 1.6, -1.5);
                      xrScene.add(physicalBlock);
                      
                      window.xrActiveBlocks.push({
                          mesh: physicalBlock, 
                          startX: 3.5,
                          targetX: 0.0,
                          targetY: 1.8, 
                          targetZ: -4.8, 
                          progress: 0
                      });"""

block_spawn_repl = """                      // EXPERIENTIAL RISE: Spawn directly beneath the floor
                      physicalBlock.position.set(0.0, -2.5, -3.0);
                      xrScene.add(physicalBlock);
                      
                      window.xrActiveBlocks.push({
                          mesh: physicalBlock, 
                          startX: 0.0,
                          targetX: 0.0,
                          targetY: 1.8, 
                          targetZ: -4.8, 
                          progress: 0
                      });"""
js = js.replace(block_spawn_target, block_spawn_repl)

# Modify the lerping loop to make the rise feel experiential
lerp_target = """          anim.mesh.position.x += (anim.targetX - anim.mesh.position.x) * 0.08;
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.08;
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.08;
          anim.mesh.rotation.y += 0.05; anim.mesh.rotation.x += 0.03;"""

lerp_repl = """          // Elegant curving path from the floor
          anim.mesh.position.x += (anim.targetX - anim.mesh.position.x) * 0.06;
          anim.mesh.position.y += (anim.targetY - anim.mesh.position.y) * 0.05; // Rises slightly slower for majesty
          anim.mesh.position.z += (anim.targetZ - anim.mesh.position.z) * 0.05;
          anim.mesh.rotation.y += 0.02; anim.mesh.rotation.x += 0.02;"""
js = js.replace(lerp_target, lerp_repl)

# 4. Modify Floor Scrolling Logic
# Replace the GridHelper position translation with Texture offset scrolling
floor_anim_target = """  if (window.xrGridHelper) {
      window.xrGridHelper.position.z -= 0.03;
      if (window.xrGridHelper.position.z < -1.0) window.xrGridHelper.position.z += 1.0;
      const intensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.2;
      if (window.currentThemeObj && window.currentThemeObj.accent) {
          window.xrGridHelper.material.color.setStyle(window.currentThemeObj.accent).multiplyScalar(intensity);
      }
  }"""
  
floor_anim_repl = """  if (window.xrFloorTex && window.xrGridHelper) {
      window.xrFloorTex.offset.y -= 0.015; // Scroll tiles continuously
      
      const intensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.2;
      if (window.currentThemeObj && window.currentThemeObj.accent) {
          window.xrGridHelper.material.color.setStyle(window.currentThemeObj.accent).multiplyScalar(intensity);
      }
  }"""
js = js.replace(floor_anim_target, floor_anim_repl)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied tile floor, 12s interval, and experiential rising animation.")
