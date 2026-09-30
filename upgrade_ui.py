import re

with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# PHASE 1: Seamless Time-Travel Crossfade & Heatmap
# Find loadHistoricalPortrait
bad_hist = """  if (historicalBanner) historicalBanner.classList.add('active');

  // Try to fetch real blocks from the backend
  let fetchedBlocks = [];"""

good_hist = """  if (historicalBanner) historicalBanner.classList.add('active');
  
  // Phase 1: GSAP Crossfade Out
  if (typeof gsap !== 'undefined') {
    gsap.to(canvas, { opacity: 0.1, duration: 0.3, ease: 'power2.out' });
  }

  // Try to fetch real blocks from the backend
  let fetchedBlocks = [];"""
js = js.replace(bad_hist, good_hist)

bad_hist_2 = """  playbackSlider.max = playbackFullList.length;
  playbackSlider.value = 0;
  
  updatePlaybackTimeDisplay();"""
  
good_hist_2 = """  playbackSlider.max = playbackFullList.length;
  playbackSlider.value = 0;
  
  updatePlaybackTimeDisplay();
  
  // Phase 1: GSAP Crossfade In
  if (typeof gsap !== 'undefined') {
    gsap.to(canvas, { opacity: 1, duration: 0.6, delay: 0.1, ease: 'power2.inOut' });
  }"""
js = js.replace(bad_hist_2, good_hist_2)

# PHASE 1.5: Calendar Heatmap Styling
bad_cal = """      if (category === 'zen') {
        dot.classList.add('calm');
      } else if (category === 'dragon') {
        dot.classList.add('congested');
      } else {
        dot.classList.add('active');
      }
      dayEl.appendChild(dot);"""

good_cal = """      // Phase 1: On-Chain Heatmap
      dayEl.style.color = '#fff';
      dayEl.style.border = '1px solid rgba(255,255,255,0.05)';
      if (category === 'zen') {
        dayEl.style.background = 'rgba(0, 255, 136, 0.04)';
      } else if (category === 'dragon') {
        dayEl.style.background = 'rgba(0, 255, 136, 0.25)';
        dayEl.style.boxShadow = '0 0 10px rgba(0,255,136,0.2)';
        dayEl.style.borderColor = 'rgba(0, 255, 136, 0.4)';
      } else {
        dayEl.style.background = 'rgba(0, 255, 136, 0.1)';
      }"""
js = js.replace(bad_cal, good_cal)


# PHASE 2: Gallery Mode (Portraits)
bad_gallery = """  document.getElementById('archive-drawer').classList.remove('open');
  document.querySelector('.canvas-container').classList.remove('sidebar-open');
  
  // Generate the story text"""

good_gallery = """  document.getElementById('archive-drawer').classList.remove('open');
  document.querySelector('.canvas-container').classList.remove('sidebar-open');
  
  // Phase 2: Gallery Mode UI Pushback
  const header = document.querySelector('.app-header');
  const playCtrls = document.querySelector('.playback-controls');
  const canvasCont = document.getElementById('canvas-container');
  if (typeof gsap !== 'undefined') {
    if (header) gsap.to(header, { opacity: 0.1, y: -20, duration: 0.8, ease: 'power3.out' });
    if (playCtrls) gsap.to(playCtrls, { opacity: 0.1, y: 20, duration: 0.8, ease: 'power3.out' });
    if (canvasCont) {
      canvasCont.style.transition = 'none'; // let GSAP handle it
      gsap.to(canvasCont, { scale: 0.85, borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)', duration: 1.2, ease: 'expo.out' });
    }
  }

  // Generate the story text"""
js = js.replace(bad_gallery, good_gallery)

bad_exit = """    if (typeof updateScaleUI === 'function') updateScaleUI();
    
    tileSize = 64;
    resizeCanvas();"""

good_exit = """    if (typeof updateScaleUI === 'function') updateScaleUI();
    
    // Phase 2: Exit Gallery Mode
    const header = document.querySelector('.app-header');
    const playCtrls = document.querySelector('.playback-controls');
    const canvasCont = document.getElementById('canvas-container');
    if (typeof gsap !== 'undefined') {
      if (header) gsap.to(header, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      if (playCtrls) gsap.to(playCtrls, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      if (canvasCont) gsap.to(canvasCont, { scale: 1.0, borderRadius: '0px', boxShadow: 'none', duration: 0.8, ease: 'power2.out' });
    }

    tileSize = 64;
    resizeCanvas();"""
js = js.replace(bad_exit, good_exit)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Phase 1 & 2 injected successfully.")
