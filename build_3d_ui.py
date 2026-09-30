import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Build the 3D VR Dashboard
dashboard_code = """
  // ==========================================
  // 3D NATIVE VR DASHBOARD
  // ==========================================
  window.vrDashboard = new THREE.Group();
  window.vrDashboard.position.set(0, 1.0, -3.5); // Floating right in front, below the main screen
  window.vrDashboard.rotation.x = -Math.PI / 6; // Tilted up towards the user
  xrScene.add(window.vrDashboard);

  window.vrButtons = [];

  function create3DButton(label, xPos, colorHex, clickAction) {
    // Create text texture
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 32);
    
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.2, 0.3);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(xPos, 0, 0);
    
    // Add glowing border
    const borderGeo = new THREE.EdgesGeometry(geo);
    const borderMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    mesh.add(border);

    mesh.userData = { action: clickAction, isButton: true };
    window.vrDashboard.add(mesh);
    window.vrButtons.push(mesh);
  }

  create3DButton('CHANGE THEME', -1.5, '#00ff88', () => {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.click();
  });
  
  create3DButton('TOGGLE AUDIO', 0, '#00aaff', () => {
    const btn = document.getElementById('audio-toggle-btn');
    if (btn) btn.click();
  });
  
  create3DButton('ARCHIVE / SETTINGS', 1.5, '#ff00aa', () => {
    const btn = document.getElementById('archive-toggle-btn');
    if (btn) btn.click();
  });
"""

# Insert it right after the monoliths in initWebXR
target_hook = "xrScene.add(window.xrMonoliths);"
js = js.replace(target_hook, target_hook + "\n" + dashboard_code)

# 2. Add Raycasting for the 3D buttons inside updateXRInteraction
raycast_hook = "const hits = xrRaycaster.intersectObject(xrMesh);"
raycast_new = """
    // 3D UI RAYCASTING
    if (window.vrButtons) {
      const uiHits = xrRaycaster.intersectObjects(window.vrButtons);
      if (uiHits.length > 0) {
        intersected = true;
        const hitBtn = uiHits[0].object;
        hitBtn.scale.set(1.1, 1.1, 1.1); // Hover effect
        
        // Reset others
        window.vrButtons.forEach(b => { if (b !== hitBtn) b.scale.set(1, 1, 1); });
        
        // Handle trigger click! (We need to track if trigger was pulled this frame)
        if (controller.gamepad && controller.gamepad.buttons && controller.gamepad.buttons[0] && controller.gamepad.buttons[0].pressed) {
           if (!hitBtn.userData.isPressed) {
             hitBtn.userData.isPressed = true;
             hitBtn.userData.action();
             // Flash white
             hitBtn.children[0].material.color.setHex(0xff0000);
             setTimeout(() => { hitBtn.children[0].material.color.setHex(0xffffff); }, 200);
           }
        } else {
           hitBtn.userData.isPressed = false;
        }
      } else {
        window.vrButtons.forEach(b => { b.scale.set(1, 1, 1); b.userData.isPressed = false; });
      }
    }
    
    const hits = xrRaycaster.intersectObject(xrMesh);"""
js = js.replace(raycast_hook, raycast_new)

# 3. We also need to fix the session gamepad mapping since we want the trigger button for UI clicking
trigger_fix = """        // Buttons
        if (s.gamepad.buttons && Date.now() - vrButtonCooldown > 500) {"""
trigger_fix_new = """        // Attach gamepad to controller so we can use it in raycast loop
        if (s.handedness === 'left' && xrController1) xrController1.gamepad = s.gamepad;
        if (s.handedness === 'right' && xrController2) xrController2.gamepad = s.gamepad;
        // Buttons
        if (s.gamepad.buttons && Date.now() - vrButtonCooldown > 500) {"""
js = js.replace(trigger_fix, trigger_fix_new)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected native 3D Control Panel!")
