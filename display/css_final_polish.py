with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

css += """

/* ================================================================
   MASTER POLISH — removes lag, adds GPU acceleration, premium feel
   ================================================================ */

/* Force GPU layers on animated elements */
#hover-tooltip,
.details-sidebar,
.archive-drawer,
#cinematic-weather-line,
.playback-controls,
#art-synthesis-overlay,
.legend-item,
.stat-item {
  will-change: transform, opacity;
  transform: translateZ(0);
}

/* Tooltip — clean, minimal, no heavy blur */
#hover-tooltip {
  position: absolute;
  background: rgba(10, 12, 16, 0.92) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 10px !important;
  box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04) !important;
  padding: 14px 18px !important;
  min-width: 180px;
  opacity: 0;
  transform: translateY(6px);
  transition: none; /* let GSAP handle this */
}
#hover-tooltip::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%);
  pointer-events: none;
}

/* Cinematic weather line */
#cinematic-weather-line {
  pointer-events: none;
  text-align: center;
  color: var(--text-primary);
  mix-blend-mode: normal;
  filter: drop-shadow(0 4px 24px rgba(0,0,0,0.4));
}

/* Details sidebar — smooth, no jank */
.details-sidebar {
  transition: none !important; /* GSAP handles */
}

/* Archive drawer */
.archive-drawer {
  transition: none !important;
}

/* Playback controls — fully above footer always */
.playback-controls {
  z-index: 10000 !important;
  bottom: 88px !important;
  border-radius: 40px !important;
}

/* ART synthesis overlay */
#art-synthesis-overlay {
  opacity: 0;
}

/* Settings dropdowns — beautiful, consistent */
select {
  appearance: none !important;
  -webkit-appearance: none !important;
  background: rgba(255,255,255,0.04) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  color: var(--text-primary) !important;
  padding: 9px 34px 9px 14px !important;
  border-radius: 8px !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 13px !important;
  font-weight: 300 !important;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 12px center !important;
  background-size: 10px 6px !important;
}
select:hover { background-color: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.22) !important; }
select:focus { outline: none !important; border-color: #00ff88 !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.18) !important; }

body.light-theme select {
  background: rgba(0,0,0,0.03) !important;
  border-color: rgba(0,0,0,0.1) !important;
  color: #222 !important;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(0,0,0,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
}
body.light-theme select:hover { background-color: rgba(0,0,0,0.06) !important; }

/* Archive month summary pills */
.month-stat-pill {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.month-stat-pill .pill-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.55;
  font-family: 'Space Mono', monospace;
}
.month-stat-pill .pill-value {
  font-size: 15px;
  font-weight: 600;
  font-family: 'Space Mono', monospace;
  color: var(--text-primary);
}
.month-stat-pill .pill-sub {
  font-size: 12px;
  font-weight: 300;
  opacity: 0.6;
}

/* Canvas — prevent subpixel lag */
#mosaic-canvas {
  image-rendering: pixelated;
  display: block;
}

/* Legend items — clickable feel */
.legend-item {
  cursor: pointer;
  transition: opacity 0.25s ease;
  border-radius: 4px;
  padding: 2px 4px;
}
.legend-item:hover {
  opacity: 0.7 !important;
}

/* Remove Toggle Charcoal Theme button — it's vestigial junk */
.toggle-theme-btn, button[onclick*="toggle"] {
  display: none !important;
}
"""

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS polish done.")
