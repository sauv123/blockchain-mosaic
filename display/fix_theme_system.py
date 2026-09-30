with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ============================================================
# 1. FIX applyThemeStyles — use CSS variables properly
#    Instead of manually setting inline styles (which breaks CSS),
#    just toggle the body class. CSS vars do ALL the work.
# ============================================================
old_apply = """function applyThemeStyles() {
  const theme = THEMES[currentTheme];
  document.body.style.backgroundColor = theme.bg;
  document.body.style.color = theme.text;
  
  document.querySelectorAll('.stat-item .value').forEach(el => {
    if (el.id !== 'trend-gas-val') {
      el.style.color = theme.text;
    }
  });
  document.querySelector('.brand h1').style.color = theme.text;
}"""

new_apply = """function applyThemeStyles() {
  // CSS custom properties do all the work — just set the class.
  // Clear any lingering inline styles that may have overridden CSS vars.
  document.body.style.removeProperty('background-color');
  document.body.style.removeProperty('color');
  document.querySelectorAll('.stat-item .value, .brand h1, .brand .sub-brand').forEach(el => {
    el.style.removeProperty('color');
  });
  // Body class is set by caller — this function just cleans up inline overrides.
}"""
js = js.replace(old_apply, new_apply)

# ============================================================
# 2. Add a centralized applyAllSettings() function
#    called whenever ANY setting changes, to keep everything in sync
# ============================================================
central_hook = """// Palette Change listener
if (paletteSelect) {
  paletteSelect.addEventListener('change', (e) => {
    currentPalette = e.target.value;
    lastInteractionTime = Date.now();
    updateRatioBarColors();
  });
}"""

new_central_hook = """// Single source of truth: applyAllSettings()
function applyAllSettings() {
  // 1. Body class drives all CSS variable theming
  document.body.className = currentTheme + '-theme';
  applyThemeStyles();

  // 2. Palette: reset any portrait filter so colors render fresh
  const canvas = document.getElementById('mosaic-canvas');
  if (canvas && currentMode !== 'ART_SYNTHESIS') {
    canvas.style.filter = '';
  }

  // 3. Legend and ratio bar
  updateRatioBarColors();

  // 4. Update URL so sharing works
  updateUrlParameters();
}

// Palette Change listener
if (paletteSelect) {
  paletteSelect.addEventListener('change', (e) => {
    currentPalette = e.target.value;
    lastInteractionTime = Date.now();
    applyAllSettings();
  });
}"""
js = js.replace(central_hook, new_central_hook)

# ============================================================
# 3. Wire the audio toggle button in the header properly
# ============================================================
old_audio_toggle = """if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {"""
new_audio_toggle = """// Also wire the header audio icon button
const audioIconBtn = document.getElementById('audio-toggle-btn');
if (audioIconBtn) {
  audioIconBtn.addEventListener('click', () => {
    audio.init();
    const isMuted = audio.toggle();
    audioIconBtn.style.opacity = isMuted ? '0.35' : '1';
    audioIconBtn.title = isMuted ? 'Enable Audio' : 'Mute Audio';
  });
}

if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {"""
js = js.replace(old_audio_toggle, new_audio_toggle)

# ============================================================
# 4. Add Theme selector to settings drawer via JS (no HTML edit needed)
#    Insert right after the palette change handler
# ============================================================
theme_inject_hook = """// Single source of truth: applyAllSettings()"""
theme_inject_new = """// Inject a Theme (Light/Dark) selector into the settings drawer
(function() {
  const paletteItem = document.querySelector('#palette-select')?.closest('.setting-item');
  if (paletteItem && !document.getElementById('theme-select')) {
    const themeItem = document.createElement('div');
    themeItem.className = 'setting-item';
    themeItem.innerHTML = `
      <label for="theme-select" style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; font-family:'Space Mono',monospace; opacity:0.6;">Theme</label>
      <select id="theme-select">
        <option value="warmGray">Warm Gray (Light)</option>
        <option value="charcoal">Charcoal (Dark)</option>
      </select>
    `;
    paletteItem.insertAdjacentElement('afterend', themeItem);

    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = currentTheme;
    themeSelect.addEventListener('change', (e) => {
      currentTheme = e.target.value;
      lastInteractionTime = Date.now();
      applyAllSettings();
    });
  }
})();

// Single source of truth: applyAllSettings()"""
js = js.replace(theme_inject_hook, theme_inject_new)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Theme system fixed.")
