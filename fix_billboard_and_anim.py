import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Move Billboard Behind the user
js = js.replace("window.xrBillboard.position.set(-7, 2, -2); // Off to the left\n  window.xrBillboard.rotation.y = Math.PI / 4;", "window.xrBillboard.position.set(0, 2, 8); // Behind the user\n  window.xrBillboard.rotation.y = Math.PI;")

# 2. Exaggerate the 2D Canvas Slide-up Animation
target_draw = """              // Elastic slide up from below
              const slideUp = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
              cy += (1 - slideUp) * 200; // Slide up from 200px below
              radius *= (slideUp * 1.5); // Pop size"""

replacement_draw = """              // Elastic slide up from below (EXAGGERATED)
              const slideUp = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
              cy += (1 - Math.max(0, slideUp)) * 400; // Massive 400px slide
              radius *= (Math.max(0.1, slideUp) * 2.5); // Massive pop size
              
              // Draw a massive glowing target ring around the spawning block so they can't miss it!
              ctx.strokeStyle = `rgba(0, 255, 136, ${1 - t})`;
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(cx, cy, radius + (t * 50), 0, Math.PI*2);
              ctx.stroke();"""

js = js.replace(target_draw, replacement_draw)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Moved billboard behind user and exaggerated slide-up animation!")
