const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const target = `async function loadHistoricalPortrait(dateStr, dayNum) {
  // HIJACKED FOR ART SYNTHESIS
  triggerArtisticSynthesis(dayNum);
  return;`;
  
const original = `async function loadHistoricalPortrait(dateStr, dayNum) {
  lastInteractionTime = Date.now();
  archiveDrawer.classList.remove('open');
  pausePlayback();`;

js = js.replace(target, original);
fs.writeFileSync('mosaic.js', js);
console.log("Unhijacked loadHistoricalPortrait");
