import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove the 3D Dashboard creation block
dashboard_regex = re.compile(r'// ==========================================\n\s*// 3D NATIVE VR DASHBOARD\n.*?create3DButton\(\'ARCHIVE / SETTINGS\'.*?\}\);\n', re.DOTALL)
js = dashboard_regex.sub('', js)

# 2. Remove the 3D UI raycasting block
raycast_regex = re.compile(r'// 3D UI RAYCASTING.*?const hits = xrRaycaster\.intersectObject\(xrMesh\);', re.DOTALL)
js = raycast_regex.sub('const hits = xrRaycaster.intersectObject(xrMesh);', js)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Reverted to 2D DOM Overlay UI!")
