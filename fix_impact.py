import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"if \(anim\.progress === 1\.008\) \{ // Just finished\s*spawnImpactRipple\(anim\.targetX, anim\.targetY, anim\.targetZ, anim\.color\);\s*\}"
repl = """if (!anim.hasImpacted) { 
                 anim.hasImpacted = true;
                 spawnImpactRipple(anim.targetX, anim.targetY, anim.targetZ, anim.color);
              }"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed float precision bug!")
