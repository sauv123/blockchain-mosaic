const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

// 1. Hook up the generate portrait button
const initHook = `  const genPortraitBtn = document.getElementById('generate-portrait-btn');
  if (genPortraitBtn) {
    genPortraitBtn.addEventListener('click', () => {
      triggerArtisticSynthesis(historicalDayNumber, playbackFullList);
    });
  }`;
const initUITarget = "const playbackPlayBtn = document.getElementById('playback-play-btn');";
js = js.replace(initUITarget, initUITarget + '\n' + initHook);

// 2. Rewrite triggerArtisticSynthesis
const oldArt = /function triggerArtisticSynthesis[\s\S]*?function/g;

// We will manually replace triggerArtisticSynthesis to end of file, or just use precise string replace
