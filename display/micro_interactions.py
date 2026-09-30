with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Custom CSS for Film Grain, Magnetic Buttons, and Spring Tooltip
css_upgrades = """

/* ============================================================
   MICRO-INTERACTION & PREMIUM UI UPGRADES
   ============================================================ */

/* Cinematic Film Grain Overlay */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background-image: url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E');
  opacity: 0.03;
  mix-blend-mode: overlay;
}

/* Base button setup for magnetic effect */
.app-header button {
  will-change: transform;
  position: relative;
  overflow: hidden;
}

/* Smooth tooltips */
#hover-tooltip {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  /* Remove GSAP conflict transitions */
  transition: opacity 0.3s ease, visibility 0.3s ease;
  transform-origin: top left;
  border-radius: 12px !important;
  border: 1px solid rgba(255,255,255,0.15) !important;
  background: rgba(12, 14, 18, 0.75) !important;
  backdrop-filter: blur(24px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(150%) !important;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1) !important;
  padding: 16px !important;
}

/* Hover state overrides */
#hover-tooltip.visible {
  opacity: 1 !important;
  visibility: visible !important;
}

/* Better Details Sidebar / Archive Drawer Glass */
.details-sidebar, .archive-drawer {
  background: rgba(12, 14, 18, 0.85) !important;
  backdrop-filter: blur(30px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
  border-left: 1px solid rgba(255,255,255,0.1) !important;
  box-shadow: -20px 0 60px rgba(0,0,0,0.5) !important;
}

"""

css += css_upgrades

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

# 2. Modify JS for Magnetic Buttons, Tooltip GSAP, and Block Flash
with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Update Tooltip Logic
old_tooltip_pos = """  hoverTooltip.style.left = `${e.pageX}px`;
  hoverTooltip.style.top = `${e.pageY}px`;"""

new_tooltip_pos = """  // GSAP Spring Tooltip Interpolation
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
  }"""

js = js.replace(old_tooltip_pos, new_tooltip_pos)

# Add Magnetic Buttons
magnetic_code = """
// ----------------------------------------------------
// MICRO-INTERACTION: Magnetic Buttons
// ----------------------------------------------------
function initMagneticButtons() {
  const buttons = document.querySelectorAll('header button, #archive-toggle-btn, #theme-toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      // Calculate cursor position relative to button center
      const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
      
      if (typeof gsap !== 'undefined') {
        gsap.to(btn, { x: x, y: y, duration: 0.3, ease: 'power2.out' });
      } else {
        btn.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (typeof gsap !== 'undefined') {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
      } else {
        btn.style.transform = `translate(0px, 0px)`;
      }
    });
  });
}

// Ensure it runs after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMagneticButtons);
} else {
  initMagneticButtons();
}
"""
js += "\n" + magnetic_code

# Add flash logic to incoming blocks in drawTile
# We'll check if block.timestamp > Date.now()/1000 - 2 (it arrived in the last 2 seconds)
old_fill = """    } else {
      if (isDimmed) {"""

new_fill = """    } else {
      // Micro-interaction: Flash bright white on newly minted blocks (last 2 seconds)
      let flashOverlay = 0;
      if (currentMode === 'LIVE' && block._liveMintedTime) {
        const age = Date.now() - block._liveMintedTime;
        if (age < 800) {
          flashOverlay = 1.0 - (age / 800); // Fades out over 800ms
        }
      }

      if (isDimmed) {"""
js = js.replace(old_fill, new_fill)

old_draw_inner = """          ctx.shadowBlur = 24; // Bigger, softer cinematic glow
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          // Added a bright core to the pixel without a hard outline
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(x + cell.col * subSize + 1.5, y + cell.row * subSize + 1.5, subSize - 3, subSize - 3);
        } else {
          ctx.shadowBlur = 2;
          ctx.shadowColor = baseColor;
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
        }"""

new_draw_inner = """          ctx.shadowBlur = 24; // Bigger, softer cinematic glow
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          // Added a bright core to the pixel without a hard outline
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(x + cell.col * subSize + 1.5, y + cell.row * subSize + 1.5, subSize - 3, subSize - 3);
        } else {
          ctx.shadowBlur = flashOverlay > 0 ? 10 * flashOverlay : 2;
          ctx.shadowColor = flashOverlay > 0 ? '#ffffff' : baseColor;
          ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          
          if (flashOverlay > 0) {
             ctx.fillStyle = `rgba(255, 255, 255, ${flashOverlay * 0.8})`;
             ctx.fillRect(x + cell.col * subSize + 0.5, y + cell.row * subSize + 0.5, subSize - 1, subSize - 1);
          }
        }"""
js = js.replace(old_draw_inner, new_draw_inner)

# We need to tag new blocks with _liveMintedTime when they are pushed
old_push = """blocks.push(newBlock); if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);"""
new_push = """newBlock._liveMintedTime = Date.now();
              blocks.push(newBlock); if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);"""
js = js.replace(old_push, new_push)


with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Micro-interactions upgraded.")
