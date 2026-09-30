import re

with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Canvas shadow optimization
old_shadow = "ctx.shadowBlur = flashOverlay > 0 ? 10 * flashOverlay : 2;"
new_shadow = "ctx.shadowBlur = flashOverlay > 0 ? 15 * flashOverlay : 0; // optimized: disabled continuous 2px blur"
js = js.replace(old_shadow, new_shadow)

# 2. Re-write the Custom Cursor to use high-performance GSAP quickSetter
old_cursor = """// MICRO-INTERACTION: Custom Cursor
// ----------------------------------------------------
function initCustomCursor() {
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  // Track raw mouse position instantly
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    
    // Check if hovering over interactive element
    const hoveredEl = document.elementFromPoint(mouseX, mouseY);
    if (hoveredEl && (
      hoveredEl.tagName === 'BUTTON' || 
      hoveredEl.tagName === 'A' || 
      hoveredEl.tagName === 'SELECT' ||
      hoveredEl.closest('button') ||
      (hoveredEl.id === 'mosaic-canvas' && hoveredBlock !== null)
    )) {
      cursor.classList.add('hovering');
    } else {
      cursor.classList.remove('hovering');
    }
  });
  
  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
  document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
}"""

new_cursor = """// MICRO-INTERACTION: Custom Cursor (High Performance GSAP)
// ----------------------------------------------------
function initCustomCursor() {
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  // Use GSAP quickSetter for buttery smooth 120fps hardware acceleration
  const xSetter = gsap.quickSetter(cursor, "x", "px");
  const ySetter = gsap.quickSetter(cursor, "y", "px");

  window.addEventListener('mousemove', (e) => {
    xSetter(e.clientX);
    ySetter(e.clientY);
    
    // Debounce/Throttle the elementFromPoint check slightly for performance
    if (e.clientX % 2 === 0) {
        const hoveredEl = document.elementFromPoint(e.clientX, e.clientY);
        if (hoveredEl && (
          hoveredEl.tagName === 'BUTTON' || 
          hoveredEl.tagName === 'A' || 
          hoveredEl.tagName === 'SELECT' ||
          hoveredEl.closest('button') ||
          (hoveredEl.id === 'mosaic-canvas' && hoveredBlock !== null)
        )) {
          cursor.classList.add('hovering');
        } else {
          cursor.classList.remove('hovering');
        }
    }
  });
  
  document.addEventListener('mouseleave', () => gsap.to(cursor, {opacity: 0, duration: 0.2}));
  document.addEventListener('mouseenter', () => gsap.to(cursor, {opacity: 1, duration: 0.2}));
}"""

if old_cursor in js:
    js = js.replace(old_cursor, new_cursor)
else:
    print("WARNING: Could not find old_cursor to replace!")


# 3. Add GSAP breathing animation to weather line to replace CSS @keyframes
old_stats = "gsap.fromTo(weatherLine, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });"
new_stats = """// Replaced heavy CSS drop-shadow keyframes with buttery GSAP hardware acceleration
      gsap.fromTo(weatherLine, { opacity: 0, y: 14 }, { 
        opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
        onComplete: () => {
          gsap.to(weatherLine, {
            y: -3,
            duration: 4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        }
      });"""

# Because of previous rewrites, that exact gsap line might not be in updateStats anymore.
# Let's check where to inject the breathing animation.
# In `fix_live_ticker_regex.py`, we injected `weatherLine.setAttribute('data-initialized', 'true');`
# Let's attach the GSAP breather there!

gsap_breather_inject = """      weatherLine.setAttribute('data-initialized', 'true');
      
      // Inject hardware-accelerated breathing animation
      if (typeof gsap !== 'undefined') {
        gsap.to(weatherLine, {
          y: -4,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true
        });
      }"""
js = js.replace("      weatherLine.setAttribute('data-initialized', 'true');", gsap_breather_inject)


with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("JS optimizations applied.")
