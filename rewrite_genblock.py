import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# We need to extract the generateSimulatedBlock entirely and replace it.
# It starts at `let lastSeenBlockHex = null;\nfunction generateSimulatedBlock() {`
# It ends right before `// Chain Select dropdown handler`

start_marker = "let lastSeenBlockHex = null;"
end_marker = "// Chain Select dropdown handler"

start_idx = js.find(start_marker)
end_idx = js.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_func = """let lastSeenBlockHex = null;
function generateSimulatedBlock() {
    if (currentMode !== 'LIVE') return;
    
    // AWARD-WINNING: Connect directly to public Ethereum RPC for LIVE data
    fetch('https://ethereum-rpc.publicnode.com', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest",false],"id":1})
    }).then(r => r.json()).then(data => {
        if (!data || !data.result) return;
        const b = data.result;
        if (b.number === lastSeenBlockHex) return; // Wait for new block
        lastSeenBlockHex = b.number;
        
        const rpcBlockNum = parseInt(b.number, 16);
        const rpcTxCount = b.transactions.length;
        const estimatedValue = rpcTxCount * 4500;
        
        const newBlock = {
            block_number: rpcBlockNum,
            timestamp: parseInt(b.timestamp, 16),
            hash: b.hash,
            tx_count: rpcTxCount,
            base_fee_gwei: parseInt(b.baseFeePerGas || '0', 16) / 1e9,
            contract_ratio: 0.5,
            whale_flag: rpcTxCount > 250 ? 1 : 0,
            largest_tx_value_usd: estimatedValue,
            dominant_type: 'Token Transfer'
        };
        
        blocks.push(newBlock);
        
        // 3D VR LOGIC 
        if (true) {
              const txCount = rpcTxCount;
              let colorStr = '#ffffff'; // Force white as requested
              const smashColor = new THREE.Color(0xffffff);
              
              // AWARD-WINNING: Floor Pulse & Whale Flash
              if (typeof xrScene !== 'undefined') {
                  if (window.xrGridHelper) {
                      window.xrGridHelper.material.color.setHex(0xffffff); 
                  }
                  
                  if (newBlock.whale_flag === 1) {
                      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
                      const flashGeo = new THREE.PlaneGeometry(100, 100);
                      const flashMat = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
                      const flashMesh = new THREE.Mesh(flashGeo, flashMat);
                      flashMesh.position.set(0, 0, -2);
                      flashMesh.lookAt(0, 1.6, 0);
                      xrScene.add(flashMesh);
                      
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
              }

              if (typeof xrScene !== 'undefined') {
                  const blockGeo = new THREE.BoxGeometry(0.5, 0.5, 0.04); 
                  const blockMat = new THREE.MeshBasicMaterial({ color: smashColor, transparent: true, opacity: 0.9 });
                  const physicalBlock = new THREE.Mesh(blockGeo, blockMat);
                  
                  const edges = new THREE.EdgesGeometry(blockGeo);
                  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
                  const wireframe = new THREE.LineSegments(edges, lineMat);
                  physicalBlock.add(wireframe);
                  
                  physicalBlock.position.set(0.0, -0.6, -2.0); 
                  physicalBlock.rotation.set(-Math.PI / 2, 0, 0); 
                  xrScene.add(physicalBlock);
                  
                  if(!window.xrActiveBlocks) window.xrActiveBlocks = [];
                  window.xrActiveBlocks.push({
                      block: newBlock,
                      mesh: physicalBlock, 
                      notif: null,
                      color: colorStr,
                      startX: 0.0, startY: -0.6, startZ: -2.0,
                      startRotX: -Math.PI / 2, startRotY: 0, startRotZ: 0,
                      targetX: (Math.random() - 0.5) * 4.0, 
                      targetY: 1.0 + Math.random() * 2.0, 
                      targetZ: -9.5, 
                      targetRotX: 0, targetRotY: 0, targetRotZ: 0,
                      progress: 0
                  });
              }
              
              if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);
              
              let currentCapacity = cols * rows;
              if (blocks.length > currentCapacity) {
                if (tileSize === 64) {
                  tileSize = 48;
                  resizeCanvas();
                } else if (tileSize === 48) {
                  tileSize = 32;
                  resizeCanvas();
                } else if (tileSize === 32) {
                  tileSize = 24;
                  resizeCanvas();
                } else {
                  blocks.shift();
                }
              }
              updateStats();
        }
        
    }).catch(e => console.error('ETH RPC Error:', e));
}

"""
    js = js[:start_idx] + new_func + js[end_idx:]
    with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Replaced function entirely!")
else:
    print("Could not find boundaries")
