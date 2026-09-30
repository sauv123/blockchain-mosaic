import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. LAYOUT
# Rotate xrMesh to be IN FRONT (z = -5, y = 1.6, rotation = 0)
js = js.replace("xrMesh.position.set(0, 1.6, 0);\n  xrMesh.rotation.y = Math.PI;", "xrMesh.position.set(0, 1.6, 0);\n  xrMesh.rotation.y = 0; // Front")

# Put Billboard ON THE RIGHT
js = js.replace("window.xrBillboard.position.set(6, 2, 0); // On the right side\n  window.xrBillboard.rotation.y = -Math.PI/4;", "window.xrBillboard.position.set(5, 2, -2); // Front-Right\n  window.xrBillboard.rotation.y = -Math.PI/4;")

# Put HUD in front, above
js = js.replace("window.xrNotifHUD.position.set(0, 3.5, -3);", "window.xrNotifHUD.position.set(0, 2.5, -3);")


# 2. FIX SLIDE UP ANIMATION
# In drawTile, the previous slideUp logic might have been clipped or missed.
# Let's use a scale-up + glow instead, which is 100% reliable and doesn't get clipped by the bottom edge.
target_anim = """              // Elastic slide up from below (EXAGGERATED)
              const slideUp = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
              cy += (1 - Math.max(0, slideUp)) * 400; // Massive 400px slide
              radius *= (Math.max(0.1, slideUp) * 2.5); // Massive pop size
              
              // Draw a massive glowing target ring around the spawning block so they can't miss it!
              ctx.strokeStyle = `rgba(0, 255, 136, ${1 - t})`;
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(cx, cy, radius + (t * 50), 0, Math.PI*2);
              ctx.stroke();"""

replacement_anim = """              // 2D CANVAS ANIMATION: Massive Scale-In + Shockwave!
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

js = js.replace(target_anim, replacement_anim)


# 3. FIX GROUND ANIMATION
# The previous ground animation bounced from -0.2 to 0. Make it massive (-2.0 to 0).
target_ground = """                  gsap.fromTo(window.xrGridHelper.position,
                     {y: -0.2}, {y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)'}
                  );"""
replacement_ground = """                  gsap.fromTo(window.xrGridHelper.position,
                     {y: -2.0}, {y: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)'}
                  );
                  // Make the grid flash white
                  window.xrGridHelper.material.color.setHex(0xffffff);
                  gsap.to(window.xrGridHelper.material.color, {r: 0, g: 1, b: 0.53, duration: 0.8, ease: 'power2.out'});"""
js = js.replace(target_ground, replacement_ground)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed layout, 2D spawn animations, and massive ground animations!")
