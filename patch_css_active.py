import re
with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.playback-controls.active {' in css:
    css = re.sub(r'\.playback-controls\.active\s*\{\s*display:\s*flex;\s*\}', '.playback-controls.active { display: flex !important; }', css)
    with open('display/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("CSS !important added")
