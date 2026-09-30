const fs = require('fs');
let html = fs.readFileSync('mosaic.html', 'utf8');

const oldControls = `<div id="playback-controls" class="playback-controls">
      <button id="playback-play-btn" class="playback-btn">Play</button>
      <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history">
      <span id="playback-counter" class="playback-counter">0 / 0 Blocks</span>
    </div>`;
    
const newControls = `<div id="playback-controls" class="playback-controls">
      <button id="playback-play-btn" class="playback-btn">Play</button>
      <input type="range" id="playback-slider" class="playback-slider" min="0" max="100" value="0" aria-label="Scrub history">
      <span id="playback-counter" class="playback-counter">0 / 0 Blocks</span>
      <button id="generate-portrait-btn" class="playback-btn" style="margin-left: 12px; background: rgba(0, 255, 136, 0.15); border-color: #00ff88;">View Portrait</button>
    </div>`;

html = html.replace(oldControls, newControls);
fs.writeFileSync('mosaic.html', html);
console.log("HTML Playback Controls Fixed");
