import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the render loop hook for WebXR
# Replace all instances of `requestAnimationFrame(draw);` in the draw function (or anywhere)
bad_loop = 'requestAnimationFrame(draw);'
good_loop = """if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {
      // Three.js WebXR requires setAnimationLoop, so we skip manual requestAnimationFrame
    } else {
      requestAnimationFrame(draw);
    }"""
js = js.replace(bad_loop, good_loop)

# Inject xrRenderer.setAnimationLoop when VR session starts
bad_session = """  xrRenderer.xr.addEventListener('sessionstart', () => {
    isVRActive = true;"""
    
good_session = """  xrRenderer.xr.addEventListener('sessionstart', () => {
    isVRActive = true;
    xrRenderer.setAnimationLoop(draw);"""

js = js.replace(bad_session, good_session)

bad_end = """  xrRenderer.xr.addEventListener('sessionend', () => {
    isVRActive = false;"""

good_end = """  xrRenderer.xr.addEventListener('sessionend', () => {
    isVRActive = false;
    xrRenderer.setAnimationLoop(null);
    requestAnimationFrame(draw);"""

js = js.replace(bad_end, good_end)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("WebXR loop patched!")
