import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

# 1. Update Middle Sentence
old_weather = """weatherLine.innerHTML = `<span style="color: #000; text-shadow: none; font-weight: 500; font-size: 24px; padding: 20px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: inline-block;">Today, <strong>${directCount.toLocaleString()}</strong> human payments moved <strong>${volStr}</strong>.<br>The network weather is ${weatherCondition}.</span>`;"""
new_weather = """weatherLine.innerHTML = `<span style="color: var(--text-primary); text-shadow: 0 10px 40px var(--bg-color), 0 2px 10px var(--bg-color), 0 0 40px var(--bg-color); font-weight: 300; font-size: 32px; letter-spacing: -0.02em; line-height: 1.4; display: inline-block; animation: fadeIn 2s ease-out;">Today, <strong style="font-weight: 600;">${directCount.toLocaleString()}</strong> human payments moved <strong style="font-weight: 600;">${volStr}</strong>.<br>The network weather is <span style="font-style: italic; font-weight: 400; opacity: 0.8;">${weatherCondition}</span>.</span>`;"""
js = js.replace(old_weather, new_weather)


# 2. Update Ledger Tooltip
old_ledger = """filterCountTooltip.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; font-size: 13px; max-width: 260px; text-align: left; line-height: 1.5; padding: 4px;">
          <div style="font-size: 13px; font-weight: bold; color: ${PALETTES[currentPalette][typeKey]}; margin-bottom: 8px; font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${PALETTES[currentPalette][typeKey]}; box-shadow: 0 0 8px ${PALETTES[currentPalette][typeKey]};"></span>
            ${titleName}
          </div>
          <div style="color: rgba(255,255,255,0.85); margin-bottom: 12px; font-weight: 300;">
            ${explanation}
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; font-family: 'Space Mono', monospace; font-size: 11px;">
            <span style="color: #00ff88;">${count.toLocaleString()} LIVE ACTIONS</span>
            <span style="color: rgba(255,255,255,0.5);">${usdString} MOVED</span>
          </div>
        </div>
      `;"""

new_ledger = """filterCountTooltip.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; max-width: 280px; text-align: left; line-height: 1.6; padding: 8px 4px; color: var(--text-primary);">
          <div style="font-size: 11px; font-weight: 600; color: ${PALETTES[currentPalette][typeKey]}; margin-bottom: 10px; font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.15em; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${PALETTES[currentPalette][typeKey]}; box-shadow: 0 0 10px ${PALETTES[currentPalette][typeKey]};"></span>
            ${titleName}
          </div>
          <div style="color: var(--text-secondary); margin-bottom: 16px; font-weight: 300; font-size: 13px;">
            ${explanation}
          </div>
          <div style="display: flex; justify-content: space-between; font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 500; opacity: 0.9;">
            <span>${count.toLocaleString()} LIVE</span>
            <span>${usdString} MOVED</span>
          </div>
        </div>
      `;"""
js = js.replace(old_ledger, new_ledger)

# 3. Add tooltip styling base (update its background to match the theme cleanly)
old_tooltip_style = """filterCountTooltip.style.fontSize = '12px';"""
new_tooltip_style = """filterCountTooltip.style.fontSize = '12px';
  filterCountTooltip.style.background = 'var(--panel-bg)';
  filterCountTooltip.style.border = '1px solid var(--border-color)';
  filterCountTooltip.style.backdropFilter = 'blur(20px)';
  filterCountTooltip.style.borderRadius = '12px';
  filterCountTooltip.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
  filterCountTooltip.style.padding = '12px 16px';"""
js = js.replace(old_tooltip_style, new_tooltip_style)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("UI updated.")
