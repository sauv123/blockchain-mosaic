import re

with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Header Stats
html = html.replace('12s Block Capacity', 'Payments per Block')
html = html.replace('Network Base Fee', 'Processing Cost')
html = html.replace('Active Connections', 'People Connected')

# Sidebar Labels
html = html.replace('Network Source', 'Data Stream')
html = html.replace('>Ethereum L1<', '>Global Main Network<')
html = html.replace('>Base L2 (Fast)<', '>High-Speed Network (Base)<')
html = html.replace('>Arbitrum L2 (Rapid)<', '>High-Speed Network (Arbitrum)<')
html = html.replace('>Solana (Hyper-Dense)<', '>Ultra-Fast Network (Solana)<')

# Tracker
html = html.replace('TRACK WALLET / ENTITY', 'FOLLOW A SPECIFIC PERSON OR COMPANY')
html = html.replace('Enter 0x address or ENS...', 'Enter a user address to track their payments...')

# Buttons
html = html.replace('Grid: Micro', 'View: Individual Payments')
html = html.replace('Grid: Macro', 'View: Abstract Portrait')

# Guide Panel (Humanize)
guide_old = r'<div class="guide-panel">[\s\S]*?</div>\s*</div>\s*</div>'
guide_new = """<div class="guide-panel">
      <div class="guide-panel-header">
        <span class="guide-section-badge">How to read the portrait</span>
        <h2 class="guide-section-title">Understanding the Data</h2>
        <p class="guide-text">This portrait is a living, breathing map of the global economy. Every tiny square represents a real action happening somewhere in the world.</p>
      </div>
      <div class="guide-panel-content">
        <div class="guide-term">
          <div class="guide-term-label">Direct Payments (Blue)</div>
          <div class="guide-term-def">People sending money directly to friends, family, or businesses.</div>
        </div>
        <div class="guide-term">
          <div class="guide-term-label">Currency Exchange (Cyan)</div>
          <div class="guide-term-def">People trading one digital currency for another.</div>
        </div>
        <div class="guide-term">
          <div class="guide-term-label">Digital Art / Collectibles (Indigo)</div>
          <div class="guide-term-def">Artists creating or selling digital artwork.</div>
        </div>
        <div class="guide-term">
          <div class="guide-term-label">Massive Transactions (Glowing White)</div>
          <div class="guide-term-def">A transfer so large (e.g. millions of dollars) that it sends shockwaves through the market.</div>
        </div>
      </div>
    </div>
  </div>"""

if 'guide-panel' in html:
    html = re.sub(guide_old, guide_new, html)

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)
    
print("HTML UX patched")
