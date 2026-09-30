import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Animate the 3D cubes when a new block arrives
old_scale = "const scaleSize = (blockH * 0.8) * 4; // Arbitrary nice scale\n       dummy.scale.set(scaleSize, scaleSize, isHovered ? scaleSize * 2 : scaleSize * 0.5);"

new_scale = """const scaleSize = (blockH * 0.8) * 4; // Arbitrary nice scale
       let spawnScale = 1;
       let zSpawnPulse = 0;
       
       if (block._liveMintedTime) {
           const age = Date.now() - block._liveMintedTime;
           if (age < 2000) {
               // Elastic ease out
               const t = age / 2000;
               spawnScale = Math.sin(-13 * (t + 1) * Math.PI/2) * Math.pow(2, -10 * t) + 1;
               zSpawnPulse = Math.sin(t * Math.PI) * 2.0; // Pushes OUT and returns
           }
       }
       
       dummy.scale.set(scaleSize * spawnScale, scaleSize * spawnScale, isHovered ? scaleSize * 2 : (scaleSize * 0.5) + zSpawnPulse);
       
       // Pop outwards slightly on spawn
       if (zSpawnPulse > 0) {
           dummy.position.x -= Math.sin(theta) * zSpawnPulse;
           dummy.position.z += Math.cos(theta) * zSpawnPulse;
       }"""

js = js.replace(old_scale, new_scale)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added block spawn animations in VR!")
