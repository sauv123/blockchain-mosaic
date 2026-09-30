import re

with open('display/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

custom_css = """
/* ============================================================
   CUSTOM PREMIUM DROPDOWNS (Replaces Native <select>)
   ============================================================ */
.custom-select {
  position: relative;
  width: 100%;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
}
.custom-select-display {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 8px 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.custom-select-display:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
}
.custom-select-display::after {
  content: '▼';
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.4);
  font-size: 8px;
}
.custom-select-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(12, 13, 18, 0.95);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  margin-top: 4px;
  padding: 0;
  list-style: none;
  display: none;
  z-index: 100;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  overflow: hidden;
}
.custom-select-options.show {
  display: block;
}
.custom-select-options li {
  padding: 10px 14px;
  cursor: pointer;
  color: rgba(255,255,255,0.7);
  transition: background 0.2s, color 0.2s;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.custom-select-options li:last-child {
  border-bottom: none;
}
.custom-select-options li:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.custom-select-options li.selected {
  color: #00ff88;
  background: rgba(0, 255, 136, 0.05);
}

/* Light Theme overrides */
body.theme-warmGray .custom-select-display {
  color: #000;
  border-color: rgba(0,0,0,0.2);
}
body.theme-warmGray .custom-select-display:hover {
  border-color: rgba(0,0,0,0.4);
}
body.theme-warmGray .custom-select-options {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(0,0,0,0.15);
}
body.theme-warmGray .custom-select-options li {
  color: rgba(0,0,0,0.7);
  border-color: rgba(0,0,0,0.05);
}
body.theme-warmGray .custom-select-options li:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #000;
}
body.theme-warmGray .custom-select-options li.selected {
  color: #007aff;
  background: rgba(0, 122, 255, 0.05);
}

/* Hide native selects */
select.native-hidden {
  display: none !important;
}
"""

if "CUSTOM PREMIUM DROPDOWNS" not in css:
    css += custom_css
    with open('display/style.css', 'w', encoding='utf-8') as f:
        f.write(css)

# Inject JS into mosaic.js
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

custom_js = """
// === PREMIUM CUSTOM SELECT UI INIT ===
function initCustomSelects() {
  document.querySelectorAll('select').forEach(select => {
    if(select.classList.contains('native-hidden')) return;
    select.classList.add('native-hidden');
    
    const customSelect = document.createElement('div');
    customSelect.className = 'custom-select';
    
    const selectedDisplay = document.createElement('div');
    selectedDisplay.className = 'custom-select-display';
    selectedDisplay.innerText = select.options[select.selectedIndex]?.text || '';
    
    const optionsList = document.createElement('ul');
    optionsList.className = 'custom-select-options';
    
    Array.from(select.options).forEach((opt, idx) => {
      const li = document.createElement('li');
      li.innerText = opt.text;
      if(idx === select.selectedIndex) li.classList.add('selected');
      
      li.onclick = () => {
         select.selectedIndex = idx;
         selectedDisplay.innerText = opt.text;
         select.dispatchEvent(new Event('change'));
         optionsList.classList.remove('show');
         optionsList.querySelectorAll('li').forEach(l => l.classList.remove('selected'));
         li.classList.add('selected');
      };
      optionsList.appendChild(li);
    });
    
    selectedDisplay.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-options').forEach(ul => {
         if(ul !== optionsList) ul.classList.remove('show');
      });
      optionsList.classList.toggle('show');
    };
    
    customSelect.appendChild(selectedDisplay);
    customSelect.appendChild(optionsList);
    select.parentNode.insertBefore(customSelect, select.nextSibling);
  });

  document.addEventListener('click', () => {
     document.querySelectorAll('.custom-select-options').forEach(ul => ul.classList.remove('show'));
  });
}

// Ensure body gets a theme class for CSS targeting
function syncBodyTheme() {
  document.body.classList.remove('theme-warmGray', 'theme-charcoal');
  document.body.classList.add('theme-' + currentTheme);
}
"""

if "PREMIUM CUSTOM SELECT UI INIT" not in js:
    js = js.replace("function init() {", custom_js + "\nfunction init() {")
    js = js.replace("initEvents();", "initEvents();\n  initCustomSelects();\n  syncBodyTheme();")
    
    # In toggleTheme, sync the body class
    js = js.replace("THEMES[currentTheme];", "THEMES[currentTheme];\n  syncBodyTheme();")

    with open('display/mosaic.js', 'w', encoding='utf-8') as f:
        f.write(js)

print("Custom select UI injected.")
