import re

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove the rule that hides the native cursor
css = re.sub(r'body, button, a, canvas, select \{\s*cursor: none !important;\s*\}', '', css)

# Make the custom cursor an elegant aura (ring) that trails the native mouse
old_cursor = """#custom-cursor {
  position: fixed;
  top: -4px;
  left: -4px;
  width: 8px;
  height: 8px;
  background-color: #fff;
  border-radius: 50%;
  pointer-events: none;
  z-index: 10000;
  mix-blend-mode: difference;
  will-change: transform, width, height;
  transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1), 
              height 0.2s cubic-bezier(0.16, 1, 0.3, 1), 
              background-color 0.2s ease, 
              border 0.2s ease,
              top 0.2s ease,
              left 0.2s ease;
}"""

new_cursor = """#custom-cursor {
  position: fixed;
  top: -16px;
  left: -16px;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 50%;
  pointer-events: none;
  z-index: 10000;
  will-change: transform, width, height;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
              height 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
              border 0.3s ease,
              background-color 0.3s ease,
              top 0.3s ease,
              left 0.3s ease;
}"""

old_cursor_hover = """#custom-cursor.hovering {
  width: 32px;
  height: 32px;
  top: -16px;
  left: -16px;
  background-color: transparent;
  border: 1px solid rgba(255,255,255,0.8);
}"""

new_cursor_hover = """#custom-cursor.hovering {
  width: 48px;
  height: 48px;
  top: -24px;
  left: -24px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255,255,255,0.8);
  backdrop-filter: blur(2px);
}"""

css = css.replace(old_cursor, new_cursor)
css = css.replace(old_cursor_hover, new_cursor_hover)

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Restored native mouse and transformed custom cursor into an aura.")
