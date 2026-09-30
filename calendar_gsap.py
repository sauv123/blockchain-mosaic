import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"archiveDrawer\.classList\.toggle\('open'\);"
repl = """const isDrawerOpen = archiveDrawer.classList.toggle('open');
  if (isDrawerOpen && typeof gsap !== 'undefined') {
      gsap.fromTo('.calendar-day', 
          { opacity: 0, scale: 0.2, y: 20 }, 
          { opacity: 1, scale: 1, y: 0, stagger: 0.015, ease: 'back.out(1.5)', duration: 0.5, overwrite: true }
      );
      gsap.fromTo('.drawer-header h2', 
          { x: 30, opacity: 0 }, 
          { x: 0, opacity: 1, ease: 'power3.out', duration: 0.4, delay: 0.1, overwrite: true }
      );
  }"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added GSAP stagger animations to the calendar view!")
