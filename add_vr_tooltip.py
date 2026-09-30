import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Initialize a VR Tooltip Mesh
target_init = """let currentSession = null;"""
repl_init = """let currentSession = null;
let vrTooltipMesh, vrTooltipCtx, vrTooltipTex;"""
js = js.replace(target_init, repl_init)

target_init_scene = """  xrMesh.position.set(0, 1.6, -1.0);"""
repl_init_scene = """  xrMesh.position.set(0, 1.6, -1.0);
  
  // CREATE 3D VR TOOLTIP
  const tCv = document.createElement('canvas');
  tCv.width = 512; tCv.height = 256;
  vrTooltipCtx = tCv.getContext('2d');
  vrTooltipTex = new THREE.CanvasTexture(tCv);
  const tGeo = new THREE.PlaneGeometry(0.8, 0.4);
  const tMat = new THREE.MeshBasicMaterial({ map: vrTooltipTex, transparent: true, opacity: 0.9, depthTest: false });
  vrTooltipMesh = new THREE.Mesh(tGeo, tMat);
  vrTooltipMesh.renderOrder = 9999;
  vrTooltipMesh.visible = false;
  xrScene.add(vrTooltipMesh);"""
js = js.replace(target_init_scene, repl_init_scene)

# 2. Update VR Tooltip on Hover
target_raycast = """        const cvs = document.getElementById('mosaic-canvas');
        if (cvs) cvs.dispatchEvent(syntheticEvent);"""

repl_raycast = """        const cvs = document.getElementById('mosaic-canvas');
        if (cvs) cvs.dispatchEvent(syntheticEvent);
        
        // Update 3D VR Tooltip
        if (vrTooltipMesh && vrTooltipCtx) {
            // Check if DOM tooltip has content
            const domTooltip = document.getElementById('hover-tooltip');
            if (domTooltip && domTooltip.style.opacity > 0) {
                vrTooltipCtx.clearRect(0, 0, 512, 256);
                vrTooltipCtx.fillStyle = 'rgba(8,9,12,0.95)';
                vrTooltipCtx.beginPath();
                vrTooltipCtx.roundRect(0, 0, 512, 256, 16);
                vrTooltipCtx.fill();
                vrTooltipCtx.strokeStyle = 'rgba(0,255,136,0.5)';
                vrTooltipCtx.lineWidth = 4;
                vrTooltipCtx.stroke();
                
                vrTooltipCtx.fillStyle = '#ffffff';
                vrTooltipCtx.font = '24px monospace';
                
                // Extremely simple scrape of the DOM tooltip text
                const lines = domTooltip.innerText.split('\\n').filter(l => l.trim().length > 0);
                let y = 50;
                lines.forEach(line => {
                    vrTooltipCtx.fillText(line.substring(0, 40), 30, y);
                    y += 40;
                });
                
                vrTooltipTex.needsUpdate = true;
                vrTooltipMesh.visible = true;
                
                // Position it at the laser intersection, slightly pushed towards user
                vrTooltipMesh.position.copy(intersects[0].point);
                vrTooltipMesh.position.z += 0.2; // Push it forward so it doesn't clip
                vrTooltipMesh.position.y += 0.3; // slightly above laser
                vrTooltipMesh.lookAt(xrCamera.position);
            } else {
                vrTooltipMesh.visible = false;
            }
        }"""
js = js.replace(target_raycast, repl_raycast)

# 3. Hide Tooltip when not intersecting
target_not_intersect = """      if (xrController1 && xrController1.children[0]) xrController1.children[0].scale.z = 10;"""
repl_not_intersect = """      if (xrController1 && xrController1.children[0]) xrController1.children[0].scale.z = 10;
      if (typeof vrTooltipMesh !== 'undefined' && vrTooltipMesh) vrTooltipMesh.visible = false;"""
js = js.replace(target_not_intersect, repl_not_intersect)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected native 3D Tooltips!")
