with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ============================================================
# Add a persistent HISTORICAL context bar that appears
# when entering historical/archive mode with clear UX guidance
# ============================================================
load_historical_hook = """  const category = getCategoryForDay(dayNum);
  const categoryLabel = getCategoryLabel(category);
  
  liveIndicator.className = 'status-indicator historical-mode';
  modeStatusText.textContent = `Viewing Archives: ${categoryLabel}`;"""

new_load_historical = """  const category = getCategoryForDay(dayNum);
  const categoryLabel = getCategoryLabel(category);
  
  liveIndicator.className = 'status-indicator historical-mode';
  modeStatusText.textContent = `Viewing Archives: ${categoryLabel}`;
  
  // Inject a floating context card explaining what the user is seeing
  let contextCard = document.getElementById('historical-context-card');
  if (!contextCard) {
    contextCard = document.createElement('div');
    contextCard.id = 'historical-context-card';
    Object.assign(contextCard.style, {
      position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '6000', background: 'rgba(10,12,16,0.88)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
      padding: '12px 20px', textAlign: 'center', pointerEvents: 'none', opacity: '0',
      fontFamily: "'Outfit', sans-serif", color: 'rgba(255,255,255,0.85)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: '520px', lineHeight: '1.5'
    });
    document.querySelector('.canvas-container').appendChild(contextCard);
  }

  const dateLabel = formattedFriendlyDate;
  contextCard.innerHTML = `
    <span style="font-family:'Space Mono',monospace; font-size:9px; letter-spacing:0.2em; text-transform:uppercase; opacity:0.5; display:block; margin-bottom:4px;">Archive</span>
    <span style="font-size:14px; font-weight:500;">${dateLabel} — ${categoryLabel}</span>
    <span style="display:block; font-size:12px; font-weight:300; opacity:0.65; margin-top:4px;">Each square = one block (~12s of time). Colors = transaction types. <strong style="color:#00ff88; font-weight:500;">View Portrait</strong> melts the grid into art.</span>
  `;
  contextCard.style.display = 'block';
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(contextCard, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    gsap.to(contextCard, { opacity: 0, y: -10, duration: 0.5, delay: 7, ease: 'power2.in', onComplete: () => { contextCard.style.display = 'none'; } });
  }"""

js = js.replace(load_historical_hook, new_load_historical)

# ============================================================
# When return-to-live is clicked, also hide the context card
# ============================================================
old_hide_drawer = """historicalBanner.classList.remove('active');
    updateStats();"""
new_hide_drawer = """historicalBanner.classList.remove('active');
    updateStats();
    const ctxCard = document.getElementById('historical-context-card');
    if (ctxCard) ctxCard.style.display = 'none';"""
js = js.replace(old_hide_drawer, new_hide_drawer)

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Context bar added.")
