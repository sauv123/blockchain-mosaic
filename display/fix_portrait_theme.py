with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ============================================================
# When palette changes while in portrait mode — exit portrait first,
# then re-render. This prevents stale color filters.
# ============================================================
old_palette_change = """    currentPalette = e.target.value;
    lastInteractionTime = Date.now();
    applyAllSettings();"""
new_palette_change = """    currentPalette = e.target.value;
    lastInteractionTime = Date.now();
    // If portrait filter is active, remove it so new palette colors show correctly
    if (currentMode === 'ART_SYNTHESIS') {
      if (typeof exitPortrait === 'function') exitPortrait();
    }
    applyAllSettings();"""
js = js.replace(old_palette_change, new_palette_change)

# ============================================================
# Fix the initial body class boot — make sure charcoal is applied
# when loading with charcoal theme from URL params
# ============================================================
old_boot = """document.body.className = currentTheme + '-theme';
applyThemeStyles();"""
new_boot = """// Boot: apply theme class and clear any inline overrides
applyAllSettings();"""

# Only replace the FIRST occurrence (at line ~1161)
count = js.count(old_boot)
if count >= 1:
    js = js.replace(old_boot, new_boot, 1)

# ============================================================
# Fix parseUrlParameters: call applyAllSettings after loading params
# ============================================================
old_parse_end = """  // 3. Chain Router
  const chain = params.get('chain');"""
new_parse_end = """  // Apply all settings after URL params are loaded
  applyAllSettings();

  // 3. Chain Router
  const chain = params.get('chain');"""
js = js.replace(old_parse_end, new_parse_end, 1)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Portrait theme consistency fixed.")
