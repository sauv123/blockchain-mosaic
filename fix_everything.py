import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Clean up duplicate updateXRInteraction block
js = re.sub(r'    if \(hits\.length > 0\) \{\n      intersected = true;\n      if \(lastIntersectedUV && \(Math\.abs\(lastIntersectedUV\.x - hits\[0\]\.uv\.x\).*?if \(cvs\) cvs\.dispatchEvent\(syntheticEvent\);\n    \}', '', js, flags=re.DOTALL)

# 2. Add VR Tooltip Mesh Initialization
target_init = "xrMesh.position.set(0, 1.8, 0);"
repl_init = """xrMesh.position.set(0, 1.8, 0);

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
js = js.replace(target_init, repl_init)

# 3. Add VR Tooltip Logic to Raycaster
target_raycast = """         const syntheticEvent = new MouseEvent('mousemove', {
           clientX: exactClientX,
           clientY: exactClientY,
           bubbles: true, cancelable: true, view: window
         });
         cvs.dispatchEvent(syntheticEvent);
      }"""
repl_raycast = """         const syntheticEvent = new MouseEvent('mousemove', {
           clientX: exactClientX,
           clientY: exactClientY,
           bubbles: true, cancelable: true, view: window
         });
         cvs.dispatchEvent(syntheticEvent);
      }
      
      // Update 3D VR Tooltip
      if (typeof vrTooltipMesh !== 'undefined' && vrTooltipCtx) {
          const domTooltip = document.getElementById('hover-tooltip');
          if (domTooltip && domTooltip.classList.contains('visible')) {
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
              
              const lines = domTooltip.innerText.split('\\n').filter(l => l.trim().length > 0);
              let y = 50;
              lines.forEach(line => {
                  vrTooltipCtx.fillText(line.substring(0, 40), 30, y);
                  y += 40;
              });
              
              vrTooltipTex.needsUpdate = true;
              vrTooltipMesh.visible = true;
              
              vrTooltipMesh.position.copy(hits[0].point);
              vrTooltipMesh.position.z += 0.2;
              vrTooltipMesh.position.y += 0.3;
              vrTooltipMesh.lookAt(xrCamera.position);
          } else {
              vrTooltipMesh.visible = false;
          }
      }"""
js = js.replace(target_raycast, repl_raycast)

# 4. Hide Tooltip when not intersecting
target_hide = """  if (!intersected && lastIntersectedUV) {"""
repl_hide = """  if (!intersected) {
    if (typeof vrTooltipMesh !== 'undefined' && vrTooltipMesh) vrTooltipMesh.visible = false;
  }
  if (!intersected && lastIntersectedUV) {"""
js = js.replace(target_hide, repl_hide)

# 5. Fix Z Coordinate of Elegant Slide Animation
# The screen is at z = -5.0. We want the block to slide up at z = -4.5
js = js.replace("physicalBlock.position.set(0, -3.0, -6.0);", "physicalBlock.position.set(0, -3.0, -4.5);")
js = js.replace("y: 1.6, z: -6.0,", "y: 1.8, z: -4.5,")


with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Massive script injection completed successfully!")
