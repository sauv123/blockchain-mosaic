import re
with open('display/mosaic.html', 'r', encoding='utf-8') as f:
    html = f.read()

pattern = r'<div id="guide-overlay"[\s\S]*?(?=<div id="details-sidebar")'

perfect_guide = """<div id="guide-overlay" class="guide-overlay" role="dialog" aria-modal="true" aria-label="How the Mosaic Works">
    <div class="guide-panel">
      <div class="guide-panel-header">
        <span class="guide-section-badge">How to read the portrait</span>
        <h2 class="guide-section-title">Understanding the Data</h2>
        <button id="guide-close-btn" class="guide-close" aria-label="Close Guide">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="guide-panel-content">
        <p class="guide-text">This portrait is a living, breathing map of the global economy. Every tiny square represents a real action happening somewhere in the world.</p>
        
        <div class="guide-term">
          <div class="guide-term-label" style="color: #00e5ff;">Direct Payments (Blue)</div>
          <div class="guide-term-def">People sending money directly to friends, family, or businesses.</div>
        </div>
        <div class="guide-term">
          <div class="guide-term-label" style="color: #ff00aa;">Currency Exchange (Pink/Cyan)</div>
          <div class="guide-term-def">People trading one digital currency for another.</div>
        </div>
        <div class="guide-term">
          <div class="guide-term-label" style="color: #b000ff;">Digital Art / Collectibles (Purple)</div>
          <div class="guide-term-def">Artists creating or selling digital artwork.</div>
        </div>
        <div class="guide-term">
          <div class="guide-term-label" style="color: #ffaa00;">Automated Code (Gold)</div>
          <div class="guide-term-def">Smart contracts executing complex logic automatically.</div>
        </div>
        <div class="guide-term">
          <div class="guide-term-label" style="color: #ffffff; text-shadow: 0 0 5px #fff;">Massive Transactions (Glowing White)</div>
          <div class="guide-term-def">A transfer so large (e.g. millions of dollars) that it sends shockwaves through the market.</div>
        </div>
      </div>
    </div>
  </div>

  """

if re.search(pattern, html):
    html = re.sub(pattern, perfect_guide, html)
else:
    print("Could not find guide pattern")

with open('display/mosaic.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML restored")
