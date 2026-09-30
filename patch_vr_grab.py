import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

inject_code = """
// AWARD-WINNING VR FX: Interactive Ripple Blaster & Billboard Grab
window.grabbedObject = null;
window.grabbingController = null;

function onXRSelectStart(event) {
    const controller = event.target;
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    xrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Check if aiming at Billboard
    if (window.xrBillboard) {
        const intersects = xrRaycaster.intersectObject(window.xrBillboard);
        if (intersects.length > 0) {
            window.grabbedObject = window.xrBillboard;
            window.grabbingController = controller;
            controller.attach(window.xrBillboard); // Pick it up
            if (navigator.vibrate) navigator.vibrate(50);
            return;
        }
    }
    
    // Interactive Floor Blaster
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.6); // Ground at y = -0.6
    const intersectPoint = new THREE.Vector3();
    if (xrRaycaster.ray.intersectPlane(floorPlane, intersectPoint)) {
        spawnImpactRipple(intersectPoint.x, -0.59, intersectPoint.z, '#00e5ff');
        if (navigator.vibrate) navigator.vibrate(20);
    }
}

function onXRSelectEnd(event) {
    if (window.grabbedObject && window.grabbingController === event.target) {
        xrScene.attach(window.grabbedObject); // Drop it
        window.grabbedObject = null;
        window.grabbingController = null;
    }
}
"""

# Find where controllers are assigned and add the listeners
target = r"xrController1\.addEventListener\('select', onXRSelect\);"
repl = r"xrController1.addEventListener('select', onXRSelect);\n  xrController1.addEventListener('selectstart', onXRSelectStart);\n  xrController1.addEventListener('selectend', onXRSelectEnd);"
js = re.sub(target, repl, js)

target2 = r"xrController2\.addEventListener\('select', onXRSelect\);"
repl2 = r"xrController2.addEventListener('select', onXRSelect);\n  xrController2.addEventListener('selectstart', onXRSelectStart);\n  xrController2.addEventListener('selectend', onXRSelectEnd);"
js = re.sub(target2, repl2, js)

js += "\n" + inject_code

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added grab and blaster mechanics correctly!")
