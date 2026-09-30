import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"xrController1 = xrRenderer\.xr\.getController\(0\);\s*xrScene\.add\(xrController1\);\s*xrController2 = xrRenderer\.xr\.getController\(1\);\s*xrScene\.add\(xrController2\);"
repl = """xrController1 = xrRenderer.xr.getController(0);
  xrScene.add(xrController1);
  xrController2 = xrRenderer.xr.getController(1);
  xrScene.add(xrController2);
  
  // AWARD-WINNING: Movable VR Panels
  window.grabbedObject = null;
  window.grabbingController = null;
  function onSelectStart(event) {
      const controller = event.target;
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      xrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      xrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      
      if (window.xrBillboard) {
          const intersects = xrRaycaster.intersectObject(window.xrBillboard);
          if (intersects.length > 0) {
              window.grabbedObject = window.xrBillboard;
              window.grabbingController = controller;
              controller.attach(window.grabbedObject);
          }
      }
  }
  function onSelectEnd(event) {
      if (window.grabbedObject && window.grabbingController === event.target) {
          xrScene.attach(window.grabbedObject);
          window.grabbedObject = null;
          window.grabbingController = null;
      }
  }
  xrController1.addEventListener('selectstart', onSelectStart);
  xrController1.addEventListener('selectend', onSelectEnd);
  xrController2.addEventListener('selectstart', onSelectStart);
  xrController2.addEventListener('selectend', onSelectEnd);
"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added movable panel mechanics!")
