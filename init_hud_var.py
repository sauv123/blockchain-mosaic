import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "window.lastNotificationTime = Date.now();"
repl = """window.lastNotificationTime = Date.now();"""

# Let's just put the fallback in the function:
target_if = """  if (window.lastNotificationText && Date.now() - window.lastNotificationTime < 6000) {"""
repl_if = """  if (window.lastNotificationText && window.lastNotificationTime && Date.now() - window.lastNotificationTime < 6000) {"""
js = js.replace(target_if, repl_if)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

