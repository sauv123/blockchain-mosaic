import sys

with open('style.css', 'r') as f:
    css = f.read()

css += """
/* Fix Playback Controls z-index */
.playback-controls {
  bottom: 120px !important;
  z-index: 10000 !important;
}

/* Hide Cinematic line when in focus mode */
body:has(.sidebar-open) #cinematic-weather-line {
  opacity: 0 !important;
  visibility: hidden !important;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
#cinematic-weather-line {
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

/* Glamorous but Flat Hover Tooltip */
#hover-tooltip {
  background: rgba(10, 12, 16, 0.85) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
  border-radius: 8px !important;
  padding: 14px 18px !important;
  color: #fff !important;
  font-family: 'Space Mono', monospace !important;
  transform: translateY(4px);
  transition: transform 0.1s ease-out;
}
#hover-tooltip::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent);
}

/* Consistent Dropdown UI */
select, .dropdown-select {
  appearance: none;
  background: rgba(255,255,255,0.03) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  color: var(--text-primary) !important;
  padding: 8px 32px 8px 12px !important;
  border-radius: 6px !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 13px !important;
  font-weight: 300 !important;
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='rgba(255,255,255,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 12px center !important;
  background-size: 10px 6px !important;
}
select:hover {
  background-color: rgba(255,255,255,0.06) !important;
  border-color: rgba(255,255,255,0.2) !important;
}
select:focus {
  outline: none;
  border-color: #00ff88 !important;
  box-shadow: 0 0 0 2px rgba(0,255,136,0.15) !important;
}

body.light-theme select, body.light-theme .dropdown-select {
  background-color: rgba(0,0,0,0.03) !important;
  border-color: rgba(0,0,0,0.1) !important;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='rgba(0,0,0,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
}
body.light-theme select:hover {
  background-color: rgba(0,0,0,0.06) !important;
}
"""

with open('style.css', 'w') as f:
    f.write(css)
print("CSS injected.")
