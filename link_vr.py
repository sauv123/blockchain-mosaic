import re

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add a "VR EXPERIENCE" link next to the other header controls in mosaic.html
old_controls = """<button id="theme-toggle-btn">"""
new_controls = """<a href="quest.html" style="text-decoration: none;"><button type="button" style="background: rgba(0,255,136,0.1); border: 1px solid #00ff88; color: #00ff88; font-weight: bold; margin-right: 8px;">VR MODE</button></a>
      <button id="theme-toggle-btn">"""
html = html.replace(old_controls, new_controls)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Added VR button to 2D Web!")
