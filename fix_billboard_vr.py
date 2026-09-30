import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"bbCtx\.clearRect\(0, 0, 1024, 512\);.*?bbTex\.needsUpdate = true;"
repl = """bbCtx.clearRect(0, 0, 1024, 512);
     
     // Glowing Background Panel
     bbCtx.fillStyle = 'rgba(4, 6, 8, 0.9)';
     bbCtx.strokeStyle = '#00ff88';
     bbCtx.lineWidth = 4;
     bbCtx.fillRect(10, 10, 1004, 492);
     bbCtx.strokeRect(10, 10, 1004, 492);
     
     bbCtx.fillStyle = '#ffffff';
     bbCtx.font = 'bold 36px "Space Mono", monospace';
     bbCtx.textAlign = 'left';
     bbCtx.fillText("LIVE NETWORK HIGHLIGHTS", 80, 80);
     
     if (window.lastBillboardStats) {
          bbCtx.fillStyle = '#00ff88';
          bbCtx.font = '32px "Space Mono", monospace';
          bbCtx.fillText(`CURRENT PAYMENTS: ${window.lastBillboardStats.txCount}`, 80, 160);
          
          bbCtx.fillStyle = '#ffffff';
          bbCtx.fillText(`AMOUNT MOVED: $${window.lastBillboardStats.val.toLocaleString()}`, 80, 220);
          
          bbCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          bbCtx.font = '24px "Outfit", sans-serif';
          let summary = "Network is stable. Standard transfer volume detected.";
          if (window.lastBillboardStats.txCount > 500) summary = "High volume activity detected! Congestion increasing.";
          if (window.lastBillboardStats.val > 50000) summary = "Massive capital migration detected. Whale activity likely.";
          bbCtx.fillText(`SUMMARY: ${summary}`, 80, 300);
     } else {
          bbCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          bbCtx.font = '28px "Outfit", sans-serif';
          bbCtx.fillText("WAITING FOR NETWORK...", 80, 160);
     }
     
     bbTex.needsUpdate = true;"""
js = re.sub(target, repl, js, flags=re.DOTALL)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed Billboard Canvas update loop!")
