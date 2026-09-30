import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Dictionary mapping for humanized terms
translation_map = """
const humanLabels = {
  'Plain Transfer': 'Direct Payment (Sending money)',
  'Token Swap': 'Currency Exchange (Trading coins)',
  'NFT Mint': 'Digital Art (Collectibles)',
  'Contract Creation': 'Automated Code',
  'Staking': 'Earning Interest'
};
"""
if "const humanLabels" not in js:
    js = js.replace("const PALETTES = {", translation_map + "\nconst PALETTES = {")

# Fix the Hover Tooltip to use humanized language
# Search for `tooltip.innerHTML = ` and replace its contents
tooltip_regex = r"tooltip\.innerHTML = `[\s\S]*?`;"

new_tooltip = """
    // Humanize the primary transaction type
    const domTx = (hoveredBlock._cachedPrimaryTx && hoveredBlock._cachedPrimaryTx.type) ? hoveredBlock._cachedPrimaryTx.type : 'Plain Transfer';
    const humanTx = humanLabels[domTx] || domTx;
    
    // Humanize processing cost
    const costLevel = hoveredBlock.base_fee_gwei > 50 ? 'High' : (hoveredBlock.base_fee_gwei < 15 ? 'Low' : 'Normal');

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <span class="value" style="color: #00ff88;">Activity Cluster #${hoveredBlock.block_number || hoveredBlock.hash.substring(0, 8)}</span>
      </div>
      <div class="tooltip-row">
        <span class="label">Total Actions</span>
        <span class="value">${hoveredBlock.tx_count}</span>
      </div>
      <div class="tooltip-row">
        <span class="label">Main Activity</span>
        <span class="value" style="color: ${PALETTES[currentPalette][domTx] || '#fff'};">${humanTx}</span>
      </div>
      <div class="tooltip-row">
        <span class="label">Processing Cost</span>
        <span class="value">${costLevel} (${hoveredBlock.base_fee_gwei} units)</span>
      </div>
      ${hoveredBlock.whale_flag === 1 ? `
      <div class="tooltip-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="label" style="color: #ffffff; text-shadow: 0 0 5px #fff;">MASSIVE TRANSACTION</span>
        <span class="value" style="font-size: 9px; color: rgba(255,255,255,0.7);">e.g. Millions moved</span>
      </div>` : ''}
    `;
"""

if re.search(tooltip_regex, js):
    js = re.sub(tooltip_regex, new_tooltip, js)


# Fix the Legend generator
legend_regex = r"function updateLegend\(\) \{[\s\S]*?legendContainer\.innerHTML = html;\s*\}"

new_legend = """
function updateLegend() {
  const legendContainer = document.getElementById('category-legend');
  syncBodyTheme();
  const palette = PALETTES[currentPalette];
  
  if (!legendContainer) return;
  
  let html = '';
  // Only display the humanized terms in the legend
  const items = [
    { key: 'Plain Transfer', label: 'Direct Payments' },
    { key: 'Token Swap', label: 'Currency Exchange' },
    { key: 'NFT Mint', label: 'Digital Art' }
  ];
  
  items.forEach(item => {
    let color = palette[item.key];
    const isFaded = (typeof clickedLegendFilter !== 'undefined' && clickedLegendFilter !== null && clickedLegendFilter !== item.key);
    const opacity = isFaded ? 0.2 : 1.0;
    html += `
      <span class="legend-item" style="opacity: ${opacity}; cursor: pointer;" onclick="toggleLegendFilter('${item.key}')">
        <span class="color-dot" style="background-color: ${color};"></span> ${item.label}
      </span>
    `;
  });
  
  html += `
      <span class="legend-item">
        <span class="color-dot" style="background-color: #ffffff; box-shadow: 0 0 6px #ffffff;"></span> Massive Action
      </span>
  `;
  
  legendContainer.innerHTML = html;
}
"""

if re.search(legend_regex, js):
    js = re.sub(legend_regex, new_legend, js)

# Let's also update the "View: Individual Payments" / "View: Abstract Portrait" buttons if we interact with them in JS.
# The scale toggle button text update in JS:
scale_btn_regex = r"scaleToggleBtn\.textContent = renderScale === 'MACRO' \? 'Grid: Macro' : 'Grid: Micro';"
new_scale_btn = "scaleToggleBtn.textContent = renderScale === 'MACRO' ? 'View: Abstract Portrait' : 'View: Individual Payments';"
js = re.sub(scale_btn_regex, new_scale_btn, js)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS UX patched")
