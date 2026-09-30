import re
with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_gsap_cursor = """  // Use GSAP quickSetter for buttery smooth 120fps hardware acceleration
  const xSetter = gsap.quickSetter(cursor, "x", "px");
  const ySetter = gsap.quickSetter(cursor, "y", "px");

  window.addEventListener('mousemove', (e) => {
    xSetter(e.clientX);
    ySetter(e.clientY);"""

new_gsap_cursor = """  window.addEventListener('mousemove', (e) => {
    // Elegant trailing aura using GSAP
    gsap.to(cursor, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.15,
      ease: 'power2.out',
      overwrite: 'auto'
    });"""

js = js.replace(old_gsap_cursor, new_gsap_cursor)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Added elegant mouse trail.")
