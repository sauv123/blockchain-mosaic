import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the sessionstart / sessionend listeners to aggressively strip DOM backgrounds
bad_session = """  xrRenderer.xr.addEventListener('sessionstart', () => {
    isVRActive = true;
    canvas.style.opacity = '0'; 
    document.body.style.background = 'transparent';
  });

  xrRenderer.xr.addEventListener('sessionend', () => {
    isVRActive = false;
    canvas.style.opacity = '1';
  });"""

good_session = """  xrRenderer.xr.addEventListener('sessionstart', () => {
    isVRActive = true;
    
    // Inject extreme transparent HUD styles to prevent the Quest from rendering a giant black box
    const vrStyle = document.createElement('style');
    vrStyle.id = 'vr-immersive-style';
    vrStyle.innerHTML = `
      html, body, #app-container, .main-layout, .canvas-container {
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
      }
      #mosaic-canvas {
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .app-header {
        background: rgba(8, 9, 12, 0.2) !important; 
        border-bottom: 1px solid rgba(0, 255, 136, 0.1) !important;
      }
      .playback-controls {
        background: rgba(8, 9, 12, 0.4) !important;
        border: 1px solid rgba(0, 255, 136, 0.2) !important;
      }
      /* Hide scrollbars completely in VR */
      ::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(vrStyle);
  });

  xrRenderer.xr.addEventListener('sessionend', () => {
    isVRActive = false;
    const vrStyle = document.getElementById('vr-immersive-style');
    if (vrStyle) vrStyle.remove();
  });"""

js = js.replace(bad_session, good_session)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected VR transparency fix.")
