with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

debug_inject = """  // 2. Theme Router
  const theme = params.get('theme');
  console.log("parseUrlParameters: theme param is", theme);
  if (theme && THEMES[theme]) {
    currentTheme = theme;
    console.log("parseUrlParameters: set currentTheme to", currentTheme);
    document.body.className = theme + '-theme';
    if (themeToggleBtn) {
      themeToggleBtn.textContent = theme === 'warmGray' ? 'Toggle Charcoal Theme' : 'Toggle Warm Gray Theme';
    }
    const ts = document.getElementById('theme-select');
    if (ts) ts.value = currentTheme;
  }"""

js = js.replace("""  // 2. Theme Router
  const theme = params.get('theme');
  if (theme && THEMES[theme]) {
    currentTheme = theme;
    document.body.className = theme + '-theme';
    if (themeToggleBtn) {
      themeToggleBtn.textContent = theme === 'warmGray' ? 'Toggle Charcoal Theme' : 'Toggle Warm Gray Theme';
    }
  }""", debug_inject)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
