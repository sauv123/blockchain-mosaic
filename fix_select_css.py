with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

new_css = """
/* ============================================================
   PREMIUM DROPDOWN (SELECT) STYLING
   ============================================================ */
select {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 10px !important;
  letter-spacing: 0.08em !important;
  padding: 6px 14px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  outline: none !important;
  appearance: none !important; /* Removes default arrow */
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  text-transform: uppercase !important;
}

/* Add custom arrow for select */
.setting-item {
  position: relative;
}
.setting-item select {
  padding-right: 24px !important;
}
.setting-item::after {
  content: '▼';
  font-size: 8px;
  color: rgba(255, 255, 255, 0.5);
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

select:hover {
  border-color: rgba(255, 255, 255, 0.3) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

select:focus, select:active {
  outline: none !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
}

/* Style the dropdown options (note: limited support in some browsers, but helps) */
select option {
  background: #08090C !important;
  color: #ffffff !important;
  padding: 8px !important;
}
"""

if "PREMIUM DROPDOWN" not in css:
    css += new_css

with open('display/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Dropdowns styled successfully.")
