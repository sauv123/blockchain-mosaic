const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const initUITarget = "function initUI() {";
const audioHook = `
  const audioBtn = document.getElementById('audio-toggle-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      audio.init();
      audioBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -1px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Audio Live';
      audioBtn.style.color = '#00ff88';
      audioBtn.style.borderColor = 'rgba(0,255,136,0.3)';
      audioBtn.style.background = 'rgba(0,255,136,0.05)';
    });
  }
`;

js = js.replace(initUITarget, initUITarget + '\n' + audioHook);
fs.writeFileSync('mosaic.js', js);
console.log("Audio hook injected.");
