with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the premature applyAllSettings() call
js = js.replace("""window.addEventListener('resize', resizeCanvas);
resizeCanvas();
// Boot: apply theme class and clear any inline overrides
applyAllSettings();""", """window.addEventListener('resize', resizeCanvas);
resizeCanvas();""")

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Removed premature applyAllSettings.")
