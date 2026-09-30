import re

with open('display/vr.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Update JS reference
html = re.sub(r'quest\.js\?v=\d+', 'vr.js', html)

with open('display/vr.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated vr.html!")
