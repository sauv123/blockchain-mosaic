import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target_slide = """                          // ELEGANT SLIDE: from underneath/behind towards the panel
                          physicalBlock.position.set(0, -2.0, -2.0); // Start underneath and slightly behind
                          
                          gsap.to(physicalBlock.position, {
                              y: 1.6, z: -1.0, duration: 1.5, ease: 'power2.out', """

repl_slide = """                          // ELEGANT SLIDE: from underneath the FRONT of the curved panel
                          physicalBlock.position.set(0, -3.0, -6.0); // Start below the giant screen
                          
                          gsap.to(physicalBlock.position, {
                              y: 1.6, z: -6.0, duration: 2.0, ease: 'power2.out', """

js = js.replace(target_slide, repl_slide)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed Z-coordinates of the slide animation!")
