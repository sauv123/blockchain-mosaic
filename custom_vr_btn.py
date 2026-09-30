import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_btn_block = """  const sessionInit = {
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  };
  
  const vrBtn = VRButton.createButton(xrRenderer, sessionInit);
  vrBtn.style.position = 'fixed';
  vrBtn.style.bottom = '20px';
  vrBtn.style.right = '20px';
  vrBtn.style.zIndex = '99999';
  vrBtn.style.fontFamily = "'Space Mono', monospace";
  vrBtn.style.background = 'rgba(0, 255, 136, 0.15)';
  vrBtn.style.color = '#00ff88';
  vrBtn.style.border = '1px solid #00ff88';
  vrBtn.style.borderRadius = '4px';
  vrBtn.style.padding = '12px 24px';
  vrBtn.style.cursor = 'pointer';
  vrBtn.style.fontWeight = 'bold';
  document.body.appendChild(vrBtn);"""

new_btn_block = """  const vrBtn = document.createElement('button');
  vrBtn.innerText = 'ENTER VR (DOM OVERLAY)';
  vrBtn.style.position = 'fixed';
  vrBtn.style.bottom = '20px';
  vrBtn.style.right = '20px';
  vrBtn.style.zIndex = '99999';
  vrBtn.style.fontFamily = "'Space Mono', monospace";
  vrBtn.style.background = 'rgba(0, 255, 136, 0.15)';
  vrBtn.style.color = '#00ff88';
  vrBtn.style.border = '1px solid #00ff88';
  vrBtn.style.borderRadius = '4px';
  vrBtn.style.padding = '12px 24px';
  vrBtn.style.cursor = 'pointer';
  vrBtn.style.fontWeight = 'bold';
  
  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then(supported => {
      if (supported) {
        document.body.appendChild(vrBtn);
        let currentSession = null;
        vrBtn.onclick = () => {
          if (currentSession === null) {
            navigator.xr.requestSession('immersive-vr', {
              optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'dom-overlay'],
              domOverlay: { root: document.body }
            }).then(session => {
              currentSession = session;
              vrBtn.innerText = 'EXIT VR';
              session.addEventListener('end', () => {
                currentSession = null;
                vrBtn.innerText = 'ENTER VR (DOM OVERLAY)';
              });
              xrRenderer.xr.setSession(session);
            });
          } else {
            currentSession.end();
          }
        };
      } else {
        vrBtn.innerText = 'VR NOT SUPPORTED';
        vrBtn.style.opacity = '0.5';
        vrBtn.style.cursor = 'not-allowed';
        document.body.appendChild(vrBtn);
      }
    });
  }"""

js = js.replace(old_btn_block, new_btn_block)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected custom VR button to force DOM Overlay!")
