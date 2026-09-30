with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

old_keyframes = """@keyframes cinematic-breathe {
  0% { transform: scale(1) translateY(0); filter: drop-shadow(0 4px 20px rgba(0,0,0,0.3)); }
  50% { transform: scale(1.01) translateY(-2px); filter: drop-shadow(0 8px 30px rgba(0,0,0,0.5)); }
  100% { transform: scale(1) translateY(0); filter: drop-shadow(0 4px 20px rgba(0,0,0,0.3)); }
}"""

new_keyframes = """@keyframes cinematic-breathe {
  0% { transform: translate(-50%, -50%) scale(1) translateY(0); filter: drop-shadow(0 4px 20px rgba(0,0,0,0.3)); }
  50% { transform: translate(-50%, -50%) scale(1.01) translateY(-2px); filter: drop-shadow(0 8px 30px rgba(0,0,0,0.5)); }
  100% { transform: translate(-50%, -50%) scale(1) translateY(0); filter: drop-shadow(0 4px 20px rgba(0,0,0,0.3)); }
}"""

css = css.replace(old_keyframes, new_keyframes)

# Also fix the GSAP animation that might overwrite transform!
# Oh wait, GSAP animation in mosaic.js!
# Let's check mosaic.js for any GSAP targeting weatherLine that overwrites transform.

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Fixed CSS transform in cinematic-breathe.")
