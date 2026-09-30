import sys

with open('style.css', 'r') as f:
    css = f.read()

# Fix playback controls positioning and z-index
target_css = """.playback-controls {
  display: none;
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
  gap: 16px;
  background: var(--panel-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 30px;
  padding: 10px 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  z-index: 20;
}"""

new_css = """.playback-controls {
  display: none;
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
  gap: 16px;
  background: var(--panel-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 30px;
  padding: 10px 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  z-index: 9999;
}"""

if target_css in css:
    css = css.replace(target_css, new_css)
    print("CSS playback controls fixed.")
else:
    print("CSS target not found.")

with open('style.css', 'w') as f:
    f.write(css)
