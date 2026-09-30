import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. DELETE the InstancedMesh Initialization
regex_init = re.compile(r'// ==========================================\n\s*// PHYSICAL 3D CUBE MOSAIC \(INSTANCED MESH\)\n.*?xrScene\.add\(window\.xrBlockMesh\);', re.DOTALL)
js = regex_init.sub('', js)

# 2. DELETE the 3D Cubes Sync Loop
regex_sync = re.compile(r'// SYNC 3D CUBES WITH 2D MOSAIC.*?window\.xrBlockMesh\.setColorAt\(i, c\);\n\s*\}\n', re.DOTALL)
js = regex_sync.sub('', js)

regex_sync2 = re.compile(r'// Hide unused instances.*?window\.xrBlockMesh\.instanceColor\.needsUpdate = true;\n\s*\}', re.DOTALL)
js = regex_sync2.sub('', js)

# 3. Restore xrMesh visibility if it was explicitly hidden elsewhere just in case
js = js.replace("if (xrMesh) xrMesh.visible = false;", "if (xrMesh) xrMesh.visible = true;")

# 4. DELETE the InstancedMesh Raycasting and restore perfect xrMesh UV mapping!
regex_raycast = re.compile(r'// 3D PHYSICAL CUBE RAYCASTING.*?const hits = xrRaycaster\.intersectObject\(xrMesh\);', re.DOTALL)

perfect_uv_raycast = """// Accurate VR Raycasting to 2D Canvas Tooltips
    const hits = xrRaycaster.intersectObject(xrMesh);
    if (hits.length > 0) {
      intersected = true;
      const uv = hits[0].uv;
      
      if (lastIntersectedUV && (Math.abs(lastIntersectedUV.x - uv.x) > 0.01 || Math.abs(lastIntersectedUV.y - uv.y) > 0.01)) {
         if (controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
            controller.gamepad.hapticActuators[0].pulse(0.1, 10);
         }
      }
      if (window.xrHoverSound) window.xrHoverSound.setVolume(0.05);
      
      lastIntersectedUV = uv;
      
      // Calculate exact pixel position on the internal canvas regardless of CSS scaling!
      const cvs = document.getElementById('mosaic-canvas');
      if (cvs) {
         const rect = cvs.getBoundingClientRect();
         // The UV maps exactly to the internal canvas resolution width/height
         // We add rect.left/top so that when getBoundingClientRect() is called inside the listener, it subtracts it perfectly back to the raw internal coordinate!
         const exactClientX = rect.left + (uv.x * cvs.width);
         const exactClientY = rect.top + ((1 - uv.y) * cvs.height);
         
         const syntheticEvent = new MouseEvent('mousemove', {
           clientX: exactClientX,
           clientY: exactClientY,
           bubbles: true, cancelable: true, view: window
         });
         cvs.dispatchEvent(syntheticEvent);
      }
    }"""
js = regex_raycast.sub(perfect_uv_raycast, js)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Reverted 3D cubes and fixed accurate VR tooltip raycasting!")
