import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. FIX HOVER TOOLTIPS
# Force window.innerWidth/Height since canvas fills the screen
target_raycast = """         // The canvas expects CSS pixels, NOT internal resolution!
         const exactClientX = rect.left + (uv.x * rect.width);
         const exactClientY = rect.top + ((1 - uv.y) * rect.height);"""
repl_raycast = """         // Force window dimensions because the canvas might be structurally hidden but fills the window
         const exactClientX = uv.x * window.innerWidth;
         const exactClientY = (1 - uv.y) * window.innerHeight;"""
js = js.replace(target_raycast, repl_raycast)


# 2. REMOVE THE 2D "GIANT BLUE SQUARE" SHOCKWAVE
# It's confusing the user and looks bad.
target_2d_shockwave = """              // 2D CANVAS ANIMATION: Massive Scale-In + Shockwave!
              const scalePop = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
              radius = Math.max(1, radius * scalePop * 4.0); // 400% size pop
              
              // Render a massive glowing square shockwave
              ctx.fillStyle = `rgba(0, 255, 136, ${1 - t})`;
              ctx.fillRect(cx - radius*2, cy - radius*2, radius*4, radius*4);
              
              ctx.strokeStyle = `rgba(255, 255, 255, ${1 - t})`;
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.arc(cx, cy, radius + (t * 100), 0, Math.PI*2);
              ctx.stroke();"""
repl_2d_shockwave = """              // Just a subtle pulse, no giant squares
              radius = Math.max(1, radius * (1 + (1 - t) * 0.5));"""
js = js.replace(target_2d_shockwave, repl_2d_shockwave)

# Also remove it from the fallback instances if any exist
js = re.sub(r'// 2D CANVAS ANIMATION: Massive Scale-In \+ Shockwave!.*?ctx\.stroke\(\);', 'radius = Math.max(1, radius * (1 + (1 - t) * 0.5));', js, flags=re.DOTALL)


# 3. FIX PARTICLE THEMING VIA CSS VARIABLES (100% reliable)
target_particles = """    // ALWAYS MATCH PARTICLES TO GLOBAL THEME
    if (window.xrParticles && typeof THEMES !== 'undefined' && typeof currentTheme !== 'undefined') {
        const globalTheme = THEMES[currentTheme];
        if (globalTheme && globalTheme.accent) {
            const theme = globalTheme;
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
    }"""
repl_particles = """    // ALWAYS MATCH PARTICLES TO GLOBAL THEME (using CSS variables)
    if (window.xrParticles) {
        const style = getComputedStyle(document.body);
        const accent = style.getPropertyValue('--accent-color').trim() || '#00ff88';
        if (!window.lastParticleAccent || window.lastParticleAccent !== accent) {
            window.lastParticleAccent = accent;
            const tColor = new THREE.Color().setStyle(accent);
            const colors = window.xrParticles.geometry.attributes.color.array;
            for(let c=0; c<colors.length; c+=3) {
                colors[c] = tColor.r;
                colors[c+1] = tColor.g;
                colors[c+2] = tColor.b;
            }
            window.xrParticles.geometry.attributes.color.needsUpdate = true;
        }
    }"""
js = js.replace(target_particles, repl_particles)


# 4. REWRITE THE BILLBOARD (GLASS PANEL) TO SHOW THE HUMAN STORY + 12s NOTIFICATIONS
# First, let's redefine the updateBillboard function
target_billboard_func = """function updateBillboard() {
  if (!window.xrBillboardCtx || !window.xrBillboardTex) return;
  const ctx = window.xrBillboardCtx;
  const cvs = ctx.canvas;
  
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  
  // Draw glass background
  ctx.fillStyle = 'rgba(8, 9, 12, 0.85)';
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, cvs.width-4, cvs.height-4);
  
  // Read live DOM data
  const latestBlockEl = document.getElementById('latest-block-val');
  const avgFeeEl = document.getElementById('avg-fee-val');
  
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 36px "Space Mono", monospace';
  ctx.fillText('LIVE NETWORK STATS', 40, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px "Space Mono", monospace';
  ctx.fillText('BLOCK: ' + (latestBlockEl ? latestBlockEl.innerText : 'SYNCING...'), 40, 130);
  ctx.fillText('FEE:   ' + (avgFeeEl ? avgFeeEl.innerText : '...'), 40, 190);
  
  window.xrBillboardTex.needsUpdate = true;
}"""

