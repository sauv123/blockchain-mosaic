import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Inject Reactive Void (Particle System) and Positional Audio into initWebXR()
init_pattern = r"xrScene\.background = new THREE\.Color\('#00050A'\); // Deep cinematic void"

void_injection = """  xrScene.background = new THREE.Color('#00050A');
  
  // XR FEATURE 2: The Reactive Void (Environmental Ambiance)
  const particlesGeo = new THREE.BufferGeometry();
  const particleCount = 3000;
  const posArray = new Float32Array(particleCount * 3);
  for(let i=0; i<particleCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 40;
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particlesMat = new THREE.PointsMaterial({ size: 0.05, color: '#00ff88', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending });
  window.xrParticles = new THREE.Points(particlesGeo, particlesMat);
  xrScene.add(window.xrParticles);

  // XR FEATURE 3: Spatial 3D Audio (Positional Listener on Camera)
  window.xrAudioListener = new THREE.AudioListener();
  xrCamera.add(window.xrAudioListener);
  window.xrHoverSound = new THREE.PositionalAudio(window.xrAudioListener);
  
  // Generate a procedural hum for the laser
  const osc = window.xrAudioListener.context.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, window.xrAudioListener.context.currentTime);
  osc.start(0);
  window.xrHoverSound.setNodeSource(osc);
  window.xrHoverSound.setRefDistance(1);
  window.xrHoverSound.setVolume(0); // silent until hover
  xrMesh.add(window.xrHoverSound); // sound emanates from the screen
"""
js = js.replace("xrScene.background = new THREE.Color('#00050A'); // Deep cinematic void", void_injection)


# 2. Inject Haptics, Thumbsticks, and Void Rotation into updateXRInteraction()
update_start_pattern = r"function updateXRInteraction\(\) \{"
update_injection = """function updateXRInteraction() {
  if (!isVRActive || !xrRenderer.xr.isPresenting) return;
  
  // XR FEATURE 2: Rotate the Reactive Void based on Network Congestion
  if (window.xrParticles) {
    const speed = window.sessionDirectCount > 500 ? 0.005 : 0.0005; 
    window.xrParticles.rotation.y += speed;
    window.xrParticles.rotation.x += speed * 0.5;
  }
"""
js = js.replace("function updateXRInteraction() {", update_injection)

# Inside the controller loop of updateXRInteraction()
loop_pattern = r"if \(hits\.length > 0\) \{"
loop_injection = """if (hits.length > 0) {
      // XR FEATURE 1: Micro-Haptics on hover movement
      if (lastIntersectedUV && (Math.abs(lastIntersectedUV.x - hits[0].uv.x) > 0.01 || Math.abs(lastIntersectedUV.y - hits[0].uv.y) > 0.01)) {
         if (controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
            controller.gamepad.hapticActuators[0].pulse(0.1, 10); // subtle tick
         }
      }
      
      // XR FEATURE 3: Spatial 3D Audio activation
      if (window.xrHoverSound) {
         window.xrHoverSound.setVolume(0.05); // audible hum when looking at grid
      }
"""
js = js.replace("if (hits.length > 0) {", loop_injection)

# And muting sound / stopping haptics when not looking
not_hit_pattern = r"if \(!intersected && lastIntersectedUV\) \{"
not_hit_injection = """if (!intersected && lastIntersectedUV) {
    // Stop XR FEATURE 3 spatial audio
    if (window.xrHoverSound) window.xrHoverSound.setVolume(0);
"""
js = js.replace("if (!intersected && lastIntersectedUV) {", not_hit_injection)

# Thumbsticks handling inside the controller iteration
thumbstick_injection = """
  // XR FEATURE 4: Ergonomic Thumbstick Controls (Screen Distance)
  [xrController1, xrController2].forEach(controller => {
    if (!controller || !controller.gamepad) return;
    const axes = controller.gamepad.axes;
    if (axes && axes.length >= 4) {
       const yAxis = axes[3]; // Right/Left stick Y depending on mapping
       if (Math.abs(yAxis) > 0.1) {
          // Push away or pull closer
          xrMesh.position.z -= yAxis * 0.05;
          // Clamp distance
          if (xrMesh.position.z > -1) xrMesh.position.z = -1;
          if (xrMesh.position.z < -10) xrMesh.position.z = -10;
       }
    }
  });
"""
# inject right before xrRenderer.render(xrScene, xrCamera);
js = js.replace("xrRenderer.render(xrScene, xrCamera);", thumbstick_injection + "\n  xrRenderer.render(xrScene, xrCamera);")


with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected all 4 XR exclusive features successfully.")
