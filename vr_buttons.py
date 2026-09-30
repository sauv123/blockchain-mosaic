import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add a cooldown for button presses
js = js.replace("let lastIntersectedUV = null;", "let lastIntersectedUV = null;\nlet vrButtonCooldown = 0;")

controller_logic = """if (controller.gamepad && controller.gamepad.axes && controller.gamepad.axes.length >= 4) {
       const yAxis = controller.gamepad.axes[3]; 
       if (Math.abs(yAxis) > 0.1) {
          xrMesh.position.z -= yAxis * 0.05;
          if (xrMesh.position.z > -1) xrMesh.position.z = -1;
          if (xrMesh.position.z < -10) xrMesh.position.z = -10;
       }
    }"""
    
new_controller_logic = """if (controller.gamepad && controller.gamepad.axes && controller.gamepad.axes.length >= 4) {
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

js = js.replace(controller_logic, new_controller_logic)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected VR hardware buttons!")
