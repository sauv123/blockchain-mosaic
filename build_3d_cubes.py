import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Initialize the InstancedMesh for the blocks
instanced_mesh_init = """
  // ==========================================
  // PHYSICAL 3D CUBE MOSAIC (INSTANCED MESH)
  // ==========================================
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const cubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  window.xrBlockMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, 10000); // Max 10,000 blocks
  window.xrBlockMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  window.xrBlockMesh.position.set(0, 1.6, 0); // Same center as the cylinder screen
  
  // Hide the flat 2D screen so we only see the physical cubes!
  if (xrMesh) xrMesh.visible = false;
  
  xrScene.add(window.xrBlockMesh);
"""
target_hook = "xrRaycaster = new THREE.Raycaster();"
js = js.replace(target_hook, target_hook + "\n" + instanced_mesh_init)

# 2. Add the syncing logic to update the InstancedMesh every frame based on the 2D blocks array
sync_logic = """
  // SYNC 3D CUBES WITH 2D MOSAIC
  if (window.xrBlockMesh && typeof blocks !== 'undefined' && blocks.length > 0) {
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    const R = 5; // Radius of the curved wall
    
    // We want to map the 2D canvas coordinates to the 3D cylinder
    // The canvas is usually width: 100%, height: 100%
    // Let's map columns to angles, and rows to Y height
    const maxCols = cols || 100;
    const maxRows = rows || Math.ceil(blocks.length / maxCols);
    
    // Angle span from -45 deg to +45 deg (90 degrees total = Math.PI / 2)
    const angleSpan = Math.PI / 1.5; 
    const startAngle = -angleSpan / 2;
    
    // Height span
    const heightSpan = 4; // 4 meters high
    const startY = heightSpan / 2;
    
    const blockW = angleSpan / maxCols;
    const blockH = heightSpan / maxRows;
    
    for (let i = 0; i < blocks.length; i++) {
       const block = blocks[i];
       const col = i % maxCols;
       const row = Math.floor(i / maxCols);
       
       const theta = startAngle + (col * blockW);
       const y = startY - (row * blockH);
       
       // Calculate position on cylinder
       const px = Math.sin(theta) * R;
       const pz = -Math.cos(theta) * R;
       
       // If this is the hovered block in 3D, pop it out slightly!
       const isHovered = (window.xrHoveredIndex === i);
       const zOffset = isHovered ? 0.3 : 0;
       
       dummy.position.set(
         Math.sin(theta) * (R - zOffset),
         y,
         -Math.cos(theta) * (R - zOffset)
       );
       
       // Rotate to face the center
       dummy.rotation.y = -theta;
       
       // Scale the cube based on the block grid
       const scaleSize = (blockH * 0.8) * 4; // Arbitrary nice scale
       dummy.scale.set(scaleSize, scaleSize, isHovered ? scaleSize * 2 : scaleSize * 0.5);
       
       dummy.updateMatrix();
       window.xrBlockMesh.setMatrixAt(i, dummy.matrix);
       
       // Extract color from block (we can use the dominant hue)
       const hue = block.hue || 200;
       const lit = isHovered ? 80 : 50;
       c.setHSL(hue / 360, 1.0, lit / 100);
       window.xrBlockMesh.setColorAt(i, c);
    }
    
    // Hide unused instances
    window.xrBlockMesh.count = blocks.length;
    window.xrBlockMesh.instanceMatrix.needsUpdate = true;
    if (window.xrBlockMesh.instanceColor) window.xrBlockMesh.instanceColor.needsUpdate = true;
  }
"""

draw_hook = "if (xrTexture) xrTexture.needsUpdate = true;"
js = js.replace(draw_hook, draw_hook + "\n" + sync_logic)

# 3. Add InstancedMesh raycasting!
raycast_hook = "const hits = xrRaycaster.intersectObject(xrMesh);"
raycast_new = """
    // 3D PHYSICAL CUBE RAYCASTING
    let cubeHit = false;
    if (window.xrBlockMesh && window.xrBlockMesh.count > 0) {
      const hits = xrRaycaster.intersectObject(window.xrBlockMesh);
      if (hits.length > 0) {
        intersected = true;
        cubeHit = true;
        const instanceId = hits[0].instanceId;
        window.xrHoveredIndex = instanceId;
        
        // Haptic feedback when entering a new block
        if (window.xrLastHoveredIndex !== instanceId) {
           if (controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
             controller.gamepad.hapticActuators[0].pulse(0.2, 20);
           }
           if (window.xrHoverSound) window.xrHoverSound.setVolume(0.1);
           window.xrLastHoveredIndex = instanceId;
           
           // Synthesize mousemove event directly onto the canvas to trigger the HTML tooltip!
           // We have to reverse-engineer the instanceId back to canvas coordinates!
           if (typeof cols !== 'undefined' && typeof tileSize !== 'undefined') {
              const col = instanceId % cols;
              const row = Math.floor(instanceId / cols);
              const rect = document.getElementById('mosaic-canvas').getBoundingClientRect();
              
              // Calculate screen X/Y based on the canvas bounds
              const targetX = rect.left + (col * tileSize) + (tileSize / 2);
              const targetY = rect.top + (row * tileSize) + (tileSize / 2);
              
              const syntheticEvent = new MouseEvent('mousemove', {
                clientX: targetX,
                clientY: targetY,
                bubbles: true, cancelable: true, view: window
              });
              document.getElementById('mosaic-canvas').dispatchEvent(syntheticEvent);
           }
        }
      }
    }
    if (!cubeHit) {
      window.xrHoveredIndex = -1;
      window.xrLastHoveredIndex = -1;
    }
    
    const hits = xrRaycaster.intersectObject(xrMesh);"""
js = js.replace(raycast_hook, raycast_new)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected native 3D Instanced CUBES for the blockchain blocks!")
