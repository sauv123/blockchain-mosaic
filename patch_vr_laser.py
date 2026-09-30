import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"window\.grabbedObject = null;\s*window\.grabbingController = null;\s*\}\s*\}\s*\}\n  function onSelectEnd\(event\) \{"
repl = """window.grabbedObject = null;
              window.grabbingController = null;
              return; // billboard grabbed
          }
      }
      
      // AWARD-WINNING VR FX: Interactive Ripple Blaster
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.6); // Ground at y = -0.6
      const intersectPoint = new THREE.Vector3();
      if (xrRaycaster.ray.intersectPlane(floorPlane, intersectPoint)) {
          spawnImpactRipple(intersectPoint.x, -0.59, intersectPoint.z, '#00e5ff');
          if (navigator.vibrate) navigator.vibrate(20);
      }
  }
  function onSelectEnd(event) {"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added VR Ripple Blaster!")