repl_billboard_func = """function updateBillboard() {
  if (!window.xrBillboardCtx || !window.xrBillboardTex) return;
  const ctx = window.xrBillboardCtx;
  const cvs = ctx.canvas;
  
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  
  // Draw elegant glass background
  ctx.fillStyle = 'rgba(8, 9, 12, 0.7)';
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, cvs.width-2, cvs.height-2);
  
  // Calculate the human story text
  let totalTx = 0;
  let totalUsd = 0;
  if (typeof blocks !== 'undefined') {
      blocks.forEach(b => {
          if (b.transactions) {
              totalTx += b.transactions.length;
              totalUsd += b.transactions.reduce((sum, t) => sum + (t.valueUsd||0), 0);
          }
      });
  }
  
  const formattedUsd = totalUsd > 1000000 ? (totalUsd / 1000000).toFixed(1) + 'M' : Math.round(totalUsd).toLocaleString();
  let storyText = `Today, ${totalTx} human payments`;
  let storyText2 = `moved $${formattedUsd}`;
  
  // Draw the text cleanly
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(storyText, cvs.width/2, 120);
  
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent-color').trim() || '#00ff88';
  ctx.font = 'bold 42px "Space Mono", monospace';
  ctx.fillText(storyText2, cvs.width/2, 180);
  
  // If there is a recent notification (within the last 6 seconds)
  if (window.lastNotificationText && Date.now() - window.lastNotificationTime < 6000) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Space Mono", monospace';
      ctx.fillText(window.lastNotificationText, cvs.width/2, 260);
  }
  
  window.xrBillboardTex.needsUpdate = true;
}"""
js = js.replace(target_billboard_func, repl_billboard_func)


# 5. INJECT NOTIFICATIONS INTO THE BILLBOARD INSTEAD OF THE HUD
target_ws_notif = """              if (typeof window.showVRNotification === 'function') {
                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : 0;
                  
                  // ==========================================
                  // 3D PHYSICAL BLOCK SMASH ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {"""

repl_ws_notif = """              if (typeof window.updateBillboard === 'function') {
                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : 0;
                  const txCount = newBlock.transactions ? newBlock.transactions.length : 0;
                  
                  // Set notification text for the billboard
                  window.lastNotificationTime = Date.now();
                  if (newBlock.whale_flag === 1) {
                      window.lastNotificationText = `🚨 WHALE DETECTED: $${Math.round(val).toLocaleString()} 🚨`;
                  } else {
                      window.lastNotificationText = `NEW BLOCK: ${txCount} TRANSACTIONS`;
                  }
                  
                  // ==========================================
                  // 3D ELEGANT SLIDE ANIMATION
                  // ==========================================
                  if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined') {"""
js = js.replace(target_ws_notif, repl_ws_notif)


# 6. FIX THE 3D SLIDE ANIMATION (And remove the fake welcome block)
# Wait, the welcome block is still firing and the user hated it. Let's remove the Fake Slide from Welcome completely!
target_welcome = """      // FIRE ELEGANT FAKE SLIDE BLOCK SO THEY SEE THE NEW ANIMATION
      if (typeof THREE !== 'undefined' && typeof xrScene !== 'undefined' && typeof gsap !== 'undefined') {
          const fakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
          fakeBlock.position.set(0, -2.0, -2.0);
          xrScene.add(fakeBlock);
          gsap.to(fakeBlock.position, {
              y: 1.6, z: -1.0, duration: 1.5, ease: 'power2.out', 
              onComplete: () => { xrScene.remove(fakeBlock); }
          });
      }"""
repl_welcome = """      // Removed fake welcome block as requested."""
js = js.replace(target_welcome, repl_welcome)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Massive XR cleanup completed!")
