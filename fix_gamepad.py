import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Strip out the crashing code from the controller forEach loop
crashing_block = """    if (controller.gamepad && controller.gamepad.axes && controller.gamepad.axes.length >= 4) {
       const yAxis = controller.gamepad.axes[3]; 
       if (Math.abs(yAxis) > 0.1) {
          xrMesh.position.z -= yAxis * 0.05;
          if (xrMesh.position.z > -1) xrMesh.position.z = -1;
          if (xrMesh.position.z < -10) xrMesh.position.z = -10;
       }
    }
    
    // VR Hardware Button Mappings
    if (controller.gamepad && controller.gamepad.buttons && Date.now() - vrButtonCooldown > 500) {
       // Button 4 is usually 'A' on Right, 'X' on Left
       // Button 5 is usually 'B' on Right, 'Y' on Left
       if (controller.gamepad.buttons[4] && controller.gamepad.buttons[4].pressed) {
           vrButtonCooldown = Date.now();
           const archiveBtn = document.getElementById('archive-toggle-btn');
           if (archiveBtn) archiveBtn.click();
       }
       if (controller.gamepad.buttons[5] && controller.gamepad.buttons[5].pressed) {
           vrButtonCooldown = Date.now();
           const audioBtn = document.getElementById('audio-toggle-btn');
           if (audioBtn) audioBtn.click();
       }
    }"""

js = js.replace(crashing_block, "")

# 2. Add the proper WebXR Gamepad API logic outside the forEach loop!
safe_gamepad_logic = """
  // SAFE HARDWARE BUTTON / JOYSTICK MAPPINGS
  const session = xrRenderer.xr.getSession();
  if (session && session.inputSources) {
    for (let s of session.inputSources) {
      if (s.gamepad) {
        // Joystick Zoom
        if (s.gamepad.axes && s.gamepad.axes.length >= 4) {
          const yAxis = s.gamepad.axes[3]; 
          if (Math.abs(yAxis) > 0.1 && xrMesh) {
            xrMesh.position.z -= yAxis * 0.05;
            if (xrMesh.position.z > -1) xrMesh.position.z = -1;
            if (xrMesh.position.z < -10) xrMesh.position.z = -10;
          }
        }
        
        // Buttons
        if (s.gamepad.buttons && Date.now() - vrButtonCooldown > 500) {
          if (s.gamepad.buttons[4] && s.gamepad.buttons[4].pressed) {
            vrButtonCooldown = Date.now();
            const archiveBtn = document.getElementById('archive-toggle-btn');
            if (archiveBtn) archiveBtn.click();
          }
          if (s.gamepad.buttons[5] && s.gamepad.buttons[5].pressed) {
            vrButtonCooldown = Date.now();
            const audioBtn = document.getElementById('audio-toggle-btn');
            if (audioBtn) audioBtn.click();
          }
        }
      }
    }
  }
"""

js = js.replace("  xrRenderer.render(xrScene, xrCamera);", safe_gamepad_logic + "\n  xrRenderer.render(xrScene, xrCamera);")

# Also need to make sure the haptic pulse isn't crashing inside the intersected logic!
# Old: if (controller.gamepad && controller.gamepad.hapticActuators) controller.gamepad.hapticActuators[0].pulse(0.1, 10);
# controller doesn't have gamepad!
js = re.sub(r'if \(controller\.gamepad.*?pulse\(0\.1, 10\);\s*\}', '', js)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed the gamepad crash!")
