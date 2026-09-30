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

function syncBodyTheme() {
  document.body.classList.remove('theme-warmGray', 'theme-charcoal');
  document.body.classList.add('theme-' + currentTheme);
}
"""

js = js.replace("const THEMES = {", custom_js + "\nconst THEMES = {")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected missing functions.")
