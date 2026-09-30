import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """      if (typeof gsap !== 'undefined' && window.xrGridHelper) {
          gsap.fromTo(window.xrGridHelper.position,
             {y: -2.0}, {y: 0, duration: 1.2, ease: 'elastic.out(1, 0.3)'}
          );
          window.xrGridHelper.material.color.setHex(0xffffff);
          gsap.to(window.xrGridHelper.material.color, {r: 0, g: 1, b: 0.53, duration: 1.2, ease: 'power2.out'});
      }"""

js = js.replace(target, "      if (window.xrGridHelper) { window.xrGridHelper.position.y = 0; }")

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Ripped out Grid GSAP!")
