import re
import time

with open('display/quest.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the old cache buster with a new timestamp
timestamp = int(time.time())
html = re.sub(r'quest\.js\?v=\d+', f'quest.js?v={timestamp}', html)

with open('display/quest.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Cache busted in quest.html for the final time!")
