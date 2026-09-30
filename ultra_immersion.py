import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Enhance the Atmosphere (Matrix Rain + Monoliths)
particles_old = "const isBlue = Math.random() > 0.5;"
particles_new = """const isBlue = Math.random() > 0.2; // More blue/green mix
    
    // Add floating Cyber Monoliths in the deep background
    if (i === 0) {
      window.xrMonoliths = new THREE.Group();
      const monoGeo = new THREE.BoxGeometry(1, 10, 1);
      const monoMat = new THREE.MeshBasicMaterial({ color: 0x002211, wireframe: true, transparent: true, opacity: 0.3 });
      for(let m=0; m<15; m++) {
        const mono = new THREE.Mesh(monoGeo, monoMat);
        const mRad = 15 + Math.random() * 20;
        const mTheta = Math.random() * Math.PI * 2;
        mono.position.set(mRad * Math.cos(mTheta), (Math.random()-0.5)*20, mRad * Math.sin(mTheta));
        mono.rotation.y = Math.random() * Math.PI;
        mono.rotation.x = (Math.random()-0.5) * 0.2;
        window.xrMonoliths.add(mono);
      }
      xrScene.add(window.xrParticles); // add particles
      xrScene.add(window.xrMonoliths); // add monoliths
    }"""
js = js.replace(particles_old, particles_new)

# Make particles fall like digital rain instead of just rotating
xr_interaction_old = "window.xrParticles.rotation.x += speed * 0.5;"
xr_interaction_new = """window.xrParticles.rotation.x += speed * 0.1;
    // Digital rain effect
    const positions = window.xrParticles.geometry.attributes.position.array;
    for(let i=1; i<positions.length; i+=3) {
      positions[i] -= 0.05; // fall down
      if(positions[i] < -15) positions[i] = 15; // wrap around
    }
    window.xrParticles.geometry.attributes.position.needsUpdate = true;
    
    if (window.xrMonoliths) {
      window.xrMonoliths.rotation.y -= speed * 0.2; // slow counter-rotation
    }"""
js = js.replace(xr_interaction_old, xr_interaction_new)

# 2. Fix the DOM Overlay CSS so Settings, Sidebar, and Tooltips are clearly visible!
css_old = ".playback-controls { background: rgba(8, 9, 12, 0.4) !important; border: 1px solid rgba(0, 255, 136, 0.2) !important; }"
css_new = """.playback-controls { background: rgba(8, 9, 12, 0.8) !important; border: 1px solid rgba(0, 255, 136, 0.4) !important; }
      
      /* Make sure the sidebars and drawers are extremely visible and float like HUDs */
      #details-sidebar, .archive-drawer {
        background: rgba(4, 6, 8, 0.95) !important;
        border-left: 1px solid #00ff88 !important;
        border-right: 1px solid #00ff88 !important;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.2) !important;
        z-index: 999999 !important;
      }
      
      /* The tooltip needs to pop heavily against the 3D background */
      #hover-tooltip {
        background: rgba(0, 0, 0, 0.95) !important;
        border: 2px solid #00ff88 !important;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.5) !important;
        transform: scale(1.5) !important; /* Make it larger in VR for readability */
        z-index: 999999 !important;
      }
      
      /* Buttons need to be highly visible */
      header button, .app-header button {
        background: rgba(0, 255, 136, 0.1) !important;
        border: 1px solid rgba(0, 255, 136, 0.4) !important;
        color: #00ff88 !important;
        font-weight: bold !important;
      }"""
js = js.replace(css_old, css_new)

# 3. Fix the Synthetic Click coordinates
# The tooltip works via synthetic mousemove. Let's make sure the synthetic click works perfectly for the sidebar.
synthetic_click_old = """const syntheticEvent = new MouseEvent('click', {"""
synthetic_click_new = """// Flash the laser green on click for visual feedback
    if (xrController1 && xrController1.children[0]) xrController1.children[0].material.color.setHex(0xffffff);
    setTimeout(() => { if (xrController1 && xrController1.children[0]) xrController1.children[0].material.color.setHex(0x00ff88); }, 150);
    
    const syntheticEvent = new MouseEvent('click', {"""
js = js.replace(synthetic_click_old, synthetic_click_new)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected ultra immersion and fixed HUD CSS!")
