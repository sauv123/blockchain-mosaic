import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

billboard_code = """
  // ==========================================
  // CONTEXTUAL HOLO-BILLBOARD
  // ==========================================
  const billboardCanvas = document.createElement('canvas');
  billboardCanvas.width = 1024;
  billboardCanvas.height = 512;
  const bbCtx = billboardCanvas.getContext('2d');
  const bbTex = new THREE.CanvasTexture(billboardCanvas);
  
  const bbGeo = new THREE.PlaneGeometry(6, 3); // Massive 6m x 3m billboard
  const bbMat = new THREE.MeshBasicMaterial({ map: bbTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  window.xrBillboard = new THREE.Mesh(bbGeo, bbMat);
  
  window.xrBillboard.position.set(-7, 2, -2); // Off to the left
  window.xrBillboard.rotation.y = Math.PI / 4; // Angled toward the user
  xrScene.add(window.xrBillboard);
  
  // Update it every second to avoid CPU usage
  setInterval(() => {
     if (!isVRActive || !window.xrBillboard) return;
     
     const payEl = document.getElementById('stat-payments');
     const volEl = document.getElementById('stat-volume');
     const modeEl = document.querySelector('.brand h1');
     
     const payments = payEl ? payEl.innerText : '0';
     const volume = volEl ? volEl.innerText : '$0.00';
     const mode = modeEl ? modeEl.innerText : 'BLOCKCHAIN MOSAIC';
     
     bbCtx.clearRect(0, 0, 1024, 512);
     
     // Glowing Background Panel
     bbCtx.fillStyle = 'rgba(4, 6, 8, 0.8)';
     bbCtx.strokeStyle = '#00ff88';
     bbCtx.lineWidth = 4;
     bbCtx.fillRect(10, 10, 1004, 492);
     bbCtx.strokeRect(10, 10, 1004, 492);
     
     // Title
     bbCtx.fillStyle = '#ffffff';
     bbCtx.font = 'bold 48px monospace';
     bbCtx.textAlign = 'center';
     bbCtx.fillText(mode, 512, 120);
     
     // Subtitle Context
     bbCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
     bbCtx.font = 'italic 32px sans-serif';
     bbCtx.fillText("Each cube represents a live cryptographic transaction on the network.", 512, 200);
     
     // Live Stats
     bbCtx.fillStyle = '#00ff88';
     bbCtx.font = 'bold 80px monospace';
     bbCtx.fillText("TRANSACTIONS: " + payments, 512, 350);
     
     bbCtx.fillStyle = '#00aaff';
     bbCtx.font = 'bold 70px monospace';
     bbCtx.fillText("VOLUME: " + volume, 512, 450);
     
     bbTex.needsUpdate = true;
  }, 1000);
"""

# Inject it after xrBlockMesh is created
target = "xrScene.add(window.xrBlockMesh);"
js = js.replace(target, target + "\n" + billboard_code)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected Contextual Holo-Billboard!")
