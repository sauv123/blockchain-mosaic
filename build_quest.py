import re

with open('display/quest.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Point to quest.js
html = re.sub(r'mosaic\.js\?v=\d+', 'quest.js?v=' + str(int(__import__('time').time())), html)
if 'mosaic.js"' in html:
    html = html.replace('mosaic.js"', 'quest.js?v=' + str(int(__import__('time').time())) + '"')

# Add import map
if 'importmap' not in html:
    import_map = """
  <!-- Import maps polyfill for WebXR -->
  <script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"></script>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }
    }
  </script>
</head>"""
    html = html.replace('</head>', import_map)

with open('display/quest.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

if 'import * as THREE' not in js:
    js_imports = """import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

"""
    js = js_imports + js

xr_logic = """
// ============================================================================
// META QUEST WEBXR COMPATIBILITY ENGINE
// Projects the exact 2D application onto an immersive curved VR display 
// and bridges Meta Quest laser interactions to native DOM mouse events.
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
  xrScene.background = new THREE.Color('#00050A'); // Deep cinematic void

  xrCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  
  // Create a massive curved cinema screen for the 2D canvas
  const geometry = new THREE.CylinderGeometry(4, 4, 3, 64, 1, true, -Math.PI / 3, Math.PI / 1.5);
  geometry.scale(-1, 1, 1); 

  xrTexture = new THREE.CanvasTexture(canvas);
  xrTexture.minFilter = THREE.LinearFilter;
  
  const material = new THREE.MeshBasicMaterial({ map: xrTexture, transparent: true });
  xrMesh = new THREE.Mesh(geometry, material);
  xrMesh.position.set(0, 1.6, 0); 
  xrScene.add(xrMesh);

  xrController1 = xrRenderer.xr.getController(0);
  xrController1.addEventListener('select', onXRSelect);
  xrScene.add(xrController1);

  xrController2 = xrRenderer.xr.getController(1);
  xrController2.addEventListener('select', onXRSelect);
  xrScene.add(xrController2);

  const controllerModelFactory = new XRControllerModelFactory();
  const grip1 = xrRenderer.xr.getControllerGrip(0);
  grip1.add(controllerModelFactory.createControllerModel(grip1));
  xrScene.add(grip1);

  const grip2 = xrRenderer.xr.getControllerGrip(1);
  grip2.add(controllerModelFactory.createControllerModel(grip2));
  xrScene.add(grip2);

  const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
  xrController1.add(new THREE.Line(laserGeo, laserMat));
  xrController2.add(new THREE.Line(laserGeo, laserMat));

  xrRaycaster = new THREE.Raycaster();

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

function onXRSelect(event) {
  if (lastIntersectedUV) {
    const syntheticEvent = new MouseEvent('click', {
      clientX: lastIntersectedUV.x * window.innerWidth,
      clientY: (1 - lastIntersectedUV.y) * window.innerHeight,
      bubbles: true,
      cancelable: true,
      view: window
    });
    canvas.dispatchEvent(syntheticEvent);
  }
}

function updateXRInteraction() {
  if (!isVRActive || !xrRenderer.xr.isPresenting) return;
  
  if (xrTexture) xrTexture.needsUpdate = true;
  
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
      lastIntersectedUV = hits[0].uv;
      
      const syntheticEvent = new MouseEvent('mousemove', {
        clientX: hits[0].uv.x * window.innerWidth,
        clientY: (1 - hits[0].uv.y) * window.innerHeight,
        bubbles: true,
        cancelable: true,
        view: window
      });
      canvas.dispatchEvent(syntheticEvent);
    }
  });
  
  if (!intersected && lastIntersectedUV) {
    lastIntersectedUV = null;
    if (hoverTooltip) hoverTooltip.style.display = 'none';
  }
  
  xrRenderer.render(xrScene, xrCamera);
}
"""

if 'initWebXR()' not in js:
    js = js.replace('// === RENDER LOOP ===', xr_logic + '\n// === RENDER LOOP ===')
    js = js.replace('resizeCanvas();\n  window.addEventListener(\'resize\', resizeCanvas);', 'resizeCanvas();\n  window.addEventListener(\'resize\', resizeCanvas);\n  setTimeout(initWebXR, 500);')
    js = js.replace('requestAnimationFrame(draw);\n}', 'requestAnimationFrame(draw);\n  if (typeof updateXRInteraction === "function") updateXRInteraction();\n}')

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected native WebXR wrapper into quest files.")
