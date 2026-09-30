const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const target = "async function loadHistoricalPortrait(dateStr, dayNum) {";
const hijack = `async function loadHistoricalPortrait(dateStr, dayNum) {
  // HIJACKED FOR ART SYNTHESIS
  triggerArtisticSynthesis(dayNum);
  return;
`;

js = js.replace(target, hijack);
fs.writeFileSync('mosaic.js', js);
console.log("Historical portrait hijacked.");
