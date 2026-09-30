import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"if \(newBlock\.whale_flag === 1 && typeof xrScene !== 'undefined'\) \{.*?\}"
repl = """// AWARD-WINNING: Floor Pulse & Whale Flash
              if (typeof xrScene !== 'undefined') {
                  // Standard Floor Pulse
                  if (window.xrGridHelper) {
                      window.xrGridHelper.material.color.setHex(0xffffff); // Flash bright white
                      // It will automatically fade back down in the updateXRInteraction loop
                  }
                  
                  if (newBlock.whale_flag === 1) {
                      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
                      
                      // MASSIVE WHALE FLASH
                      const flashGeo = new THREE.PlaneGeometry(100, 100);
                      const flashMat = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
                      const flashMesh = new THREE.Mesh(flashGeo, flashMat);
                      flashMesh.position.set(0, 0, -2);
                      flashMesh.lookAt(0, 1.6, 0);
                      xrScene.add(flashMesh);
                      
                      // Animate flash out
                      let op = 0.8;
                      const fInt = setInterval(() => {
                          op -= 0.05;
                          flashMesh.material.opacity = op;
                          if (op <= 0) {
                              clearInterval(fInt);
                              xrScene.remove(flashMesh);
                              flashMesh.geometry.dispose();
                              flashMesh.material.dispose();
                          }
                      }, 50);
                  }
              }"""
js = re.sub(target, repl, js, flags=re.DOTALL)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added whale flashes and floor pulse!")
