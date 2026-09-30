import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "isVRActive = true;"
repl = """isVRActive = true;
  // PLAY A MASSIVE WELCOME ANIMATION SO THEY KNOW EFFECTS ARE WORKING
  setTimeout(() => {
      if (typeof window.showVRNotification === 'function') {
          window.showVRNotification('VR SYSTEMS ONLINE', false);
      }
      if (typeof gsap !== 'undefined' && window.xrGridHelper) {
          gsap.fromTo(window.xrGridHelper.position,
             {y: -2.0}, {y: 0, duration: 1.2, ease: 'elastic.out(1, 0.3)'}
          );
          window.xrGridHelper.material.color.setHex(0xffffff);
          gsap.to(window.xrGridHelper.material.color, {r: 0, g: 1, b: 0.53, duration: 1.2, ease: 'power2.out'});
      }
  }, 1000);"""
js = js.replace(target, repl)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added Welcome Animation!")
