import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Ticker NaN Fix
js = js.replace('count: directCount,', 'count: directCount || 0,')
js = js.replace('usd: totalUsd,', 'usd: totalUsd || 0,')

# 2. GSAP Tooltip Spring Physics & Boundary Check
bad_tooltip = """  // GSAP Spring Tooltip Interpolation
  if (typeof gsap !== 'undefined') {
    // Add an offset so cursor doesn't obscure it
    gsap.to(hoverTooltip, { 
      x: e.clientX + 20, 
      y: e.clientY + 20, 
      duration: 0.5, 
      ease: 'power3.out',
      overwrite: 'auto'
    });
  } else {
    hoverTooltip.style.left = `${e.clientX + 20}px`;
    hoverTooltip.style.top = `${e.clientY + 20}px`;
  }
  hoverTooltip.classList.add('visible');"""

good_tooltip = """  // GSAP Spring Tooltip Interpolation with Bounds Checking
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  hoverTooltip.style.visibility = 'hidden';
  hoverTooltip.classList.add('visible');
  const rect = hoverTooltip.getBoundingClientRect();
  hoverTooltip.style.visibility = '';
  
  let targetX = e.clientX + 20;
  let targetY = e.clientY + 20;
  
  if (targetX + rect.width > vw) targetX = e.clientX - rect.width - 20;
  if (targetY + rect.height > vh) targetY = e.clientY - rect.height - 20;

  if (typeof gsap !== 'undefined') {
    hoverTooltip.style.left = '0px';
    hoverTooltip.style.top = '0px';
    gsap.to(hoverTooltip, { 
      x: targetX, 
      y: targetY, 
      duration: 0.6, 
      ease: 'back.out(1.2)', // Premium spring physics
      overwrite: 'auto'
    });
  } else {
    hoverTooltip.style.left = `${targetX}px`;
    hoverTooltip.style.top = `${targetY}px`;
  }"""

js = js.replace(bad_tooltip, good_tooltip)

# 3. WebSocket Resilience (Exponential Backoff)
bad_ws = """      setTimeout(connectRelay, 15000);
      return;
    }

    const wsUrl = candidateUrls[currentIndex];
    currentIndex += 1;
    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {"""

good_ws = """      window._wsReconnectDelay = (window._wsReconnectDelay || 1000) * 1.5;
      if (window._wsReconnectDelay > 30000) window._wsReconnectDelay = 30000;
      setTimeout(connectRelay, window._wsReconnectDelay);
      return;
    }

    const wsUrl = candidateUrls[currentIndex];
    currentIndex += 1;
    
    // Add Reconnecting UI status
    const liveStatus = document.querySelector('.status-indicator');
    if (liveStatus && currentMode === 'LIVE') {
       liveStatus.style.background = '#ffaa00';
       liveStatus.style.animation = 'none';
       liveStatus.title = 'Reconnecting...';
    }

    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      window._wsReconnectDelay = 1000; // reset backoff
      if (liveStatus && currentMode === 'LIVE') {
         liveStatus.style.background = '#00ff88';
         liveStatus.style.animation = 'liveGlow 2s ease-out infinite';
         liveStatus.title = 'Live';
      }
"""
js = js.replace(bad_ws, good_ws)

# Make sure socket closes and re-triggers on error correctly
if "socket.addEventListener('close'," in js:
    # ensure it reconnects on close
    bad_close = """    socket.addEventListener('close', () => {
      setTimeout(connectRelay, 5000);
    });"""
    good_close = """    socket.addEventListener('close', () => {
      currentIndex = 0; // reset url cycle
      setTimeout(connectRelay, window._wsReconnectDelay || 2000);
    });"""
    js = js.replace(bad_close, good_close)
    
if "socket.addEventListener('error'," in js:
    bad_err = """    socket.addEventListener('error', (err) => {
      socket.close();
    });"""
    good_err = """    socket.addEventListener('error', (err) => {
      socket.close(); // will trigger close event
    });"""
    js = js.replace(bad_err, good_err)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Phase 4 (Bugs & Resilience) and Phase 3 Tooltips fixed.")
