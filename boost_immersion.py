import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the entire initWebXR function with the new highly immersive version
old_init_pattern = r'function initWebXR\(\) \{.*?(?=function onXRSelect)'
new_init = """function initWebXR() {
  const tCanvas = document.createElement('canvas');
  tCanvas.style.position = 'absolute';
  tCanvas.style.top = '0';
  tCanvas.style.left = '0';
  tCanvas.style.zIndex = '-1';
  document.body.appendChild(tCanvas);

  xrRenderer = new THREE.WebGLRenderer({ canvas: tCanvas, antialias: true, alpha: true });
  xrRenderer.setPixelRatio(window.devicePixelRatio);
  xrRenderer.setSize(window.innerWidth, window.innerHeight);
  xrRenderer.xr.enabled = true;

  xrScene = new THREE.Scene();
  xrScene.background = new THREE.Color('#000308'); // Deep void
  
  // IMMERSION: Thick Volumetric Fog
  xrScene.fog = new THREE.FogExp2('#000308', 0.06);

  // IMMERSION: Infinite Cyberpunk Floor Grid
  const gridHelper = new THREE.GridHelper(100, 100, 0x00ff88, 0x002211);
  gridHelper.position.y = 0; // Floor level
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.4;
  gridHelper.material.blending = THREE.AdditiveBlending;
  xrScene.add(gridHelper);

  xrCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  
  // IMMERSION: Massive Wrap-Around IMAX Screen (180 degrees, towering height)
  // Radius 5, Height 4.5, 180 degrees
  const geometry = new THREE.CylinderGeometry(5, 5, 4.5, 80, 1, true, -Math.PI / 2, Math.PI);
  geometry.scale(-1, 1, 1); 

  xrTexture = new THREE.CanvasTexture(canvas);
  xrTexture.minFilter = THREE.LinearFilter;
  
  const material = new THREE.MeshBasicMaterial({ map: xrTexture, transparent: true });
  xrMesh = new THREE.Mesh(geometry, material);
  xrMesh.position.set(0, 1.8, 0); // Lifted slightly above eye level for dominance
  xrScene.add(xrMesh);

  // IMMERSION: Ambient Screen Aura (Fake Bloom/Light Bleed)
  const auraGeo = new THREE.CylinderGeometry(5.2, 5.2, 5.0, 40, 1, true, -Math.PI / 2, Math.PI);
  auraGeo.scale(-1, 1, 1);
  const auraMat = new THREE.MeshBasicMaterial({ map: xrTexture, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
  const auraMesh = new THREE.Mesh(auraGeo, auraMat);
  auraMesh.position.set(0, 1.8, 0);
  xrScene.add(auraMesh);

  // IMMERSION: Floating Data Stream Particles (Tornado effect)
  const particlesGeo = new THREE.BufferGeometry();
  const particleCount = 8000;
  const posArray = new Float32Array(particleCount * 3);
  const colorsArray = new Float32Array(particleCount * 3);
  
  for(let i=0; i<particleCount; i++) {
    // Distribute in a massive cylinder around the user
    const radius = 2 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 30;
    
    posArray[i*3] = radius * Math.cos(theta);
    posArray[i*3+1] = y;
    posArray[i*3+2] = radius * Math.sin(theta);
    
    // Mix of electric blue and neon green
    const isBlue = Math.random() > 0.5;
    colorsArray[i*3] = 0; // R
    colorsArray[i*3+1] = isBlue ? 0.8 : 1.0; // G
    colorsArray[i*3+2] = isBlue ? 1.0 : 0.5; // B
  }
  
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
  
  const particlesMat = new THREE.PointsMaterial({ 
    size: 0.04, 
    vertexColors: true, 
    transparent: true, 
    opacity: 0.6, 
    blending: THREE.AdditiveBlending 
  });
  window.xrParticles = new THREE.Points(particlesGeo, particlesMat);
  xrScene.add(window.xrParticles);

  // Controller Setup
  xrController1 = xrRenderer.xr.getController(0);
  xrController1.addEventListener('select', onXRSelect);
  xrController1.addEventListener('connected', function (event) { this.gamepad = event.data.gamepad; });
  xrScene.add(xrController1);

  xrController2 = xrRenderer.xr.getController(1);
  xrController2.addEventListener('select', onXRSelect);
  xrController2.addEventListener('connected', function (event) { this.gamepad = event.data.gamepad; });
  xrScene.add(xrController2);

  const controllerModelFactory = new XRControllerModelFactory();
  const grip1 = xrRenderer.xr.getControllerGrip(0);
  grip1.add(controllerModelFactory.createControllerModel(grip1));
  xrScene.add(grip1);

  const grip2 = xrRenderer.xr.getControllerGrip(1);
  grip2.add(controllerModelFactory.createControllerModel(grip2));
  xrScene.add(grip2);

  const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
  xrController1.add(new THREE.Line(laserGeo, laserMat));
  xrController2.add(new THREE.Line(laserGeo, laserMat));

  xrRaycaster = new THREE.Raycaster();

  // Spatial 3D Audio
  window.xrAudioListener = new THREE.AudioListener();
  xrCamera.add(window.xrAudioListener);
  window.xrHoverSound = new THREE.PositionalAudio(window.xrAudioListener);
  
  const osc = window.xrAudioListener.context.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, window.xrAudioListener.context.currentTime);
  osc.start(0);
  window.xrHoverSound.setNodeSource(osc);
  window.xrHoverSound.setRefDistance(1);
  window.xrHoverSound.setVolume(0);
  xrMesh.add(window.xrHoverSound);

  const sessionInit = {
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  };
  
  const vrBtn = VRButton.createButton(xrRenderer, sessionInit);
  vrBtn.style.position = 'fixed';
  vrBtn.style.bottom = '20px';
  vrBtn.style.right = '20px';
  vrBtn.style.zIndex = '99999';
  vrBtn.style.fontFamily = "'Space Mono', monospace";
  vrBtn.style.background = 'rgba(0, 255, 136, 0.15)';
  vrBtn.style.color = '#00ff88';
  vrBtn.style.border = '1px solid #00ff88';
  vrBtn.style.borderRadius = '4px';
  vrBtn.style.padding = '12px 24px';
  vrBtn.style.cursor = 'pointer';
  vrBtn.style.fontWeight = 'bold';
  document.body.appendChild(vrBtn);

  xrRenderer.xr.addEventListener('sessionstart', () => {
    isVRActive = true;
    canvas.style.opacity = '0'; 
    document.body.style.background = 'transparent';
  });

  xrRenderer.xr.addEventListener('sessionend', () => {
    isVRActive = false;
    canvas.style.opacity = '1';
  });
}
"""

js = re.sub(old_init_pattern, new_init, js, flags=re.DOTALL)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected extreme immersion features into initWebXR")
