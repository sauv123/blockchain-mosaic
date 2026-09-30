import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad_overlay = """    artOverlay.style.bottom = '180px';
    artOverlay.style.left = '50%';
    artOverlay.style.transform = 'translateX(-50%)';
    artOverlay.style.zIndex = '9000';
    artOverlay.style.background = 'radial-gradient(circle, rgba(10,12,16,0.6) 0%, rgba(10,12,16,0) 60%)';
    artOverlay.style.padding = '40px';
    artOverlay.style.textAlign = 'center';
    artOverlay.style.color = '#fff';
    artOverlay.style.pointerEvents = 'none';
    
    artOverlay.innerHTML = `
      <div style="font-family: 'Space Mono', monospace; font-size: 14px; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">Synthesis Complete</div>
      <div style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 300; margin-bottom: 16px;">PORTRAIT OF ${dateString}</div>
      <div style="font-family: 'Outfit', sans-serif; font-size: 14px; opacity: 0.8; max-width: 500px; margin: 0 auto; line-height: 1.6;">${storyText}</div>
      <div style="font-size: 10px; opacity: 0.5; margin-top: 20px; cursor: pointer; pointer-events: auto;" onclick="switchToLive()">RETURN TO LIVE GRID</div>
    `;"""

good_overlay = """    // Museum Placard Style (Bottom Left)
    artOverlay.style.bottom = '40px';
    artOverlay.style.left = '40px';
    artOverlay.style.zIndex = '9000';
    artOverlay.style.background = 'rgba(8, 9, 12, 0.85)';
    artOverlay.style.backdropFilter = 'blur(12px)';
    artOverlay.style.border = '1px solid rgba(255,255,255,0.08)';
    artOverlay.style.borderRadius = '8px';
    artOverlay.style.padding = '24px 32px';
    artOverlay.style.textAlign = 'left';
    artOverlay.style.color = '#fff';
    artOverlay.style.pointerEvents = 'none';
    artOverlay.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)';
    artOverlay.style.maxWidth = '360px';
    
    artOverlay.innerHTML = `
      <div style="font-family: 'Space Mono', monospace; font-size: 10px; color: #00ff88; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 8px;">Synthesis Complete</div>
      <div style="font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 400; margin-bottom: 12px; letter-spacing: 0.02em;">PORTRAIT OF ${dateString}</div>
      <div style="font-family: 'Outfit', sans-serif; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.6;">${storyText}</div>
    `;"""

if "artOverlay.style.bottom = '180px';" in js:
    js = js.replace(bad_overlay, good_overlay)
    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Overlay replaced with placard")
else:
    print("Overlay not found")
