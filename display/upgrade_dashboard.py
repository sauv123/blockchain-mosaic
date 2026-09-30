with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update Mouse Tracking to allow subtle parallax on LIVE mode too
old_mouse_tracking = """  if (document.body.classList.contains('focus-mode')) {
    // Calculate tilt angles based on mouse position relative to center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Max tilt of 6 degrees for subtle 3D effect
    targetTiltY = ((mouseX - centerX) / centerX) * 6;
    targetTiltX = -((mouseY - centerY) / centerY) * 6;
  } else {
    targetTiltX = 0;
    targetTiltY = 0;
  }"""

new_mouse_tracking = """  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  if (document.body.classList.contains('focus-mode')) {
    // Max tilt of 7 degrees for focus mode
    targetTiltY = ((mouseX - centerX) / centerX) * 7;
    targetTiltX = -((mouseY - centerY) / centerY) * 7;
  } else {
    // Very subtle 1.5 degree cinematic tilt for standard dashboard
    targetTiltY = ((mouseX - centerX) / centerX) * 1.5;
    targetTiltX = -((mouseY - centerY) / centerY) * 1.5;
  }"""

js = js.replace(old_mouse_tracking, new_mouse_tracking)

# 2. Upgrade the Weather Line Font / Cinematics
old_html_gen = """    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    const newHtml = `<span style="font-weight: 300; font-size: clamp(20px, 2.5vw, 34px); letter-spacing: -0.02em; line-height: 1.4; display: inline-block;">Today, <strong style="font-weight: 600;">${directCount.toLocaleString()}</strong> human payments moved <strong style="font-weight: 600;">${volStr}</strong>.<br><span style="font-style: italic; font-weight: 300; opacity: 0.75;">The network weather is ${weatherCondition}.</span></span>`;"""

new_html_gen = """    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    
    // Get accent color for numbers based on theme
    const numColor = THEMES[currentTheme].text === '#e2e2da' ? '#fff' : '#000';
    
    const newHtml = `
      <div style="font-family: 'Outfit', sans-serif; font-weight: 300; font-size: clamp(22px, 3vw, 36px); letter-spacing: -0.01em; line-height: 1.3; margin-bottom: 4px;">
        Today, <span style="font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 0 12px rgba(255,255,255,0.2); letter-spacing: 0;">${directCount.toLocaleString()}</span> human payments moved <span style="font-family: 'Space Mono', monospace; font-weight: 700; color: ${numColor}; text-shadow: 0 0 12px rgba(255,255,255,0.2); letter-spacing: 0;">${volStr}</span>.
      </div>
      <div style="font-family: 'Outfit', sans-serif; font-size: clamp(14px, 1.8vw, 20px); font-style: italic; font-weight: 300; opacity: 0.6; letter-spacing: 0.05em;">
        The network weather is ${weatherCondition}.
      </div>
    `;"""

js = js.replace(old_html_gen, new_html_gen)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
