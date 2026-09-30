import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"if \(anim\.notif\) \{\s*anim\.notif\.position\.y \+= 0\.005; // Float upwards softly\s*if \(anim\.progress > 0\.7\) \{ \s*anim\.notif\.material\.opacity = \(1\.0 - anim\.progress\) / 0\.3;\s*\}\s*\}"
repl = """if (anim.notif) {
                 anim.notif.position.y += 0.005; 
                 if (anim.progress < 0.2) {
                     anim.notif.material.opacity = anim.progress * 5.0; // Fade in smoothly
                 } else if (anim.progress > 0.7) { 
                     anim.notif.material.opacity = (1.0 - anim.progress) / 0.3; // Fade out
                 } else {
                     anim.notif.material.opacity = 1.0;
                 }
              }"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed notification opacity fading logic!")
