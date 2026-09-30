import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. FIX THE HOVER TOOLTIP MATH
target_raycast = """         const exactClientX = rect.left + (uv.x * cvs.width);
         const exactClientY = rect.top + ((1 - uv.y) * cvs.height);"""
repl_raycast = """         // The canvas expects CSS pixels, NOT internal resolution!
         const exactClientX = rect.left + (uv.x * rect.width);
         const exactClientY = rect.top + ((1 - uv.y) * rect.height);"""
js = js.replace(target_raycast, repl_raycast)


# 2. FIX THE PARTICLES (Match the GLOBAL theme, not the block color)
target_particles = """                      // Update Falling Particles to match the network theme!
                      if (window.xrParticles) {
                          const colors = window.xrParticles.geometry.attributes.color.array;
                          for(let c=0; c<colors.length; c+=3) {
                              colors[c] = smashColor.r;
                              colors[c+1] = smashColor.g;
                              colors[c+2] = smashColor.b;
                          }
                          window.xrParticles.geometry.attributes.color.needsUpdate = true;
                      }"""
repl_particles = """                      // Update particles ONLY if the global theme changes. We'll do this outside the smash block!"""
js = js.replace(target_particles, repl_particles)

# Add a recurring theme checker in the draw loop
target_draw = """    if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {"""
repl_draw = """    // ALWAYS MATCH PARTICLES TO GLOBAL THEME
    if (window.xrParticles && typeof theme !== 'undefined' && theme.accent) {
        if (!window.lastParticleAccent || window.lastParticleAccent !== theme.accent) {
            window.lastParticleAccent = theme.accent;
            const tColor = new THREE.Color().setStyle(theme.accent);
            const colors = window.xrParticles.geometry.attributes.color.array;
            for(let c=0; c<colors.length; c+=3) {
                colors[c] = tColor.r;
                colors[c+1] = tColor.g;
                colors[c+2] = tColor.b;
            }
            window.xrParticles.geometry.attributes.color.needsUpdate = true;
        }
    }
    if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {"""
js = js.replace(target_draw, repl_draw)


# 3. FIX THE BLOCK ANIMATION (Smooth elegant slide, NO spinning, NO flashing void)
target_smash = """                      if (typeof gsap !== 'undefined') {
                          // Animate it flying UP and SMASHING into the panel
                          gsap.to(physicalBlock.position, {
                              y: 1.6, z: -1.0, duration: 1.2, ease: 'back.out(1.5)', 
                              onComplete: () => {
                                  // Destroy physical block and let 2D canvas shockwave take over!
                                  xrScene.remove(physicalBlock);
                                  physicalBlock.geometry.dispose();
                                  physicalBlock.material.dispose();
                                  
                                  // Flash the entire void slightly with the block's color
                                  const originalHex = xrScene.background ? xrScene.background.getHex() : 0x000308;
                                  if (xrScene.background && xrScene.background.setHex) {
                                      xrScene.background.copy(smashColor);
                                      setTimeout(() => { xrScene.background.setHex(originalHex); }, 150);
                                  }
                              }
                          });
                          gsap.to(physicalBlock.rotation, {
                              x: Math.PI * 2, y: Math.PI * 2, duration: 1.2, ease: 'power2.inOut'
                          });
                      }"""

repl_smash = """                      if (typeof gsap !== 'undefined') {
                          // ELEGANT SLIDE: from underneath/behind towards the panel
                          physicalBlock.position.set(0, -2.0, -2.0); // Start underneath and slightly behind
                          
                          gsap.to(physicalBlock.position, {
                              y: 1.6, z: -1.0, duration: 1.5, ease: 'power2.out', 
                              onComplete: () => {
                                  xrScene.remove(physicalBlock);
                                  physicalBlock.geometry.dispose();
                                  physicalBlock.material.dispose();
                              }
                          });
                      }"""
js = js.replace(target_smash, repl_smash)


# 4. Remove the Fake Smash from Welcome
target_fake_smash = """      // FIRE A FAKE 3D BLOCK SMASH SO THEY DEFINITELY SEE THE EFFECTS!
      if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
          const fakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
          fakeBlock.position.set(0, -3.0, -1.0);
          xrScene.add(fakeBlock);
          gsap.to(fakeBlock.position, {
              y: 1.6, z: -1.0, duration: 1.2, ease: 'back.out(1.5)', 
              onComplete: () => {
                  xrScene.remove(fakeBlock);
                  if (xrScene.background && xrScene.background.setHex) {
                      xrScene.background.setHex(0x00ff88);
                      setTimeout(() => { xrScene.background.setHex(0x000308); }, 150);
                  }
              }
          });
          gsap.to(fakeBlock.rotation, { x: Math.PI * 2, y: Math.PI * 2, duration: 1.2, ease: 'power2.inOut' });
      }"""

repl_fake_smash = """      // FIRE ELEGANT FAKE SLIDE BLOCK SO THEY SEE THE NEW ANIMATION
      if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
          const fakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
          fakeBlock.position.set(0, -2.0, -2.0);
          xrScene.add(fakeBlock);
          gsap.to(fakeBlock.position, {
              y: 1.6, z: -1.0, duration: 1.5, ease: 'power2.out', 
              onComplete: () => { xrScene.remove(fakeBlock); }
          });
      }"""
js = js.replace(target_fake_smash, repl_fake_smash)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed raycast tooltips, global particle theming, and elegant block sliding!")
