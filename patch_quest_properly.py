import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

xr_logic = """
// ============================================================================
// META QUEST WEBXR COMPATIBILITY ENGINE
// ============================================================================
let xrRenderer, xrScene, xrCamera, xrTexture, xrMesh;
let xrController1, xrController2, xrRaycaster;
let isVRActive = false;
let lastIntersectedUV = null;

function initWebXR() {
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
  const geometry = new THREE.CylinderGeometry(5, 5, 4.5, 80, 1, true, -Math.PI / 2, Math.PI);
  geometry.scale(-1, 1, 1); 

  // Make sure canvas is available
  const cvs = document.getElementById('mosaic-canvas');
  xrTexture = new THREE.CanvasTexture(cvs);
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

  // IMMERSION: Floating Data Stream Particles
  const particlesGeo = new THREE.BufferGeometry();
  const particleCount = 8000;
  const posArray = new Float32Array(particleCount * 3);
  const colorsArray = new Float32Array(particleCount * 3);
  
  for(let i=0; i<particleCount; i++) {
    const radius = 2 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 30;
    
    posArray[i*3] = radius * Math.cos(theta);
    posArray[i*3+1] = y;
    posArray[i*3+2] = radius * Math.sin(theta);
    
    const isBlue = Math.random() > 0.5;
    colorsArray[i*3] = 0; // R
    colorsArray[i*3+1] = isBlue ? 0.8 : 1.0; // G
    colorsArray[i*3+2] = isBlue ? 1.0 : 0.5; // B
  }
  
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
  
  const particlesMat = new THREE.PointsMaterial({ 
    size: 0.04, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending 
  });
  window.xrParticles = new THREE.Points(particlesGeo, particlesMat);
  xrScene.add(window.xrParticles);

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
    const vrStyle = document.createElement('style');
    vrStyle.id = 'vr-immersive-style';
    vrStyle.innerHTML = `
      html, body, #app-container, .main-layout, .canvas-container {
        background: transparent !important; background-color: transparent !important; box-shadow: none !important;
      }
      #mosaic-canvas { opacity: 0 !important; pointer-events: none !important; }
      .app-header { background: rgba(8, 9, 12, 0.2) !important; border-bottom: 1px solid rgba(0, 255, 136, 0.1) !important; }
      .playback-controls { background: rgba(8, 9, 12, 0.4) !important; border: 1px solid rgba(0, 255, 136, 0.2) !important; }
      ::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(vrStyle);
  });

  xrRenderer.xr.addEventListener('sessionend', () => {
    isVRActive = false;
    const vrStyle = document.getElementById('vr-immersive-style');
    if (vrStyle) vrStyle.remove();
  });
}

function onXRSelect(event) {
  if (lastIntersectedUV) {
    const syntheticEvent = new MouseEvent('click', {
      clientX: lastIntersectedUV.x * window.innerWidth,
      clientY: (1 - lastIntersectedUV.y) * window.innerHeight,
      bubbles: true, cancelable: true, view: window
    });
    const cvs = document.getElementById('mosaic-canvas');
    if (cvs) cvs.dispatchEvent(syntheticEvent);
  }
}

function updateXRInteraction() {
  if (!isVRActive || !xrRenderer.xr.isPresenting) return;
  
  if (xrTexture) xrTexture.needsUpdate = true;
  
  if (window.xrParticles) {
    const speed = (window.sessionDirectCount && window.sessionDirectCount > 500) ? 0.005 : 0.0005; 
    window.xrParticles.rotation.y += speed;
    window.xrParticles.rotation.x += speed * 0.5;
  }
  
  let intersected = false;
  [xrController1, xrController2].forEach(controller => {
    if (!controller) return;
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    xrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    const hits = xrRaycaster.intersectObject(xrMesh);
    if (hits.length > 0) {
      intersected = true;
      if (lastIntersectedUV && (Math.abs(lastIntersectedUV.x - hits[0].uv.x) > 0.01 || Math.abs(lastIntersectedUV.y - hits[0].uv.y) > 0.01)) {
         if (controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0) {
            controller.gamepad.hapticActuators[0].pulse(0.1, 10);
         }
      }
      if (window.xrHoverSound) window.xrHoverSound.setVolume(0.05);
      
      lastIntersectedUV = hits[0].uv;
      const syntheticEvent = new MouseEvent('mousemove', {
        clientX: hits[0].uv.x * window.innerWidth,
        clientY: (1 - hits[0].uv.y) * window.innerHeight,
        bubbles: true, cancelable: true, view: window
      });
      const cvs = document.getElementById('mosaic-canvas');
      if (cvs) cvs.dispatchEvent(syntheticEvent);
    }
    
    if (controller.gamepad && controller.gamepad.axes && controller.gamepad.axes.length >= 4) {
       const yAxis = controller.gamepad.axes[3]; 
       if (Math.abs(yAxis) > 0.1) {
          xrMesh.position.z -= yAxis * 0.05;
          if (xrMesh.position.z > -1) xrMesh.position.z = -1;
          if (xrMesh.position.z < -10) xrMesh.position.z = -10;
       }
    }
  });
  
  if (!intersected && lastIntersectedUV) {
    lastIntersectedUV = null;
    if (window.xrHoverSound) window.xrHoverSound.setVolume(0);
    const hoverTooltip = document.getElementById('hover-tooltip');
    if (hoverTooltip) hoverTooltip.style.visibility = 'hidden';
  }
  
  xrRenderer.render(xrScene, xrCamera);
}
"""

if 'initWebXR' not in js:
    js += '\n' + xr_logic + '\nsetTimeout(initWebXR, 500);\n'

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Properly patched quest.js with full XR engine.")
