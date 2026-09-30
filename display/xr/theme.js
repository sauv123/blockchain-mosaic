// ============================================================================
// /trace XR — DESIGN TOKENS
//
// A direct mirror of style.css. Every value here is lifted from the website's
// CSS custom properties and component rules, so a panel drawn with these reads
// as the same product rather than a lookalike.
//
// The earlier XR build invented its own neon-green scheme (#00ff88). The site
// is actually blue (#3b6fd4) on a warm near-black (#14140f) — which is why the
// panels looked nothing like the web UI.
// ============================================================================

import { state, PALETTES } from './core.js';

// --- :root (light / warmGray) and body.charcoal-theme ----------------------
const THEME_VARS = {
  warmGray: {
    bgColor:      '#c8c6c0',
    panelBg:      'rgba(235, 234, 230, 0.85)',
    drawerBg:     'rgba(238, 237, 233, 0.92)',
    borderColor:  'rgba(0, 0, 0, 0.08)',
    textPrimary:  '#1e1e1a',
    textSecondary:'#5e5e5a',
    accentColor:  '#3b6fd4',
    whaleAccent:  '#ffffff',
    successColor: '#3b6fd4',
    trackedColor: '#00b0ff',
    tileBg:       '#f2f2f7',
    cellBg:       'rgba(0, 0, 0, 0.02)',
    shadow:       'rgba(0, 0, 0, 0.18)'
  },
  charcoal: {
    bgColor:      '#14140f',
    panelBg:      'rgba(30, 30, 25, 0.85)',
    // .archive-drawer overrides the panel background with a cooler glass
    drawerBg:     'rgba(12, 14, 18, 0.92)',
    borderColor:  'rgba(255, 255, 255, 0.08)',
    textPrimary:  '#e2e2da',
    textSecondary:'#8c8c85',
    accentColor:  '#3b6fd4',
    whaleAccent:  '#ffffff',
    successColor: '#3b6fd4',
    trackedColor: '#00e5ff',
    tileBg:       '#1e1e19',
    cellBg:       'rgba(0, 0, 0, 0.02)',
    shadow:       'rgba(0, 0, 0, 0.5)'
  }
};

export const FONT_SANS = "'Outfit', system-ui, sans-serif";
export const FONT_MONO = "'Space Mono', ui-monospace, monospace";

/**
 * Canvas pixels per CSS rem. The website's 1rem is 16px on a screen you sit
 * half a metre from; in a headset the surface is bigger and further, so the
 * ratio is retuned while every *relative* size (0.72rem, 0.8rem, 1.25rem…)
 * stays exactly as the stylesheet declares it.
 */
export const REM = 40;

/** Converts a CSS rem value from style.css into canvas pixels. */
export const rem = (v) => Math.round(v * REM);

/** The live token set for whatever theme is selected. */
export function css() {
  return THEME_VARS[state.theme] || THEME_VARS.charcoal;
}

/** The active transaction-type palette, so panels tint with the mosaic. */
export function palette() {
  return PALETTES[state.palette] || PALETTES.spectrum;
}

/**
 * The palette's signature colour. The website's chrome accent is fixed blue,
 * but the user asked for panels that follow the palette, so interactive
 * accents track the palette's primary while structural colours stay on-theme.
 */
export function paletteAccent() {
  return palette()['Plain Transfer'] || css().accentColor;
}

/** rgba() helper for the component rules that hard-code alpha. */
export function rgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Component metrics, straight from style.css
// ---------------------------------------------------------------------------
export const S = {
  // .drawer-header h2 { font-size: 1.25rem; font-weight: 700; letter-spacing: .02em }
  drawerTitle:   { size: rem(1.25), weight: 700, ls: 0.02 },
  // .calendar-container h3 { .82rem; 700; uppercase; ls .05em; --text-secondary }
  sectionTitle:  { size: rem(0.82), weight: 700, ls: 0.05, upper: true },
  // .setting-item label { .72rem; 600; --text-secondary }
  settingLabel:  { size: rem(0.72), weight: 600 },
  // .chain-select { .72rem; 500; padding 7px 12px; radius 6px; 1px border }
  select:        { size: rem(0.72), weight: 500, padH: 12, padV: 7, radius: 6 },
  // .stat-item .label { .6rem; ls .12em } / .value { mono .9rem; 600 }
  statLabel:     { size: rem(0.6), ls: 0.12 },
  statValue:     { size: rem(0.9), weight: 600, mono: true },
  // .stat-item { bg rgba(0,0,0,.02); 1px border; padding 6px 10px; radius 6px }
  statItem:      { padH: 10, padV: 6, radius: 6 },
  // .detail-cell .label { .65rem; ls .05em } / .value { .82rem; 600 }
  detailLabel:   { size: rem(0.65), ls: 0.05 },
  detailValue:   { size: rem(0.82), weight: 600 },
  // .tab-btn { .8rem; 500 } / .tab-btn.active { accent; 600 }
  tab:           { size: rem(0.8), weight: 500, activeWeight: 600 },
  // .playback-btn { bg --text-primary; color --bg-color; radius 20px; .72rem; 600 }
  button:        { size: rem(0.72), weight: 600, radius: 20, padH: 16, padV: 6 },
  // .calendar-day { radius 6px; .8rem; 500; 1px border }
  calendarDay:   { size: rem(0.8), weight: 500, radius: 6 },
  // .calendar-grid { gap 6px }
  calendarGap:   6,
  // .mood-badge { .7rem; 600; uppercase; ls .05em; pad 4px 10px; radius 20px }
  moodBadge:     { size: rem(0.7), weight: 600, ls: 0.05, padH: 10, padV: 4, radius: 20 },
  // .brand h1 { 1.4rem; 700; ls .35em }
  brand:         { size: rem(1.4), weight: 700, ls: 0.35 },
  // .sidebar-header { padding 24 24 16 24 }
  sidebarPad:    24
};

/**
 * Applies a style entry to a canvas context and returns the colour it expects,
 * so a call site reads like the CSS rule it came from.
 */
export function applyFont(ctx, style, { mono = false } = {}) {
  const family = mono || style.mono ? FONT_MONO : FONT_SANS;
  ctx.font = `${style.weight || 400} ${style.size}px ${family}`;
  ctx.letterSpacing = style.ls ? `${(style.ls * style.size).toFixed(2)}px` : '0px';
  return ctx;
}
