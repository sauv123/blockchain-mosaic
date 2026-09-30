import sys

with open('mosaic.html', 'r') as f:
    html = f.read()

target = """        <button id="sound-toggle-btn" class="sound-toggle-btn active">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>Sound: On
        </button>"""

if target in html:
    html = html.replace(target, "")
    print("Sound btn removed")
else:
    print("Sound btn not found")

with open('mosaic.html', 'w') as f:
    f.write(html)
