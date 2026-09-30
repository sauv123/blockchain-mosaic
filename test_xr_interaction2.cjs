const THREE = require('three');

global.document = { getElementById: () => ({ dispatchEvent: () => {} }) };
global.window = { xrActiveBlocks: [] };

const fs = require('fs');
const js = fs.readFileSync('display/trace_vr.js', 'utf8');

const match = js.match(/function updateXRInteraction\(\) \{([\s\S]*?)^\}/m);
if (match) {
    let fnBody = match[1];
    fnBody = fnBody.replace(/if \(\!isVRActive \|\| \!xrRenderer\.xr\.isPresenting\) return;/g, '');
    
    global.xrRenderer = { xr: { isPresenting: true } };
    global.isVRActive = true;
    global.xrTexture = { needsUpdate: false };
    global.xrScene = { remove: () => {} };
    
    global.xrController1 = { matrixWorld: new THREE.Matrix4() };
    global.xrController2 = { matrixWorld: new THREE.Matrix4() };
    global.xrRaycaster = { setFromCamera: () => {}, intersectObjects: () => [] };
    global.xrCamera = { position: new THREE.Vector3() };
    global.hoverTooltip = { style: {} };
    global.vrTooltipMesh = { visible: false };
    global.THREE = THREE;
    global.vrTooltipCtx = { clearRect: ()=>{}, fillStyle: '', fillText: ()=>{}, font: '', strokeRect: ()=>{}, strokeStyle: '' };
    global.vrTooltipTex = { needsUpdate: false };
    
    window.xrActiveBlocks.push({
        startX: 0, targetX: 0,
        startY: -0.5, targetY: 1.8,
        startZ: -1.5, targetZ: -4.8,
        progress: 0,
        mesh: { position: { x:0, y:0, z:0 }, rotation: { x:0, y:0, z:0 }, scale: { multiplyScalar: () => {}, x: 1 } },
        notif: { position: { y: 1.5 }, material: { opacity: 1, dispose: () => {} }, geometry: { dispose: () => {} } }
    });
    
    try {
        const fn = new Function(fnBody);
        fn();
        console.log("No syntax errors. Progress is now:", window.xrActiveBlocks[0].progress);
        fn();
        console.log("No syntax errors. Progress is now:", window.xrActiveBlocks[0].progress);
    } catch(e) {
        console.log("RUNTIME ERROR IN ANIMATION:", e);
    }
}
